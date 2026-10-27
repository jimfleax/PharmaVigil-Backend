import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import crypto from 'node:crypto';
import { createApp } from '../../src/app.js';
import { connectToDatabase, closeDatabaseConnection, getDatabase } from '../../src/config/db.js';
import { seedCatalogueAndRules, SYNTHETIC_CATALOGUE_ITEMS } from '../../src/fixtures/seed-catalogue-rules.js';
import { generateSessionTokens } from '../../src/domain/auth/index.js';
import { env } from '../../src/config/env.js';
import type { UserRole } from '../../src/types/index.js';

describe('Deferred Clinical Write APIs (API-ALLERGY-002, API-HIST-002, API-DEMO-002)', () => {
  const app = createApp();
  let db: ReturnType<typeof getDatabase>;

  const demoHospitalId = env.DEMO_WORKSPACE_ID;
  const otherHospitalId = 'hosp_non_demo_tenant_99';

  const patient1Id = 'pat_test_allergy_001';
  const patient2Id = 'pat_test_allergy_002';

  async function createTestActor(role: UserRole, hospitalId: string, linkedPatientId?: string) {
    const userId = crypto.randomUUID();
    const { sessionId, cookieValue, secretVerifierHash } = generateSessionTokens();

    await db.collection('users').insertOne({
      _id: userId,
      emailNormalized: `${role.toLowerCase()}-${userId}@test.local`,
      displayName: `Test ${role}`,
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
            updatedAt: new Date(),
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

    await seedCatalogueAndRules(db);

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

    await db.collection('hospitals').updateOne(
      { _id: otherHospitalId },
      {
        $set: {
          name: 'Non Demo Hospital',
          slug: 'non-demo-hospital',
          status: 'ACTIVE',
          isDemoWorkspace: false,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      },
      { upsert: true },
    );

    await db.collection('patient_allergies').deleteMany({
      hospitalId: demoHospitalId,
      patientId: { $in: [patient1Id, patient2Id] },
    });
    await db.collection('patient_medication_history').deleteMany({
      hospitalId: demoHospitalId,
      patientId: { $in: [patient1Id, patient2Id] },
    });

    const testPatients = [
      {
        _id: patient1Id,
        hospitalId: demoHospitalId,
        syntheticHospitalPatientId: 'PAT-DEF-001',
        displayName: 'Amy Pond',
        linkStatus: 'UNLINKED',
        createdAt: new Date(),
        updatedAt: new Date(),
        version: 1,
      },
      {
        _id: patient2Id,
        hospitalId: demoHospitalId,
        syntheticHospitalPatientId: 'PAT-DEF-002',
        displayName: 'Rory Williams',
        linkStatus: 'UNLINKED',
        createdAt: new Date(),
        updatedAt: new Date(),
        version: 1,
      },
    ];

    for (const p of testPatients) {
      await db.collection('patient_records').updateOne(
        { _id: p._id },
        { $set: p },
        { upsert: true },
      );
    }
  });

  afterAll(async () => {
    await closeDatabaseConnection();
  });

  // --- 1. API-ALLERGY-002 Tests ---
  describe('API-ALLERGY-002: POST /api/v1/patients/:id/allergies', () => {
    it('TEST-INT-ALLERGY-001: Doctor successfully records confirmed allergy with default clinician provenance', async () => {
      const doctor = await createTestActor('DOCTOR', demoHospitalId);

      const res = await app.request(`/api/v1/patients/${patient1Id}/allergies`, {
        method: 'POST',
        headers: doctor.headers,
        body: JSON.stringify({
          substanceText: 'Penicillin G',
          canonicalIngredientId: 'ing-penicillin',
          recordType: 'ALLERGY',
          reactionDescription: 'Severe anaphylactic reaction',
          severity: 'SEVERE',
        }),
      });

      expect(res.status).toBe(201);
      const body = await res.json();
      expect(body._id).toBeDefined();
      expect(body.patientId).toBe(patient1Id);
      expect(body.substanceText).toBe('Penicillin G');
      expect(body.canonicalIngredientId).toBe('ing-penicillin');
      expect(body.recordType).toBe('ALLERGY');
      expect(body.severity).toBe('SEVERE');
      expect(body.sourceType).toBe('CLINICIAN_RECORDED');
      expect(body.verificationStatus).toBe('CONFIRMED');
      expect(body.recordedBy).toBe(doctor.userId);
    });

    it('TEST-INT-ALLERGY-002: Pharmacist successfully records confirmed allergy', async () => {
      const pharmacist = await createTestActor('PHARMACIST', demoHospitalId);

      const res = await app.request(`/api/v1/patients/${patient1Id}/allergies`, {
        method: 'POST',
        headers: pharmacist.headers,
        body: JSON.stringify({
          substanceText: 'Sulfamethoxazole',
          recordType: 'ADVERSE_REACTION',
          reactionDescription: 'Urticaria and facial swelling',
          severity: 'MODERATE',
        }),
      });

      expect(res.status).toBe(201);
      const body = await res.json();
      expect(body.sourceType).toBe('CLINICIAN_RECORDED');
      expect(body.verificationStatus).toBe('CONFIRMED');
      expect(body.recordedBy).toBe(pharmacist.userId);
    });

    it('TEST-INT-ALLERGY-003: Patient records allergy on self; service forcibly normalizes to PATIENT_REPORTED and REPORTED', async () => {
      const patient = await createTestActor('PATIENT', demoHospitalId, patient1Id);

      const res = await app.request(`/api/v1/patients/${patient1Id}/allergies`, {
        method: 'POST',
        headers: patient.headers,
        body: JSON.stringify({
          substanceText: 'Aspirin',
          severity: 'MILD',
          // Malicious / erroneous spoofing attempt by patient
          sourceType: 'CLINICIAN_RECORDED',
          verificationStatus: 'CONFIRMED',
        }),
      });

      expect(res.status).toBe(201);
      const body = await res.json();
      expect(body.substanceText).toBe('Aspirin');
      // Enforced provenance invariants
      expect(body.sourceType).toBe('PATIENT_REPORTED');
      expect(body.verificationStatus).toBe('REPORTED');
      expect(body.recordedBy).toBe(patient.userId);
    });

    it('TEST-INT-ALLERGY-004: Patient attempts to record allergy on unlinked / other patient; returns 403 FORBIDDEN', async () => {
      const patient = await createTestActor('PATIENT', demoHospitalId, patient1Id);

      const res = await app.request(`/api/v1/patients/${patient2Id}/allergies`, {
        method: 'POST',
        headers: patient.headers,
        body: JSON.stringify({
          substanceText: 'Latex',
          severity: 'MILD',
        }),
      });

      expect(res.status).toBe(403);
      const body = await res.json();
      expect(body.error.code).toBe('FORBIDDEN');
      expect(body.error.message).toContain('Patients may only record allergies for their own linked profile');
    });

    it('TEST-INT-ALLERGY-005: Non-existent patient ID returns 404 NOT FOUND', async () => {
      const doctor = await createTestActor('DOCTOR', demoHospitalId);

      const res = await app.request('/api/v1/patients/pat_non_existent_99999/allergies', {
        method: 'POST',
        headers: doctor.headers,
        body: JSON.stringify({
          substanceText: 'Penicillin',
        }),
      });

      expect(res.status).toBe(404);
      const body = await res.json();
      expect(body.error.code).toBe('NOT_FOUND');
    });

    it('TEST-INT-ALLERGY-006: Auto-resolves commercial brand name to canonical ingredient from catalogue', async () => {
      const doctor = await createTestActor('DOCTOR', demoHospitalId);

      const res = await app.request(`/api/v1/patients/${patient1Id}/allergies`, {
        method: 'POST',
        headers: doctor.headers,
        body: JSON.stringify({
          substanceText: 'Amoxil 500mg capsule',
          severity: 'SEVERE',
        }),
      });

      expect(res.status).toBe(201);
      const body = await res.json();
      expect(body.substanceText).toBe('Amoxil 500mg capsule');
      expect(body.canonicalIngredientId).toBe('ing-amoxicillin');
    });

    it('TEST-INT-ALLERGY-007: Unmatched substance safely persists with canonicalIngredientId: undefined', async () => {
      const doctor = await createTestActor('DOCTOR', demoHospitalId);

      const res = await app.request(`/api/v1/patients/${patient1Id}/allergies`, {
        method: 'POST',
        headers: doctor.headers,
        body: JSON.stringify({
          substanceText: 'Peanuts and Tree Nuts',
          severity: 'SEVERE',
        }),
      });

      expect(res.status).toBe(201);
      const body = await res.json();
      expect(body.substanceText).toBe('Peanuts and Tree Nuts');
      expect(body.canonicalIngredientId).toBeUndefined();
    });
  });

  // --- 2. API-HIST-002 Tests ---
  describe('API-HIST-002: POST /api/v1/patients/:id/medication-history', () => {
    it('TEST-INT-HIST-001: Doctor successfully records verified medication history with default clinician provenance', async () => {
      const doctor = await createTestActor('DOCTOR', demoHospitalId);

      const res = await app.request(`/api/v1/patients/${patient1Id}/medication-history`, {
        method: 'POST',
        headers: doctor.headers,
        body: JSON.stringify({
          medicineName: 'Metformin 500mg Oral Tablet',
          canonicalIngredientIds: ['ing-metformin'],
          dose: '500',
          unit: 'mg',
          route: 'ORAL',
          frequency: 'TWICE_DAILY',
          status: 'ACTIVE',
        }),
      });

      expect(res.status).toBe(201);
      const body = await res.json();
      expect(body._id).toBeDefined();
      expect(body.patientId).toBe(patient1Id);
      expect(body.medicineName).toBe('Metformin 500mg Oral Tablet');
      expect(body.canonicalIngredientIds).toEqual(['ing-metformin']);
      expect(body.dose).toBe('500');
      expect(body.status).toBe('ACTIVE');
      expect(body.sourceType).toBe('CLINICIAN_PRESCRIBED');
      expect(body.verificationStatus).toBe('VERIFIED');
      expect(body.recordedBy).toBe(doctor.userId);
    });

    it('TEST-INT-HIST-002: Patient records medication history on self; service forcibly normalizes to PATIENT_REPORTED and REPORTED', async () => {
      const patient = await createTestActor('PATIENT', demoHospitalId, patient1Id);

      const res = await app.request(`/api/v1/patients/${patient1Id}/medication-history`, {
        method: 'POST',
        headers: patient.headers,
        body: JSON.stringify({
          medicineName: 'Over-The-Counter Vitamin D3 1000IU',
          sourceType: 'CLINICIAN_PRESCRIBED',
          verificationStatus: 'VERIFIED',
          status: 'ACTIVE',
        }),
      });

      expect(res.status).toBe(201);
      const body = await res.json();
      expect(body.medicineName).toBe('Over-The-Counter Vitamin D3 1000IU');
      expect(body.sourceType).toBe('PATIENT_REPORTED');
      expect(body.verificationStatus).toBe('REPORTED');
      expect(body.recordedBy).toBe(patient.userId);
    });

    it('TEST-INT-HIST-003: Patient attempts to record medication history on unlinked / other patient; returns 403 FORBIDDEN', async () => {
      const patient = await createTestActor('PATIENT', demoHospitalId, patient1Id);

      const res = await app.request(`/api/v1/patients/${patient2Id}/medication-history`, {
        method: 'POST',
        headers: patient.headers,
        body: JSON.stringify({
          medicineName: 'Vitamin C',
        }),
      });

      expect(res.status).toBe(403);
      const body = await res.json();
      expect(body.error.code).toBe('FORBIDDEN');
      expect(body.error.message).toContain('Patients may only record medication history for their own linked profile');
    });

    it('TEST-INT-HIST-004: Auto-resolves commercial brand name to canonical ingredients and catalogueItemId', async () => {
      const doctor = await createTestActor('DOCTOR', demoHospitalId);

      const res = await app.request(`/api/v1/patients/${patient1Id}/medication-history`, {
        method: 'POST',
        headers: doctor.headers,
        body: JSON.stringify({
          medicineName: 'Aldactone 25mg tablet',
          status: 'ACTIVE',
        }),
      });

      expect(res.status).toBe(201);
      const body = await res.json();
      expect(body.medicineName).toBe('Aldactone 25mg tablet');
      expect(body.canonicalIngredientIds).toEqual(['ing-spironolactone']);
      expect(body.catalogueItemId).toBe('cat-spironolactone-25');
    });
  });

  // --- 3. API-DEMO-002 Tests ---
  describe('API-DEMO-002: POST /api/v1/demo/seed', () => {
    it('TEST-INT-DEMO-001: Hospital Admin calls POST /api/v1/demo/seed on demo workspace; returns 202 and seeds fixtures', async () => {
      const admin = await createTestActor('HOSPITAL_ADMIN', demoHospitalId);

      const res = await app.request('/api/v1/demo/seed', {
        method: 'POST',
        headers: admin.headers,
        body: JSON.stringify({
          confirmation: 'SEED_SYNTHETIC_DEMO',
          workspaceId: demoHospitalId,
        }),
      });

      expect(res.status).toBe(202);
      const body = await res.json();
      expect(body.message).toContain('Synthetic demo fixtures successfully seeded');
      expect(body.workspaceId).toBe(demoHospitalId);
      expect(body.seededAt).toBeDefined();

      // Verify catalogue items present in medication_catalog
      const catCount = await db.collection('medication_catalog').countDocuments();
      expect(catCount).toBeGreaterThanOrEqual(SYNTHETIC_CATALOGUE_ITEMS.length);

      // Verify illustrative rule set present
      const rules = await db.collection('rule_sets').findOne({ ruleSetId: 'RULESET-ILLUSTRATIVE-2026-01' });
      expect(rules).toBeDefined();

      // Verify demo patients seeded
      const donna = await db.collection('patient_records').findOne({ _id: 'pat_rec_donna_001' });
      expect(donna).toBeDefined();
      expect(donna?.displayName).toBe('Donna Noble');

      const rory = await db.collection('patient_records').findOne({ _id: 'pat_rec_rory_002' });
      expect(rory).toBeDefined();
      expect(rory?.displayName).toBe('Rory Williams');
    });

    it('TEST-INT-DEMO-002: Non-admin (Doctor or Patient) calls POST /api/v1/demo/seed; returns 403 FORBIDDEN', async () => {
      const doctor = await createTestActor('DOCTOR', demoHospitalId);

      const res = await app.request('/api/v1/demo/seed', {
        method: 'POST',
        headers: doctor.headers,
        body: JSON.stringify({
          confirmation: 'SEED_SYNTHETIC_DEMO',
          workspaceId: demoHospitalId,
        }),
      });

      expect(res.status).toBe(403);
      const body = await res.json();
      expect(body.error.code).toBe('FORBIDDEN');
    });

    it('TEST-INT-DEMO-003: Invalid confirmation token returns 400 Validation Error', async () => {
      const admin = await createTestActor('HOSPITAL_ADMIN', demoHospitalId);

      const res = await app.request('/api/v1/demo/seed', {
        method: 'POST',
        headers: admin.headers,
        body: JSON.stringify({
          confirmation: 'INVALID_TOKEN',
          workspaceId: demoHospitalId,
        }),
      });

      expect(res.status).toBe(400);
      const body = await res.json();
      expect(body.success).toBe(false);
      expect(body.error).toBeDefined();
    });

    it('TEST-INT-DEMO-004: Admin on non-demo tenant calls POST /api/v1/demo/seed; returns 403 FORBIDDEN', async () => {
      const otherAdmin = await createTestActor('HOSPITAL_ADMIN', otherHospitalId);

      const res = await app.request('/api/v1/demo/seed', {
        method: 'POST',
        headers: otherAdmin.headers,
        body: JSON.stringify({
          confirmation: 'SEED_SYNTHETIC_DEMO',
          workspaceId: otherHospitalId,
        }),
      });

      expect(res.status).toBe(403);
      const body = await res.json();
      expect(body.error.code).toBe('FORBIDDEN');
      expect(body.error.message).toContain('Target is not a designated synthetic demo workspace');
    });

    it('TEST-INT-DEMO-005: Idempotent call with identical Idempotency-Key returns cached 202 response', async () => {
      const admin = await createTestActor('HOSPITAL_ADMIN', demoHospitalId);
      const idempotencyKey = crypto.randomUUID();

      const res1 = await app.request('/api/v1/demo/seed', {
        method: 'POST',
        headers: {
          ...admin.headers,
          'Idempotency-Key': idempotencyKey,
        },
        body: JSON.stringify({
          confirmation: 'SEED_SYNTHETIC_DEMO',
          workspaceId: demoHospitalId,
        }),
      });
      expect(res1.status).toBe(202);
      const body1 = await res1.json();

      const res2 = await app.request('/api/v1/demo/seed', {
        method: 'POST',
        headers: {
          ...admin.headers,
          'Idempotency-Key': idempotencyKey,
        },
        body: JSON.stringify({
          confirmation: 'SEED_SYNTHETIC_DEMO',
          workspaceId: demoHospitalId,
        }),
      });
      expect(res2.status).toBe(202);
      const body2 = await res2.json();
      expect(body2.seededAt).toBe(body1.seededAt);
    });
  });

  // --- 4. Audit Trail Verification ---
  describe('Audit Trail Verification', () => {
    it('TEST-INT-AUDIT-001: Verifies audit events for ALLERGY_RECORDED, MEDICATION_HISTORY_RECORDED, and DEMO_FIXTURES_SEEDED', async () => {
      const allergyAudit = await db.collection('audit_events').find({
        hospitalId: demoHospitalId,
        action: 'ALLERGY_RECORDED',
      }).toArray();
      expect(allergyAudit.length).toBeGreaterThan(0);
      expect(allergyAudit[0]?.resourceType).toBe('PatientRecord');

      const histAudit = await db.collection('audit_events').find({
        hospitalId: demoHospitalId,
        action: 'MEDICATION_HISTORY_RECORDED',
      }).toArray();
      expect(histAudit.length).toBeGreaterThan(0);
      expect(histAudit[0]?.resourceType).toBe('PatientRecord');

      const demoAudit = await db.collection('audit_events').find({
        hospitalId: demoHospitalId,
        action: 'DEMO_FIXTURES_SEEDED',
      }).toArray();
      expect(demoAudit.length).toBeGreaterThan(0);
      expect(demoAudit[0]?.resourceType).toBe('DemoWorkspace');
    });
  });

  // --- 5. Closed-Loop Clinical Check Alert Verification ---
  describe('Closed-Loop Clinical Safety Check Verification', () => {
    it('TEST-CLOSED-LOOP-001: Adding Amoxil allergy causes check run on Augmentin Rx to trigger ILLUSTRATIVE-ALLERGY-001 (CRITICAL)', async () => {
      const doctor = await createTestActor('DOCTOR', demoHospitalId);

      const closedAllergyPatientId = `pat_closed_alg_${crypto.randomUUID()}`;
      await db.collection('patient_records').insertOne({
        _id: closedAllergyPatientId,
        hospitalId: demoHospitalId,
        syntheticHospitalPatientId: `PAT-CL-${crypto.randomUUID().slice(0, 6)}`,
        displayName: 'Martha Jones',
        linkStatus: 'UNLINKED',
        createdAt: new Date(),
        updatedAt: new Date(),
        version: 1,
      });

      // Step 1: Create Prescription with Augmentin 625mg for patient without penicillin allergy
      const rxRes = await app.request('/api/v1/prescriptions', {
        method: 'POST',
        headers: doctor.headers,
        body: JSON.stringify({
          patientId: closedAllergyPatientId,
          items: [
            {
              rawExtractedText: 'Augmentin 625mg tablet',
              matchStatus: 'CONFIRMED',
              canonicalIngredientIds: ['ing-amoxicillin', 'ing-clavulanic-acid'],
            },
          ],
        }),
      });
      expect(rxRes.status).toBe(201);
      const { data: rx } = await rxRes.json();
      expect(rx.currentRevisionId).toBeDefined();

      // Step 2: Initial Check Run -> Clean of allergy alert
      const check1Res = await app.request('/api/v1/checks', {
        method: 'POST',
        headers: doctor.headers,
        body: JSON.stringify({
          subjectType: 'PRESCRIPTION_REVISION',
          subjectId: rx.currentRevisionId,
          subjectVersion: 1,
        }),
      });
      expect(check1Res.status).toBe(201);
      const { data: check1 } = await check1Res.json();
      const allergyAlert1 = check1.alerts.find(
        (a: { ruleId: string }) => a.ruleId === 'ILLUSTRATIVE-ALLERGY-001',
      );
      expect(allergyAlert1).toBeUndefined();

      // Step 3: Record allergy via deferred write API with brand name "Amoxil 500mg capsule"
      const addAllergyRes = await app.request(`/api/v1/patients/${closedAllergyPatientId}/allergies`, {
        method: 'POST',
        headers: doctor.headers,
        body: JSON.stringify({
          substanceText: 'Amoxil 500mg capsule',
          severity: 'SEVERE',
        }),
      });
      expect(addAllergyRes.status).toBe(201);
      const recordedAllergy = await addAllergyRes.json();
      expect(recordedAllergy.canonicalIngredientId).toBe('ing-amoxicillin');

      // Step 4: Re-run clinical check -> Must deterministically flag ILLUSTRATIVE-ALLERGY-001!
      const check2Res = await app.request('/api/v1/checks', {
        method: 'POST',
        headers: doctor.headers,
        body: JSON.stringify({
          subjectType: 'PRESCRIPTION_REVISION',
          subjectId: rx.currentRevisionId,
          subjectVersion: 1,
        }),
      });
      expect(check2Res.status).toBe(201);
      const { data: check2 } = await check2Res.json();
      expect(check2.outcome).toBe('FLAGGED');
      const allergyAlert2 = check2.alerts.find(
        (a: { ruleId: string }) => a.ruleId === 'ILLUSTRATIVE-ALLERGY-001',
      );
      expect(allergyAlert2).toBeDefined();
      expect(allergyAlert2.severity).toBe('CRITICAL');
      expect(allergyAlert2.rationale).toContain('Amoxicillin is an aminopenicillin beta-lactam antibiotic');
    });

    it('TEST-CLOSED-LOOP-002: Adding Aldactone history causes check run on KCl Rx to trigger ILLUSTRATIVE-DDI-001 (CRITICAL)', async () => {
      const doctor = await createTestActor('DOCTOR', demoHospitalId);

      const closedDdiPatientId = `pat_closed_ddi_${crypto.randomUUID()}`;
      await db.collection('patient_records').insertOne({
        _id: closedDdiPatientId,
        hospitalId: demoHospitalId,
        syntheticHospitalPatientId: `PAT-CL-${crypto.randomUUID().slice(0, 6)}`,
        displayName: 'Jack Harkness',
        linkStatus: 'UNLINKED',
        createdAt: new Date(),
        updatedAt: new Date(),
        version: 1,
      });

      // Step 1: Create Prescription with Potassium Chloride 600mg for patient with empty med history
      const rxRes = await app.request('/api/v1/prescriptions', {
        method: 'POST',
        headers: doctor.headers,
        body: JSON.stringify({
          patientId: closedDdiPatientId,
          items: [
            {
              rawExtractedText: 'Potassium Chloride 600mg tablet',
              matchStatus: 'CONFIRMED',
              canonicalIngredientIds: ['ing-potassium-chloride'],
            },
          ],
        }),
      });
      expect(rxRes.status).toBe(201);
      const { data: rx } = await rxRes.json();
      expect(rx.currentRevisionId).toBeDefined();

      // Step 2: Initial Check Run -> Clean of DDI alert
      const check1Res = await app.request('/api/v1/checks', {
        method: 'POST',
        headers: doctor.headers,
        body: JSON.stringify({
          subjectType: 'PRESCRIPTION_REVISION',
          subjectId: rx.currentRevisionId,
          subjectVersion: 1,
        }),
      });
      expect(check1Res.status).toBe(201);
      const { data: check1 } = await check1Res.json();
      const ddiAlert1 = check1.alerts.find(
        (a: { ruleId: string }) => a.ruleId === 'ILLUSTRATIVE-DDI-001',
      );
      expect(ddiAlert1).toBeUndefined();

      // Step 3: Record active medication history via deferred write API with brand name "Aldactone 25mg tablet"
      const addHistRes = await app.request(`/api/v1/patients/${closedDdiPatientId}/medication-history`, {
        method: 'POST',
        headers: doctor.headers,
        body: JSON.stringify({
          medicineName: 'Aldactone 25mg tablet',
          status: 'ACTIVE',
        }),
      });
      expect(addHistRes.status).toBe(201);
      const recordedHist = await addHistRes.json();
      expect(recordedHist.canonicalIngredientIds).toEqual(['ing-spironolactone']);

      // Step 4: Re-run clinical check -> Must deterministically flag ILLUSTRATIVE-DDI-001!
      const check2Res = await app.request('/api/v1/checks', {
        method: 'POST',
        headers: doctor.headers,
        body: JSON.stringify({
          subjectType: 'PRESCRIPTION_REVISION',
          subjectId: rx.currentRevisionId,
          subjectVersion: 1,
        }),
      });
      expect(check2Res.status).toBe(201);
      const { data: check2 } = await check2Res.json();
      expect(check2.outcome).toBe('FLAGGED');
      const ddiAlert2 = check2.alerts.find(
        (a: { ruleId: string }) => a.ruleId === 'ILLUSTRATIVE-DDI-001',
      );
      expect(ddiAlert2).toBeDefined();
      expect(ddiAlert2.severity).toBe('CRITICAL');
      expect(ddiAlert2.rationale).toContain('Concomitant administration of potassium supplements with potassium-sparing diuretics');
    });
  });
});
