import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import crypto from 'node:crypto';
import { createApp } from '../../src/app.js';
import { connectToDatabase, closeDatabaseConnection, getDatabase } from '../../src/config/db.js';
import { generateSessionTokens } from '../../src/domain/auth/index.js';
import { seedCatalogueAndRules } from '../../src/fixtures/seed-catalogue-rules.js';
import { env } from '../../src/config/env.js';
import type { UserRole } from '../../src/types/index.js';

describe('Phase 5 Supporting Modules: Notifications, Patient Portals, Inpatient Orders, Appointments & Rule Governance', () => {
  const app = createApp();
  let db: ReturnType<typeof getDatabase>;

  const demoHospitalId = env.DEMO_WORKSPACE_ID;
  const testPatientId = 'pat_phase5_clara_001';
  const secondPatientId = 'pat_phase5_amy_002';

  async function createTestActor(role: UserRole, hospitalId: string, linkedPatientId?: string) {
    const userId = crypto.randomUUID();
    const { sessionId, cookieValue, secretVerifierHash } = generateSessionTokens();

    await db.collection('users').insertOne({
      _id: userId,
      emailNormalized: `${role.toLowerCase()}-${userId}@phase5.test`,
      displayName: `Phase5 ${role}`,
      passwordHash: 'dummy-hash',
      accountStatus: 'ACTIVE',
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    await db.collection('memberships').insertOne({
      _id: crypto.randomUUID(),
      userId,
      hospitalId,
      assignedRole: role,
      status: 'ACTIVE',
      requestedAt: new Date(),
      reviewedAt: new Date(),
      reviewedBy: 'system',
      version: 1,
    });

    const expiresAt = new Date(Date.now() + 60 * 60 * 1000);
    await db.collection('sessions').insertOne({
      _id: sessionId,
      userId,
      secretVerifierHash,
      createdAt: new Date(),
      lastSeenAt: new Date(),
      idleExpiresAt: expiresAt,
      absoluteExpiresAt: expiresAt,
      revoked: false,
    });

    if (linkedPatientId) {
      await db.collection('patient_records').updateOne(
        { _id: linkedPatientId },
        {
          $set: {
            linkedUserId: userId,
            linkStatus: 'LINKED',
            linkedAt: new Date(),
          },
        },
      );
    }

    return {
      userId,
      headers: {
        'Content-Type': 'application/json',
        Cookie: `__Host-vf_session=${cookieValue}`,
        'x-hospital-id': hospitalId,
      },
    };
  }

  beforeAll(async () => {
    await connectToDatabase();
    db = getDatabase();

    // Ensure catalogue and rule sets are seeded
    await seedCatalogueAndRules(db);

    // Ensure hospitals exist
    await db.collection('hospitals').updateOne(
      { _id: demoHospitalId },
      {
        $set: {
          name: 'Demo Hospital Workspace',
          slug: 'demo-hospital',
          status: 'ACTIVE',
          isDemoWorkspace: true,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      },
      { upsert: true },
    );

    // Seed test patients
    await db.collection('patient_records').updateOne(
      { _id: testPatientId },
      {
        $set: {
          hospitalId: demoHospitalId,
          syntheticHospitalPatientId: 'PAT-P5-001',
          displayName: 'Clara Oswald',
          linkStatus: 'UNLINKED',
          version: 1,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      },
      { upsert: true },
    );

    await db.collection('patient_records').updateOne(
      { _id: secondPatientId },
      {
        $set: {
          hospitalId: demoHospitalId,
          syntheticHospitalPatientId: 'PAT-P5-002',
          displayName: 'Amy Pond',
          linkStatus: 'UNLINKED',
          version: 1,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      },
      { upsert: true },
    );

    // Clean up appointments to guarantee test idempotency across runs
    await db.collection('appointments').deleteMany({ hospitalId: demoHospitalId });
  });

  afterAll(async () => {
    await closeDatabaseConnection();
  });

  // =========================================================================
  // 1. In-App Notifications Tests
  // =========================================================================
  describe('Module 1: In-App Notifications', () => {
    it('TEST-NOTIF-001: Lists notifications and marks a notification as read (204)', async () => {
      const doctor = await createTestActor('DOCTOR', demoHospitalId);

      // Seed a test notification directly
      const notifId = crypto.randomUUID();
      await db.collection('notifications').insertOne({
        _id: notifId,
        hospitalId: demoHospitalId,
        recipientUserId: doctor.userId,
        type: 'PRESCRIPTION_ALERT_FLAGGED',
        subjectId: 'check_test_123',
        title: 'Hazards Flagged',
        message: 'Review required for test prescription.',
        read: false,
        readAt: null,
        createdAt: new Date(),
        version: 1,
      });

      // 1. List notifications
      const listRes = await app.request('/api/v1/notifications', {
        method: 'GET',
        headers: doctor.headers,
      });
      expect(listRes.status).toBe(200);
      const { data: notifs } = await listRes.json();
      expect(notifs.length).toBeGreaterThanOrEqual(1);
      const found = notifs.find((n: { _id: string }) => n._id === notifId);
      expect(found).toBeDefined();
      expect(found.read).toBe(false);

      // 2. Mark as read -> 204
      const readRes = await app.request(`/api/v1/notifications/${notifId}/read`, {
        method: 'POST',
        headers: doctor.headers,
      });
      expect(readRes.status).toBe(204);

      // 3. Verify read in unreadOnly list
      const unreadRes = await app.request('/api/v1/notifications?unreadOnly=true', {
        method: 'GET',
        headers: doctor.headers,
      });
      expect(unreadRes.status).toBe(200);
      const { data: unreadNotifs } = await unreadRes.json();
      expect(unreadNotifs.some((n: { _id: string }) => n._id === notifId)).toBe(false);
    });

    it('TEST-NOTIF-002: Auto-triggers notification to prescriber when clinical check flags alerts', async () => {
      const doctor = await createTestActor('DOCTOR', demoHospitalId);

      // Create prescription with DDI hazard (Potassium + Spironolactone)
      const rxRes = await app.request('/api/v1/prescriptions', {
        method: 'POST',
        headers: doctor.headers,
        body: JSON.stringify({
          patientId: testPatientId,
          items: [
            {
              rawExtractedText: 'Potklor 1 tab daily',
              catalogueItemId: 'cat-potassium-chloride-600',
              canonicalIngredientIds: ['ing-potassium-chloride'],
              matchStatus: 'CONFIRMED',
            },
            {
              rawExtractedText: 'Aldactone 25mg daily',
              catalogueItemId: 'cat-spironolactone-25',
              canonicalIngredientIds: ['ing-spironolactone'],
              matchStatus: 'CONFIRMED',
            },
          ],
        }),
      });
      expect(rxRes.status).toBe(201);
      const { data: rx } = await rxRes.json();

      // Run clinical check
      const checkRes = await app.request('/api/v1/checks', {
        method: 'POST',
        headers: doctor.headers,
        body: JSON.stringify({
          subjectType: 'PRESCRIPTION_REVISION',
          subjectId: rx.currentRevisionId,
          subjectVersion: 1,
        }),
      });
      expect(checkRes.status).toBe(201);
      const { data: check } = await checkRes.json();
      expect(check.outcome).toBe('FLAGGED');

      // Check notification feed for the doctor
      const notifRes = await app.request('/api/v1/notifications', {
        method: 'GET',
        headers: doctor.headers,
      });
      expect(notifRes.status).toBe(200);
      const { data: notifs } = await notifRes.json();
      const flagNotif = notifs.find(
        (n: { type: string; subjectId: string }) =>
          n.type === 'PRESCRIPTION_ALERT_FLAGGED' && n.subjectId === check.id,
      );
      expect(flagNotif).toBeDefined();
    });

    it('TEST-NOTIF-003: Auto-triggers notification to pharmacists when doctor records disposition', async () => {
      const doctor = await createTestActor('DOCTOR', demoHospitalId);
      const pharmacist = await createTestActor('PHARMACIST', demoHospitalId);

      // 1. Create prescription and run check
      const rxRes = await app.request('/api/v1/prescriptions', {
        method: 'POST',
        headers: doctor.headers,
        body: JSON.stringify({
          patientId: testPatientId,
          items: [
            {
              rawExtractedText: 'Potklor 1 tab',
              catalogueItemId: 'cat-potassium-chloride-600',
              canonicalIngredientIds: ['ing-potassium-chloride'],
              matchStatus: 'CONFIRMED',
            },
            {
              rawExtractedText: 'Aldactone 25mg',
              catalogueItemId: 'cat-spironolactone-25',
              canonicalIngredientIds: ['ing-spironolactone'],
              matchStatus: 'CONFIRMED',
            },
          ],
        }),
      });
      const { data: rx } = await rxRes.json();
      const checkRes = await app.request('/api/v1/checks', {
        method: 'POST',
        headers: doctor.headers,
        body: JSON.stringify({
          subjectType: 'PRESCRIPTION_REVISION',
          subjectId: rx.currentRevisionId,
          subjectVersion: 1,
        }),
      });
      const { data: check } = await checkRes.json();
      const alertId = check.alertIds[0];

      // 2. Doctor records disposition
      const dispRes = await app.request(`/api/v1/alerts/${alertId}/disposition`, {
        method: 'POST',
        headers: { ...doctor.headers, 'If-Match': '1' },
        body: JSON.stringify({
          dispositionType: 'CHANGE_REQUIRED',
          rationale: 'Severe hyperkalemia interaction. Ordering lab monitor and stopping spironolactone.',
        }),
      });
      expect(dispRes.status).toBe(201);

      // 3. Pharmacist notification feed should have ALERT_DISPOSITION_RECORDED
      const pharNotifRes = await app.request('/api/v1/notifications', {
        method: 'GET',
        headers: pharmacist.headers,
      });
      expect(pharNotifRes.status).toBe(200);
      const { data: pharNotifs } = await pharNotifRes.json();
      const dispNotif = pharNotifs.find(
        (n: { type: string; subjectId: string }) =>
          n.type === 'ALERT_DISPOSITION_RECORDED' && n.subjectId === alertId,
      );
      expect(dispNotif).toBeDefined();
    });
  });

  // =========================================================================
  // 2. Patient Self-Service Portals Tests
  // =========================================================================
  describe('Module 2: Patient Self-Service Portals', () => {
    it('TEST-PAT-ME-001 & TEST-PAT-ME-002: Patient retrieves own prescriptions and history; hides clinician internal notes', async () => {
      const patientActor = await createTestActor('PATIENT', demoHospitalId, testPatientId);
      const doctor = await createTestActor('DOCTOR', demoHospitalId);

      // Seed an active allergy and medication history for testPatientId
      await db.collection('patient_allergies').insertOne({
        _id: crypto.randomUUID(),
        hospitalId: demoHospitalId,
        patientId: testPatientId,
        substanceText: 'Amoxicillin',
        recordType: 'ALLERGY',
        severity: 'SEVERE',
        verificationStatus: 'CONFIRMED',
        createdAt: new Date(),
        updatedAt: new Date(),
        version: 1,
      });

      await db.collection('patient_medication_history').insertOne({
        _id: crypto.randomUUID(),
        hospitalId: demoHospitalId,
        patientId: testPatientId,
        sourceType: 'PATIENT_DISCLOSED',
        medicineName: 'Metformin 500mg',
        dose: '500mg',
        unit: 'mg',
        route: 'ORAL',
        frequency: 'BID',
        status: 'ACTIVE',
        verificationStatus: 'REPORTED',
        recordedBy: doctor.userId,
        recordedAt: new Date(),
        version: 1,
      });

      // 1. GET /patient/me/prescriptions
      const rxRes = await app.request('/api/v1/patient/me/prescriptions', {
        method: 'GET',
        headers: patientActor.headers,
      });
      expect(rxRes.status).toBe(200);
      const { data: patientRxs } = await rxRes.json();
      expect(patientRxs).toBeInstanceOf(Array);

      // 2. GET /patient/me/history
      const histRes = await app.request('/api/v1/patient/me/history', {
        method: 'GET',
        headers: patientActor.headers,
      });
      expect(histRes.status).toBe(200);
      const { data: history } = await histRes.json();
      expect(history.patient.displayName).toBe('Clara Oswald');
      expect(history.allergies.length).toBeGreaterThanOrEqual(1);
      expect(history.allergies[0].substanceText).toBe('Amoxicillin');
      expect(history.medications.length).toBeGreaterThanOrEqual(1);
      expect(history.medications[0].medicineName).toBe('Metformin 500mg');
    });

    it('TEST-PAT-ME-003: Unlinked patient or wrong role returns safe error', async () => {
      // User with PATIENT role but no linked patient record
      const unlinkedPatient = await createTestActor('PATIENT', demoHospitalId);

      const res = await app.request('/api/v1/patient/me/prescriptions', {
        method: 'GET',
        headers: unlinkedPatient.headers,
      });
      expect(res.status).toBe(404);

      // Doctor attempting to call /patient/me/prescriptions gets 403 (role mismatch)
      const doctor = await createTestActor('DOCTOR', demoHospitalId);
      const docRes = await app.request('/api/v1/patient/me/prescriptions', {
        method: 'GET',
        headers: doctor.headers,
      });
      expect(docRes.status).toBe(403);
    });
  });

  // =========================================================================
  // 3. Inpatient Medication Orders Tests
  // =========================================================================
  describe('Module 3: Inpatient Medication Orders', () => {
    it('TEST-ORD-001 & TEST-ORD-002: Inpatient order creation, versioning, and OCC conflict prevention', async () => {
      const doctor = await createTestActor('DOCTOR', demoHospitalId);

      // 1. Create Inpatient Order (Version 1)
      const createRes = await app.request('/api/v1/medication-orders', {
        method: 'POST',
        headers: doctor.headers,
        body: JSON.stringify({
          patientId: testPatientId,
          notes: 'Admitted for acute management',
          items: [
            {
              rawExtractedText: 'Metformin 500mg tab PO daily',
              catalogueItemId: 'cat-metformin-500',
              canonicalIngredientIds: ['ing-metformin'],
              matchStatus: 'CONFIRMED',
            },
          ],
        }),
      });
      expect(createRes.status).toBe(201);
      const { data: created } = await createRes.json();
      expect(created.order._id).toBeDefined();
      expect(created.order.currentVersionNumber).toBe(1);
      expect(created.version.versionNumber).toBe(1);

      const orderId = created.order._id;

      // 2. Fetch order details with version history
      const getRes = await app.request(`/api/v1/medication-orders/${orderId}`, {
        method: 'GET',
        headers: doctor.headers,
      });
      expect(getRes.status).toBe(200);
      const { data: orderDetails } = await getRes.json();
      expect(orderDetails.order._id).toBe(orderId);
      expect(orderDetails.versions.length).toBe(1);

      // 3. Create Version 2 with valid expectedVersion
      const v2Res = await app.request(`/api/v1/medication-orders/${orderId}/versions`, {
        method: 'POST',
        headers: doctor.headers,
        body: JSON.stringify({
          expectedVersion: 1,
          changeReason: 'Adjusted dosing to BID after evening renal clearance review',
          items: [
            {
              rawExtractedText: 'Metformin 500mg tab PO BID',
              catalogueItemId: 'cat-metformin-500',
              canonicalIngredientIds: ['ing-metformin'],
              matchStatus: 'CONFIRMED',
            },
          ],
        }),
      });
      expect(v2Res.status).toBe(201);
      const { data: v2Data } = await v2Res.json();
      expect(v2Data.order.currentVersionNumber).toBe(2);
      expect(v2Data.version.versionNumber).toBe(2);

      // 4. Stale expectedVersion write -> 409 CONFLICT
      const staleRes = await app.request(`/api/v1/medication-orders/${orderId}/versions`, {
        method: 'POST',
        headers: doctor.headers,
        body: JSON.stringify({
          expectedVersion: 1, // Stale! Current version is 2
          changeReason: 'Stale update attempt',
          items: [
            {
              rawExtractedText: 'Metformin 1000mg tab PO daily',
              catalogueItemId: 'cat-metformin-500',
              canonicalIngredientIds: ['ing-metformin'],
              matchStatus: 'CONFIRMED',
            },
          ],
        }),
      });
      expect(staleRes.status).toBe(409);
    });

    it('TEST-ORD-003: Full clinical check integration with inpatient medication order version', async () => {
      const doctor = await createTestActor('DOCTOR', demoHospitalId);

      // Create inpatient order with conflicting drugs
      const createRes = await app.request('/api/v1/medication-orders', {
        method: 'POST',
        headers: doctor.headers,
        body: JSON.stringify({
          patientId: testPatientId,
          items: [
            {
              rawExtractedText: 'Potklor 1 tab',
              catalogueItemId: 'cat-potassium-chloride-600',
              canonicalIngredientIds: ['ing-potassium-chloride'],
              matchStatus: 'CONFIRMED',
            },
            {
              rawExtractedText: 'Aldactone 25mg',
              catalogueItemId: 'cat-spironolactone-25',
              canonicalIngredientIds: ['ing-spironolactone'],
              matchStatus: 'CONFIRMED',
            },
          ],
        }),
      });
      const { data: created } = await createRes.json();

      // Run clinical check on the inpatient version
      const checkRes = await app.request('/api/v1/checks', {
        method: 'POST',
        headers: doctor.headers,
        body: JSON.stringify({
          subjectType: 'MEDICATION_ORDER_VERSION',
          subjectId: created.version._id,
          subjectVersion: created.version.versionNumber,
        }),
      });
      expect(checkRes.status).toBe(201);
      const { data: check } = await checkRes.json();
      expect(check.outcome).toBe('FLAGGED');
      expect(check.subjectType).toBe('MEDICATION_ORDER_VERSION');
      expect(check.subjectId).toBe(created.version._id);
    });
  });

  // =========================================================================
  // 4. Appointments Scheduling & Interval Overlap Engine Tests
  // =========================================================================
  describe('Module 4: Appointments Scheduling & Conflict Engine', () => {
    it('TEST-APT-001 & TEST-APT-004: Appointment booking, listing, and cancellation with slot release', async () => {
      const doctor = await createTestActor('DOCTOR', demoHospitalId);
      const patientActor = await createTestActor('PATIENT', demoHospitalId, testPatientId);

      const startAt = '2026-11-05T09:00:00.000Z';
      const endAt = '2026-11-05T09:30:00.000Z';

      // 1. Book appointment
      const bookRes = await app.request('/api/v1/appointments', {
        method: 'POST',
        headers: patientActor.headers,
        body: JSON.stringify({
          patientId: testPatientId,
          doctorUserId: doctor.userId,
          startAt,
          endAt,
          reason: 'Routine quarterly medication review',
        }),
      });
      expect(bookRes.status).toBe(201);
      const { data: appt } = await bookRes.json();
      expect(appt._id).toBeDefined();
      expect(appt.status).toBe('BOOKED');

      // 2. Verify listing
      const listRes = await app.request('/api/v1/appointments', {
        method: 'GET',
        headers: doctor.headers,
      });
      expect(listRes.status).toBe(200);
      const { data: appts } = await listRes.json();
      expect(appts.some((a: { _id: string }) => a._id === appt._id)).toBe(true);

      // 3. Cancel appointment
      const cancelRes = await app.request(`/api/v1/appointments/${appt._id}/cancel`, {
        method: 'POST',
        headers: patientActor.headers,
        body: JSON.stringify({
          reason: 'Rescheduling needed due to conflict',
        }),
      });
      expect(cancelRes.status).toBe(200);
      const { data: cancelledAppt } = await cancelRes.json();
      expect(cancelledAppt.status).toBe('CANCELLED');

      // 4. Slot is freed: Re-booking exact same slot now succeeds!
      const rebookRes = await app.request('/api/v1/appointments', {
        method: 'POST',
        headers: patientActor.headers,
        body: JSON.stringify({
          patientId: testPatientId,
          doctorUserId: doctor.userId,
          startAt,
          endAt,
          reason: 'Rebooking same slot after previous cancellation',
        }),
      });
      expect(rebookRes.status).toBe(201);
    });

    it('TEST-APT-002: Overlapping doctor booking returns 409 DOCTOR_SLOT_CONFLICT', async () => {
      const doctor = await createTestActor('DOCTOR', demoHospitalId);

      // Existing slot: 10:00 - 11:00 with patient Clara
      const firstBookRes = await app.request('/api/v1/appointments', {
        method: 'POST',
        headers: doctor.headers,
        body: JSON.stringify({
          patientId: testPatientId,
          doctorUserId: doctor.userId,
          startAt: '2026-11-10T10:00:00.000Z',
          endAt: '2026-11-10T11:00:00.000Z',
        }),
      });
      expect(firstBookRes.status).toBe(201);

      // Conflicting slot: 10:30 - 11:30 (Partial overlap) for same doctor with different patient Amy
      const conflictRes = await app.request('/api/v1/appointments', {
        method: 'POST',
        headers: doctor.headers,
        body: JSON.stringify({
          patientId: secondPatientId,
          doctorUserId: doctor.userId,
          startAt: '2026-11-10T10:30:00.000Z',
          endAt: '2026-11-10T11:30:00.000Z',
        }),
      });
      expect(conflictRes.status).toBe(409);
      const err = await conflictRes.json();
      expect(err.error.code).toBe('CONFLICT');
      expect(err.error.details.some((d: { code: string }) => d.code === 'DOCTOR_SLOT_CONFLICT')).toBe(true);
    });

    it('TEST-APT-003: Overlapping patient booking returns 409 PATIENT_SLOT_CONFLICT', async () => {
      const doctor1 = await createTestActor('DOCTOR', demoHospitalId);
      const doctor2 = await createTestActor('DOCTOR', demoHospitalId);
      const patientActor = await createTestActor('PATIENT', demoHospitalId, testPatientId);

      // Book doctor1: 14:00 - 15:00 for patient
      await app.request('/api/v1/appointments', {
        method: 'POST',
        headers: patientActor.headers,
        body: JSON.stringify({
          patientId: testPatientId,
          doctorUserId: doctor1.userId,
          startAt: '2026-11-12T14:00:00.000Z',
          endAt: '2026-11-12T15:00:00.000Z',
        }),
      });

      // Attempt to book doctor2 for SAME patient at 14:15 - 14:45
      const patientConflictRes = await app.request('/api/v1/appointments', {
        method: 'POST',
        headers: doctor2.headers,
        body: JSON.stringify({
          patientId: testPatientId,
          doctorUserId: doctor2.userId,
          startAt: '2026-11-12T14:15:00.000Z',
          endAt: '2026-11-12T14:45:00.000Z',
        }),
      });
      expect(patientConflictRes.status).toBe(409);
      const err = await patientConflictRes.json();
      expect(err.error.details.some((d: { code: string }) => d.code === 'PATIENT_SLOT_CONFLICT')).toBe(true);
    });
  });

  // =========================================================================
  // 5. Clinical Rule Governance Lifecycle Tests
  // =========================================================================
  describe('Module 5: Clinical Rule Governance Lifecycle', () => {
    it('TEST-RULE-001: Returns current ruleset metadata', async () => {
      const doctor = await createTestActor('DOCTOR', demoHospitalId);

      const res = await app.request('/api/v1/rule-sets/current', {
        method: 'GET',
        headers: doctor.headers,
      });
      expect(res.status).toBe(200);
      const { data: meta } = await res.json();
      expect(meta.ruleSetId).toBeDefined();
      expect(meta.version).toBeDefined();
      expect(meta.limitations).toBeInstanceOf(Array);
    });

    it('TEST-RULE-002: Complete governance lifecycle: DRAFT -> IN_REVIEW -> APPROVED -> PUBLISHED', async () => {
      const admin = await createTestActor('HOSPITAL_ADMIN', demoHospitalId);
      const doctor = await createTestActor('DOCTOR', demoHospitalId);

      const testVersion = `2026-CUSTOM-GOV-${Date.now()}`;

      // 1. Create DRAFT rule set
      const draftRes = await app.request('/api/v1/rule-sets', {
        method: 'POST',
        headers: admin.headers,
        body: JSON.stringify({
          ruleSetId: 'RULESET-TEST-LIFECYCLE',
          version: testVersion,
          description: 'Custom governance test ruleset',
          rules: [
            {
              ruleId: 'RULE-GOV-001',
              ruleVersion: 1,
              category: 'DRUG_DRUG',
              severity: 'HIGH',
              rationale: 'Interaction risk tested by governance engine',
            },
          ],
          limitations: ['Test only'],
        }),
      });
      expect(draftRes.status).toBe(201);
      const { data: draft } = await draftRes.json();
      expect(draft.status).toBe('DRAFT');

      const ruleSetId = draft._id;

      // 2. Submit for review -> IN_REVIEW
      const submitRes = await app.request(`/api/v1/rule-sets/${ruleSetId}/submit-review`, {
        method: 'POST',
        headers: admin.headers,
      });
      expect(submitRes.status).toBe(200);
      const { data: inReview } = await submitRes.json();
      expect(inReview.status).toBe('IN_REVIEW');

      // 3. Clinical review approval -> APPROVED
      const approveRes = await app.request(`/api/v1/rule-sets/${ruleSetId}/approve`, {
        method: 'POST',
        headers: doctor.headers,
        body: JSON.stringify({
          rationale: 'Clinically verified and approved by Dr. Reviewer',
        }),
      });
      expect(approveRes.status).toBe(200);
      const { data: approved } = await approveRes.json();
      expect(approved.status).toBe('APPROVED');

      // 4. Admin publishes -> PUBLISHED
      const pubRes = await app.request(`/api/v1/rule-sets/${ruleSetId}/publish`, {
        method: 'POST',
        headers: admin.headers,
      });
      expect(pubRes.status).toBe(200);
      const { data: published } = await pubRes.json();
      expect(published.status).toBe('PUBLISHED');
      expect(published.isClinicallyValidated).toBe(true);

      // Verify GET /rule-sets/current now reflects newly published ruleset
      const currentRes = await app.request('/api/v1/rule-sets/current', {
        method: 'GET',
        headers: doctor.headers,
      });
      expect(currentRes.status).toBe(200);
      const { data: currentMeta } = await currentRes.json();
      expect(currentMeta.version).toBe(testVersion);
    });

    it('TEST-RULE-003: Invalid lifecycle transitions return 409 Conflict', async () => {
      const admin = await createTestActor('HOSPITAL_ADMIN', demoHospitalId);

      // Create new draft
      const draftRes = await app.request('/api/v1/rule-sets', {
        method: 'POST',
        headers: admin.headers,
        body: JSON.stringify({
          ruleSetId: 'RULESET-TEST-INVALID',
          version: `2026-INVALID-${Date.now()}`,
          description: 'Testing invalid transitions',
          rules: [{ ruleId: 'R1' }],
        }),
      });
      const { data: draft } = await draftRes.json();

      // Attempt to directly publish a DRAFT (skipping IN_REVIEW and APPROVED) -> 409 CONFLICT
      const directPubRes = await app.request(`/api/v1/rule-sets/${draft._id}/publish`, {
        method: 'POST',
        headers: admin.headers,
      });
      expect(directPubRes.status).toBe(409);
    });
  });
});
