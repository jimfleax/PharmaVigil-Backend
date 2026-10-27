import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import crypto from 'node:crypto';
import { createApp } from '../../src/app.js';
import { connectToDatabase, closeDatabaseConnection, getDatabase } from '../../src/config/db.js';
import { generateSessionTokens } from '../../src/domain/auth/index.js';
import type { UserRole } from '../../src/types/index.js';

describe('Track 3: Outpatient Workflow Coordination, Clinical Checks, Alerts & Dispensing Gate', () => {
  const app = createApp();
  let db: ReturnType<typeof getDatabase>;

  const demoHospitalId = 'synthetic-demo-hospital';
  const otherHospitalId = 'hosp_other_tenant_99';
  const testPatientId = 'pat_donna_noble_001';

  async function createTestActor(role: UserRole, hospitalId: string) {
    const userId = crypto.randomUUID();
    const { sessionId, cookieValue, secretVerifierHash } = generateSessionTokens();

    await db.collection('users').insertOne({
      _id: userId,
      emailNormalized: `${role.toLowerCase()}-${userId}@hospital.test`,
      displayName: `Test ${role}`,
      passwordHash: 'dummy-hash',
      accountStatus: 'ACTIVE',
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    await db.collection('memberships').insertOne({
      _id: crypto.randomUUID(),
      hospitalId,
      userId,
      requestedRole: role,
      assignedRole: role,
      status: 'ACTIVE',
      requestedAt: new Date(),
      version: 1,
    });

    await db.collection('sessions').insertOne({
      _id: sessionId,
      userId,
      secretVerifierHash,
      createdAt: new Date(),
      lastSeenAt: new Date(),
      idleExpiresAt: new Date(Date.now() + 60 * 60 * 1000),
      absoluteExpiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
    });

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

    // Seed test patient
    await db.collection('patient_records').updateOne(
      { _id: testPatientId },
      {
        $set: {
          hospitalId: demoHospitalId,
          syntheticHospitalPatientId: 'PAT-DEMO-001',
          displayName: 'Donna Noble',
          linkStatus: 'UNLINKED',
          version: 1,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      },
      { upsert: true },
    );
  });

  afterAll(async () => {
    await closeDatabaseConnection();
  });

  // TEST-OCR-001: OCR medicine is uncertain -> confirm rejected with 422 until pharmacist resolves
  it('TEST-OCR-001: Capture with AMBIGUOUS or UNRESOLVED items cannot be confirmed', async () => {
    const pharmacist = await createTestActor('PHARMACIST', demoHospitalId);

    // 1. Create capture draft
    const createRes = await app.request('/api/v1/prescription-captures', {
      method: 'POST',
      headers: pharmacist.headers,
      body: JSON.stringify({
        patientId: testPatientId,
        captureMode: 'BROWSER_OCR',
        extractedText: 'Potklor 1 tab daily',
      }),
    });
    expect(createRes.status).toBe(201);
    const { data: capture } = await createRes.json();

    // 2. Attempt to confirm with AMBIGUOUS item -> REJECTED (422)
    const badConfirmRes = await app.request(`/api/v1/prescription-captures/${capture.id}/confirm`, {
      method: 'POST',
      headers: {
        ...pharmacist.headers,
        'If-Match': String(capture.version),
      },
      body: JSON.stringify({
        patientConfirmed: true,
        items: [
          {
            rawExtractedText: 'Potklor 1 tab daily',
            matchStatus: 'AMBIGUOUS',
            canonicalIngredientIds: [],
          },
        ],
      }),
    });
    expect(badConfirmRes.status).toBe(422);
    const badConfirmErr = await badConfirmRes.json();
    expect(badConfirmErr.error.code).toBe('VALIDATION_ERROR');

    // 3. Resolve item to CONFIRMED -> Confirmation succeeds (200)
    const goodConfirmRes = await app.request(`/api/v1/prescription-captures/${capture.id}/confirm`, {
      method: 'POST',
      headers: {
        ...pharmacist.headers,
        'If-Match': String(capture.version),
      },
      body: JSON.stringify({
        patientConfirmed: true,
        items: [
          {
            rawExtractedText: 'Potklor 1 tab daily',
            matchStatus: 'CONFIRMED',
            canonicalIngredientIds: ['ing-potassium-chloride'],
            brandText: 'Potklor',
            strengthValue: 600,
            strengthUnit: 'mg',
          },
        ],
      }),
    });
    expect(goodConfirmRes.status).toBe(200);
    const { data: confirmed } = await goodConfirmRes.json();
    expect(confirmed.status).toBe('CONFIRMED');
    expect(confirmed.items[0].matchStatus).toBe('CONFIRMED');
  });

  // TEST-RX-001: Doctor revises prescription -> Revision 2 created, Revision 1 remains intact
  it('TEST-RX-001: Doctor creates new immutable revision; previous revision remains intact', async () => {
    const doctor = await createTestActor('DOCTOR', demoHospitalId);

    // Create prescription with Revision 1
    const createRes = await app.request('/api/v1/prescriptions', {
      method: 'POST',
      headers: doctor.headers,
      body: JSON.stringify({
        patientId: testPatientId,
        items: [
          {
            rawExtractedText: 'Spironolactone 25mg',
            matchStatus: 'CONFIRMED',
            canonicalIngredientIds: ['ing-spironolactone'],
          },
        ],
      }),
    });
    expect(createRes.status).toBe(201);
    const { data: rx } = await createRes.json();
    const rev1Id = rx.currentRevisionId;

    // Doctor creates Revision 2
    const revRes = await app.request(`/api/v1/prescriptions/${rx.id}/revisions`, {
      method: 'POST',
      headers: {
        ...doctor.headers,
        'If-Match': String(rx.version),
      },
      body: JSON.stringify({
        changeReason: 'Dose adjustment due to clinical review',
        expectedVersion: rx.version,
        items: [
          {
            rawExtractedText: 'Spironolactone 50mg',
            matchStatus: 'CONFIRMED',
            canonicalIngredientIds: ['ing-spironolactone'],
          },
        ],
      }),
    });
    expect(revRes.status).toBe(201);
    const { data: updatedRx } = await revRes.json();
    expect(updatedRx.version).toBe(rx.version + 1);
    expect(updatedRx.currentRevisionId).not.toBe(rev1Id);

    // Verify Revision 1 still exists intact in the revision chain
    const revsRes = await app.request(`/api/v1/prescriptions/${rx.id}/revisions`, {
      method: 'GET',
      headers: doctor.headers,
    });
    expect(revsRes.status).toBe(200);
    const { data: revList } = await revsRes.json();
    expect(revList).toHaveLength(2);
    expect(revList[0].id).toBe(rev1Id);
    expect(revList[0].revisionNumber).toBe(1);
    expect(revList[1].revisionNumber).toBe(2);
    expect(revList[1].supersedesRevisionId).toBe(rev1Id);
  });

  // TEST-CONC-001: Two concurrent updates using same expectedVersion -> Stale write receives 409
  it('TEST-CONC-001: Concurrent update with stale expectedVersion returns 409 CONFLICT', async () => {
    const doctor = await createTestActor('DOCTOR', demoHospitalId);

    const createRes = await app.request('/api/v1/prescriptions', {
      method: 'POST',
      headers: doctor.headers,
      body: JSON.stringify({
        patientId: testPatientId,
        items: [
          {
            rawExtractedText: 'Metformin 500mg',
            matchStatus: 'CONFIRMED',
            canonicalIngredientIds: ['ing-metformin'],
          },
        ],
      }),
    });
    const { data: rx } = await createRes.json();
    const baseVersion = rx.version;

    // First write succeeds
    const write1 = await app.request(`/api/v1/prescriptions/${rx.id}/revisions`, {
      method: 'POST',
      headers: doctor.headers,
      body: JSON.stringify({
        changeReason: 'First update reason',
        expectedVersion: baseVersion,
        items: [{ rawExtractedText: 'Metformin 850mg', matchStatus: 'CONFIRMED', canonicalIngredientIds: ['ing-metformin'] }],
      }),
    });
    expect(write1.status).toBe(201);

    // Second write with same baseVersion receives 409
    const write2 = await app.request(`/api/v1/prescriptions/${rx.id}/revisions`, {
      method: 'POST',
      headers: doctor.headers,
      body: JSON.stringify({
        changeReason: 'Conflicting second update',
        expectedVersion: baseVersion,
        items: [{ rawExtractedText: 'Metformin 1000mg', matchStatus: 'CONFIRMED', canonicalIngredientIds: ['ing-metformin'] }],
      }),
    });
    expect(write2.status).toBe(409);
    const err = await write2.json();
    expect(err.error.code).toBe('CONFLICT');
    expect(err.error.message).toContain('This record changed');
  });

  // TEST-ALERT-001: Pharmacist attempts disposition on alert -> 403 Forbidden
  it('TEST-ALERT-001: Pharmacist role cannot record alert disposition (403 FORBIDDEN)', async () => {
    const doctor = await createTestActor('DOCTOR', demoHospitalId);
    const pharmacist = await createTestActor('PHARMACIST', demoHospitalId);

    // Create Rx triggering alert (potassium chloride + spironolactone)
    const rxRes = await app.request('/api/v1/prescriptions', {
      method: 'POST',
      headers: doctor.headers,
      body: JSON.stringify({
        patientId: testPatientId,
        items: [
          { rawExtractedText: 'Potassium Cl 600mg', matchStatus: 'CONFIRMED', canonicalIngredientIds: ['ing-potassium-chloride'] },
          { rawExtractedText: 'Spironolactone 25mg', matchStatus: 'CONFIRMED', canonicalIngredientIds: ['ing-spironolactone'] },
        ],
      }),
    });
    const { data: rx } = await rxRes.json();

    // Run check -> FLAGGED
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
    expect(check.alerts.length).toBeGreaterThan(0);
    const alertId = check.alerts[0].id;

    // Pharmacist tries to record disposition -> 403
    const dispRes = await app.request(`/api/v1/alerts/${alertId}/disposition`, {
      method: 'POST',
      headers: {
        ...pharmacist.headers,
        'If-Match': '1',
      },
      body: JSON.stringify({
        dispositionType: 'CLINICALLY_REVIEWED',
        rationale: 'Pharmacist trying to disposition',
      }),
    });
    expect(dispRes.status).toBe(403);
  });

  // TEST-ALERT-002: Doctor submits disposition without rationale (< 3 chars) -> 422
  // TEST-AUDIT-001: Successful disposition appends audit event
  it('TEST-ALERT-002 & TEST-AUDIT-001: Rationale validation and immutable audit append', async () => {
    const doctor = await createTestActor('DOCTOR', demoHospitalId);

    // Create prescription with critical DDI
    const rxRes = await app.request('/api/v1/prescriptions', {
      method: 'POST',
      headers: doctor.headers,
      body: JSON.stringify({
        patientId: testPatientId,
        items: [
          { rawExtractedText: 'Potassium Cl 600mg', matchStatus: 'CONFIRMED', canonicalIngredientIds: ['ing-potassium-chloride'] },
          { rawExtractedText: 'Spironolactone 25mg', matchStatus: 'CONFIRMED', canonicalIngredientIds: ['ing-spironolactone'] },
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
    const alertId = check.alerts[0].id;

    // Acknowledge alert first
    await app.request(`/api/v1/alerts/${alertId}/acknowledge`, {
      method: 'POST',
      headers: { ...doctor.headers, 'If-Match': '1' },
    });

    // 1. Submit empty rationale -> 422 (TEST-ALERT-002)
    const badDispRes = await app.request(`/api/v1/alerts/${alertId}/disposition`, {
      method: 'POST',
      headers: { ...doctor.headers, 'If-Match': '2' },
      body: JSON.stringify({
        dispositionType: 'CHANGE_REQUIRED',
        rationale: 'ab', // < 3 chars
      }),
    });
    expect(badDispRes.status).toBe(422);

    // 2. Submit valid rationale -> 201 + Audit trail created (TEST-AUDIT-001)
    const validRationale = 'Critical hyperkalemia risk detected; discontinuing spironolactone.';
    const goodDispRes = await app.request(`/api/v1/alerts/${alertId}/disposition`, {
      method: 'POST',
      headers: { ...doctor.headers, 'If-Match': '2' },
      body: JSON.stringify({
        dispositionType: 'CHANGE_REQUIRED',
        rationale: validRationale,
      }),
    });
    expect(goodDispRes.status).toBe(201);

    // Verify audit event exists
    const auditRes = await app.request('/api/v1/audit', {
      method: 'GET',
      headers: doctor.headers,
    });
    expect(auditRes.status).toBe(200);
    const { data: auditEvents } = await auditRes.json();
    const dispEvent = (auditEvents as Array<{ action: string; reason?: string; actorUserId?: string }>).find(
      (e) => e.action === 'ALERT_DISPOSITION_RECORDED' && e.reason === validRationale,
    );
    expect(dispEvent).toBeDefined();
    expect(dispEvent.actorUserId).toBe(doctor.userId);
  });

  // TEST-DISP-001: Dispensing blocked if unresolved alert exists (409 Conflict)
  it('TEST-DISP-001: Dispensing authorization rejected when alerts remain unresolved', async () => {
    const doctor = await createTestActor('DOCTOR', demoHospitalId);
    const pharmacist = await createTestActor('PHARMACIST', demoHospitalId);

    const rxRes = await app.request('/api/v1/prescriptions', {
      method: 'POST',
      headers: doctor.headers,
      body: JSON.stringify({
        patientId: testPatientId,
        items: [
          { rawExtractedText: 'Potassium Cl 600mg', matchStatus: 'CONFIRMED', canonicalIngredientIds: ['ing-potassium-chloride'] },
          { rawExtractedText: 'Spironolactone 25mg', matchStatus: 'CONFIRMED', canonicalIngredientIds: ['ing-spironolactone'] },
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

    // Pharmacist attempts to authorize dispensing while alert is OPEN
    const authRes = await app.request('/api/v1/dispensing-authorizations', {
      method: 'POST',
      headers: pharmacist.headers,
      body: JSON.stringify({
        prescriptionId: rx.id,
        prescriptionRevisionId: rx.currentRevisionId,
        checkRunId: check.id,
        expectedVersion: rx.version,
        acknowledgement: 'WORKFLOW_REQUIREMENTS_REVIEWED',
      }),
    });
    expect(authRes.status).toBe(409);
    const err = await authRes.json();
    expect(err.error.message).toContain('Unresolved clinical alerts exist');
  });

  // TEST-DISP-002: Dispensing authorization rejected if check is INCOMPLETE or FAILED
  it('TEST-DISP-002: Dispensing authorization rejected when check outcome is INCOMPLETE or UNSUPPORTED', async () => {
    const doctor = await createTestActor('DOCTOR', demoHospitalId);
    const pharmacist = await createTestActor('PHARMACIST', demoHospitalId);

    // Create prescription with UNSUPPORTED medicine
    const rxRes = await app.request('/api/v1/prescriptions', {
      method: 'POST',
      headers: doctor.headers,
      body: JSON.stringify({
        patientId: testPatientId,
        items: [
          { rawExtractedText: 'Uncatalogued Compound X', matchStatus: 'UNSUPPORTED', canonicalIngredientIds: [] },
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
    expect(check.outcome).toBe('UNSUPPORTED');

    // Attempt dispensing authorization -> 422
    const authRes = await app.request('/api/v1/dispensing-authorizations', {
      method: 'POST',
      headers: pharmacist.headers,
      body: JSON.stringify({
        prescriptionId: rx.id,
        prescriptionRevisionId: rx.currentRevisionId,
        checkRunId: check.id,
        expectedVersion: rx.version,
        acknowledgement: 'WORKFLOW_REQUIREMENTS_REVIEWED',
      }),
    });
    expect(authRes.status).toBe(422);
  });

  // TEST-RX-002: Old check used for new revision -> 422 Validation Error
  it('TEST-RX-002: Old check run cannot be reused to authorize a new prescription revision', async () => {
    const doctor = await createTestActor('DOCTOR', demoHospitalId);
    const pharmacist = await createTestActor('PHARMACIST', demoHospitalId);

    // 1. Create Revision 1
    const rxRes = await app.request('/api/v1/prescriptions', {
      method: 'POST',
      headers: doctor.headers,
      body: JSON.stringify({
        patientId: testPatientId,
        items: [{ rawExtractedText: 'Metformin 500mg', matchStatus: 'CONFIRMED', canonicalIngredientIds: ['ing-metformin'] }],
      }),
    });
    const { data: rx } = await rxRes.json();
    const rev1Id = rx.currentRevisionId;

    // Check Run on Revision 1
    const check1Res = await app.request('/api/v1/checks', {
      method: 'POST',
      headers: doctor.headers,
      body: JSON.stringify({
        subjectType: 'PRESCRIPTION_REVISION',
        subjectId: rev1Id,
        subjectVersion: 1,
      }),
    });
    const { data: check1 } = await check1Res.json();

    // 2. Doctor creates Revision 2
    const rev2Res = await app.request(`/api/v1/prescriptions/${rx.id}/revisions`, {
      method: 'POST',
      headers: { ...doctor.headers, 'If-Match': String(rx.version) },
      body: JSON.stringify({
        changeReason: 'Switching dose',
        expectedVersion: rx.version,
        items: [{ rawExtractedText: 'Metformin 850mg', matchStatus: 'CONFIRMED', canonicalIngredientIds: ['ing-metformin'] }],
      }),
    });
    const { data: rxV2 } = await rev2Res.json();

    // 3. Pharmacist attempts to authorize Revision 2 using Check 1 -> REJECTED (422)
    const authRes = await app.request('/api/v1/dispensing-authorizations', {
      method: 'POST',
      headers: pharmacist.headers,
      body: JSON.stringify({
        prescriptionId: rx.id,
        prescriptionRevisionId: rxV2.currentRevisionId,
        checkRunId: check1.id, // Check from rev 1
        expectedVersion: rxV2.version,
        acknowledgement: 'WORKFLOW_REQUIREMENTS_REVIEWED',
      }),
    });
    expect(authRes.status).toBe(422);
    const err = await authRes.json();
    expect(err.error.message).toContain('Check run was not performed on the current prescription revision');
  });

  // TEST-IDEMP-001: Retry same key and payload -> Same result, no duplicate records
  // TEST-IDEMP-002: Same key, different payload -> 409 IDEMPOTENCY_CONFLICT
  it('TEST-IDEMP-001 & TEST-IDEMP-002: Idempotency replay and conflict detection', async () => {
    const doctor = await createTestActor('DOCTOR', demoHospitalId);
    const idempotencyKey = `idemp-key-${crypto.randomUUID()}`;

    const payloadA = {
      patientId: testPatientId,
      items: [{ rawExtractedText: 'Metformin 500mg', matchStatus: 'CONFIRMED', canonicalIngredientIds: ['ing-metformin'] }],
    };

    // 1. First execution
    const res1 = await app.request('/api/v1/prescriptions', {
      method: 'POST',
      headers: { ...doctor.headers, 'Idempotency-Key': idempotencyKey },
      body: JSON.stringify(payloadA),
    });
    expect(res1.status).toBe(201);
    const body1 = await res1.json();

    // 2. Retry identical payload and key -> Replays cached response without duplicate (TEST-IDEMP-001)
    const res2 = await app.request('/api/v1/prescriptions', {
      method: 'POST',
      headers: { ...doctor.headers, 'Idempotency-Key': idempotencyKey },
      body: JSON.stringify(payloadA),
    });
    expect(res2.status).toBe(201);
    const body2 = await res2.json();
    expect(body2.data.id).toBe(body1.data.id);

    // 3. Retry same key with modified payload -> 409 IDEMPOTENCY_CONFLICT (TEST-IDEMP-002)
    const payloadB = {
      patientId: testPatientId,
      items: [{ rawExtractedText: 'Aspirin 75mg', matchStatus: 'CONFIRMED', canonicalIngredientIds: ['ing-aspirin'] }],
    };
    const res3 = await app.request('/api/v1/prescriptions', {
      method: 'POST',
      headers: { ...doctor.headers, 'Idempotency-Key': idempotencyKey },
      body: JSON.stringify(payloadB),
    });
    expect(res3.status).toBe(409);
    const err = await res3.json();
    expect(err.error.code).toBe('IDEMPOTENCY_CONFLICT');
  });

  // TEST-RESET-001: Demo reset targets non-demo workspace -> Rejected (403)
  // TEST-RESET-002: Demo reset clears operational data while reset audit event survives
  it('TEST-RESET-001 & TEST-RESET-002: Scoped demo reset validation and audit survival', async () => {
    const nonDemoAdmin = await createTestActor('HOSPITAL_ADMIN', otherHospitalId);
    const demoAdmin = await createTestActor('HOSPITAL_ADMIN', demoHospitalId);

    // 1. Attempt reset on non-demo workspace -> 403 (TEST-RESET-001)
    const badReset = await app.request('/api/v1/demo/reset', {
      method: 'POST',
      headers: nonDemoAdmin.headers,
      body: JSON.stringify({
        confirmation: 'RESET_SYNTHETIC_DEMO',
        workspaceId: otherHospitalId,
      }),
    });
    expect(badReset.status).toBe(403);

    // 2. Execute reset on authorized demo workspace -> 202 (TEST-RESET-002)
    const goodReset = await app.request('/api/v1/demo/reset', {
      method: 'POST',
      headers: demoAdmin.headers,
      body: JSON.stringify({
        confirmation: 'RESET_SYNTHETIC_DEMO',
        workspaceId: demoHospitalId,
      }),
    });
    expect(goodReset.status).toBe(202);

    // Verify operational collection is wiped
    const rxCount = await db.collection('prescriptions').countDocuments({ hospitalId: demoHospitalId });
    expect(rxCount).toBe(0);

    // Verify DEMO_WORKSPACE_RESET audit event survived in audit trail
    const auditRes = await app.request('/api/v1/audit', {
      method: 'GET',
      headers: demoAdmin.headers,
    });
    expect(auditRes.status).toBe(200);
    const { data: auditEvents } = await auditRes.json();
    const resetEvent = (auditEvents as Array<{ action: string }>).find((e) => e.action === 'DEMO_WORKSPACE_RESET');
    expect(resetEvent).toBeDefined();
  });

  // TEST-E2E-001: Full Outpatient Workflow (Capture -> DDI Check -> Change Required -> Revision 2 -> Recheck -> Dispensing Authorized)
  it('TEST-E2E-001: Complete Outpatient Workflow E2E Journey', async () => {
    const pharmacist = await createTestActor('PHARMACIST', demoHospitalId);
    const doctor = await createTestActor('DOCTOR', demoHospitalId);

    // Step 1: Capture potassium chloride + spironolactone
    const capRes = await app.request('/api/v1/prescription-captures', {
      method: 'POST',
      headers: pharmacist.headers,
      body: JSON.stringify({
        patientId: testPatientId,
        captureMode: 'SEEDED_IMAGE',
        extractedText: 'Potklor 600mg tab daily; Aldactone 25mg tab daily',
      }),
    });
    expect(capRes.status).toBe(201);
    const { data: capture } = await capRes.json();

    // Step 2: Pharmacist confirms items
    const confirmRes = await app.request(`/api/v1/prescription-captures/${capture.id}/confirm`, {
      method: 'POST',
      headers: { ...pharmacist.headers, 'If-Match': String(capture.version) },
      body: JSON.stringify({
        patientConfirmed: true,
        items: [
          { rawExtractedText: 'Potklor 600mg', matchStatus: 'CONFIRMED', canonicalIngredientIds: ['ing-potassium-chloride'] },
          { rawExtractedText: 'Aldactone 25mg', matchStatus: 'CONFIRMED', canonicalIngredientIds: ['ing-spironolactone'] },
        ],
      }),
    });
    expect(confirmRes.status).toBe(200);

    // Step 3: Create Prescription Revision 1
    const rxRes = await app.request('/api/v1/prescriptions', {
      method: 'POST',
      headers: doctor.headers,
      body: JSON.stringify({
        patientId: testPatientId,
        sourceCaptureId: capture.id,
        items: [
          { rawExtractedText: 'Potklor 600mg', matchStatus: 'CONFIRMED', canonicalIngredientIds: ['ing-potassium-chloride'] },
          { rawExtractedText: 'Aldactone 25mg', matchStatus: 'CONFIRMED', canonicalIngredientIds: ['ing-spironolactone'] },
        ],
      }),
    });
    expect(rxRes.status).toBe(201);
    const { data: rx1 } = await rxRes.json();

    // Step 4: Run Clinical Check -> Triggers ILLUSTRATIVE-DDI-001 (CRITICAL FLAGGED)
    const check1Res = await app.request('/api/v1/checks', {
      method: 'POST',
      headers: pharmacist.headers,
      body: JSON.stringify({
        subjectType: 'PRESCRIPTION_REVISION',
        subjectId: rx1.currentRevisionId,
        subjectVersion: 1,
      }),
    });
    expect(check1Res.status).toBe(201);
    const { data: check1 } = await check1Res.json();
    expect(check1.outcome).toBe('FLAGGED');
    const alertId = check1.alerts[0].id;

    // Step 5: Dispensing is blocked
    const blockedAuth = await app.request('/api/v1/dispensing-authorizations', {
      method: 'POST',
      headers: pharmacist.headers,
      body: JSON.stringify({
        prescriptionId: rx1.id,
        prescriptionRevisionId: rx1.currentRevisionId,
        checkRunId: check1.id,
        expectedVersion: rx1.version,
        acknowledgement: 'WORKFLOW_REQUIREMENTS_REVIEWED',
      }),
    });
    expect(blockedAuth.status).toBe(409);

    // Step 6: Doctor acknowledges alert & records CHANGE_REQUIRED disposition
    await app.request(`/api/v1/alerts/${alertId}/acknowledge`, {
      method: 'POST',
      headers: { ...doctor.headers, 'If-Match': '1' },
    });

    const dispRes = await app.request(`/api/v1/alerts/${alertId}/disposition`, {
      method: 'POST',
      headers: { ...doctor.headers, 'If-Match': '2' },
      body: JSON.stringify({
        dispositionType: 'CHANGE_REQUIRED',
        rationale: 'Severe hyperkalemia risk; substituting spironolactone with amlodipine.',
      }),
    });
    expect(dispRes.status).toBe(201);

    // Step 7: Doctor resolves alert after addressing clinical risk
    const resolveRes = await app.request(`/api/v1/alerts/${alertId}/resolve`, {
      method: 'POST',
      headers: { ...doctor.headers, 'If-Match': '3' },
    });
    expect(resolveRes.status).toBe(200);

    // Step 8: Doctor creates Revision 2 removing spironolactone
    const rx2Res = await app.request(`/api/v1/prescriptions/${rx1.id}/revisions`, {
      method: 'POST',
      headers: { ...doctor.headers, 'If-Match': String(rx1.version) },
      body: JSON.stringify({
        changeReason: 'Removed spironolactone to eliminate hyperkalemia risk.',
        expectedVersion: rx1.version,
        items: [
          { rawExtractedText: 'Potklor 600mg', matchStatus: 'CONFIRMED', canonicalIngredientIds: ['ing-potassium-chloride'] },
        ],
      }),
    });
    expect(rx2Res.status).toBe(201);
    const { data: rx2 } = await rx2Res.json();
    expect(rx2.currentRevisionId).not.toBe(rx1.currentRevisionId);

    // Step 9: Run Clinical Check on Revision 2 -> NO_MATCHING_RULE (Zero alerts)
    const check2Res = await app.request('/api/v1/checks', {
      method: 'POST',
      headers: pharmacist.headers,
      body: JSON.stringify({
        subjectType: 'PRESCRIPTION_REVISION',
        subjectId: rx2.currentRevisionId,
        subjectVersion: 1,
      }),
    });
    expect(check2Res.status).toBe(201);
    const { data: check2 } = await check2Res.json();
    expect(check2.outcome).toBe('NO_MATCHING_RULE');
    expect(check2.alerts).toHaveLength(0);

    // Step 10: Pharmacist authorizes dispensing -> SUCCEEDS (201)
    const successAuth = await app.request('/api/v1/dispensing-authorizations', {
      method: 'POST',
      headers: pharmacist.headers,
      body: JSON.stringify({
        prescriptionId: rx1.id,
        prescriptionRevisionId: rx2.currentRevisionId,
        checkRunId: check2.id,
        expectedVersion: rx2.version,
        acknowledgement: 'WORKFLOW_REQUIREMENTS_REVIEWED',
      }),
    });
    expect(successAuth.status).toBe(201);
    const { data: authRecord } = await successAuth.json();
    expect(authRecord.id).toBeDefined();
    expect(authRecord.prescriptionRevisionId).toBe(rx2.currentRevisionId);
    // Mandatory Invariant: Never store or claim "safe: true"
    expect(authRecord).not.toHaveProperty('safe');

    // Step 11: Verify Prescription Status is DISPENSED
    const finalRxRes = await app.request(`/api/v1/prescriptions/${rx1.id}`, {
      method: 'GET',
      headers: pharmacist.headers,
    });
    const { data: finalRx } = await finalRxRes.json();
    expect(finalRx.status).toBe('DISPENSED');
  });

  // TEST-E2E-002: Ambiguous medicine fails closed; cannot be authorized
  it('TEST-E2E-002: Ambiguous/unsupported medicine fails closed and blocks dispensing', async () => {
    const pharmacist = await createTestActor('PHARMACIST', demoHospitalId);
    const doctor = await createTestActor('DOCTOR', demoHospitalId);

    const rxRes = await app.request('/api/v1/prescriptions', {
      method: 'POST',
      headers: doctor.headers,
      body: JSON.stringify({
        patientId: testPatientId,
        items: [
          { rawExtractedText: 'Ambiguous Unknown Mixture', matchStatus: 'AMBIGUOUS', canonicalIngredientIds: [] },
        ],
      }),
    });
    const { data: rx } = await rxRes.json();

    const checkRes = await app.request('/api/v1/checks', {
      method: 'POST',
      headers: pharmacist.headers,
      body: JSON.stringify({
        subjectType: 'PRESCRIPTION_REVISION',
        subjectId: rx.currentRevisionId,
        subjectVersion: 1,
      }),
    });
    const { data: check } = await checkRes.json();
    expect(check.outcome).toBe('UNSUPPORTED');

    const authRes = await app.request('/api/v1/dispensing-authorizations', {
      method: 'POST',
      headers: pharmacist.headers,
      body: JSON.stringify({
        prescriptionId: rx.id,
        prescriptionRevisionId: rx.currentRevisionId,
        checkRunId: check.id,
        expectedVersion: rx.version,
        acknowledgement: 'WORKFLOW_REQUIREMENTS_REVIEWED',
      }),
    });
    expect(authRes.status).toBe(422);
  });
});
