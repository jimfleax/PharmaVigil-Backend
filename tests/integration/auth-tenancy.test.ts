import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { createApp } from '../../src/app.js';
import { connectToDatabase, closeDatabaseConnection } from '../../src/config/db.js';
import { seedIdentityDatabase } from '../../src/fixtures/seed-identity.js';

describe('Track 1: Auth, Multi-Tenancy & Patient Security', () => {
  const app = createApp();

  beforeAll(async () => {
    const { db } = await connectToDatabase();
    await seedIdentityDatabase(db);
  });

  afterAll(async () => {
    await closeDatabaseConnection();
  });

  // Helper to extract session cookie from response
  function extractSessionCookie(res: Response): string | null {
    const setCookie = res.headers.get('set-cookie');
    if (!setCookie) return null;
    const match = setCookie.match(/__Host-vf_session=([^;]+)/);
    return match ? match[1] : null;
  }

  // TEST-AUTH-001: Valid login sets secure session cookie, no secrets returned
  it('TEST-AUTH-001: Valid login sets secure session cookie, no secrets returned', async () => {
    const res = await app.request('/api/v1/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: 'doctor@demo-hospital.local',
        password: 'DemoPassword123!',
      }),
    });

    expect(res.status).toBe(200);
    const setCookie = res.headers.get('set-cookie');
    expect(setCookie).toBeTruthy();
    expect(setCookie).toContain('__Host-vf_session=');
    expect(setCookie).toContain('HttpOnly');

    const body = await res.json();
    expect(body.user).toBeDefined();
    expect(body.user.email).toBe('doctor@demo-hospital.local');
    expect(body.user.displayName).toBe('Dr. Clara Oswald');
    expect(body.memberships).toBeInstanceOf(Array);
    expect(body.memberships[0].assignedRole).toBe('DOCTOR');

    // Invariant: No password hashes or raw secrets leaked
    expect(body.user.passwordHash).toBeUndefined();
    expect(body.secretVerifierHash).toBeUndefined();
    expect(JSON.stringify(body)).not.toContain('DemoPassword123!');
  });

  // TEST-AUTH-002: Invalid login returns generic 401 UNAUTHENTICATED
  it('TEST-AUTH-002: Invalid login returns generic 401 UNAUTHENTICATED', async () => {
    // Bad password
    const badPwRes = await app.request('/api/v1/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: 'doctor@demo-hospital.local',
        password: 'WrongPassword999!',
      }),
    });

    expect(badPwRes.status).toBe(401);
    const badPwBody = await badPwRes.json();
    expect(badPwBody.error.code).toBe('UNAUTHENTICATED');
    expect(badPwBody.error.message).toBe('Invalid email or password');

    // Non-existent user
    const badUserRes = await app.request('/api/v1/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: 'nonexistent@demo-hospital.local',
        password: 'DemoPassword123!',
      }),
    });

    expect(badUserRes.status).toBe(401);
    const badUserBody = await badUserRes.json();
    expect(badUserBody.error.code).toBe('UNAUTHENTICATED');
    // Must be identical message to prevent user enumeration
    expect(badUserBody.error.message).toBe(badPwBody.error.message);
  });

  // TEST-AUTH-003: Pending membership cannot access clinical patient APIs
  it('TEST-AUTH-003: Pending membership cannot access clinical patient APIs', async () => {
    // Login as pending doctor
    const loginRes = await app.request('/api/v1/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: 'pending.doctor@demo-hospital.local',
        password: 'DemoPassword123!',
      }),
    });
    expect(loginRes.status).toBe(200);
    const cookie = extractSessionCookie(loginRes);
    expect(cookie).toBeTruthy();

    // Attempt to access clinical search
    const clinicalRes = await app.request('/api/v1/patients/search?hospitalPatientId=PAT-DEMO-001', {
      method: 'GET',
      headers: {
        Cookie: `__Host-vf_session=${cookie}`,
      },
    });

    expect(clinicalRes.status).toBe(403);
    const body = await clinicalRes.json();
    expect(body.error.code).toBe('FORBIDDEN');
    expect(body.error.message).toContain('membership');
  });

  // TEST-AUTH-004: Suspended membership session rejected immediately
  it('TEST-AUTH-004: Suspended membership session rejected immediately', async () => {
    // Login as suspended pharmacist
    const loginRes = await app.request('/api/v1/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: 'suspended.pharma@demo-hospital.local',
        password: 'DemoPassword123!',
      }),
    });
    expect(loginRes.status).toBe(200);
    const cookie = extractSessionCookie(loginRes);
    expect(cookie).toBeTruthy();

    // Call clinical search
    const res = await app.request('/api/v1/patients/search?hospitalPatientId=PAT-DEMO-001', {
      method: 'GET',
      headers: {
        Cookie: `__Host-vf_session=${cookie}`,
      },
    });

    expect(res.status).toBe(403);
    const body = await res.json();
    expect(body.error.code).toBe('FORBIDDEN');
  });

  // TEST-SEC-001: Cross-hospital lookup returns safe 404/403 with no tenant leak
  it('TEST-SEC-001: Cross-hospital lookup returns safe 404 with no tenant leak', async () => {
    // Login as Demo Hospital Doctor
    const loginRes = await app.request('/api/v1/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: 'doctor@demo-hospital.local',
        password: 'DemoPassword123!',
      }),
    });
    const cookie = extractSessionCookie(loginRes);

    // Query Tenant B Patient pat_rec_tenant_b_001
    const res = await app.request('/api/v1/patients/pat_rec_tenant_b_001', {
      method: 'GET',
      headers: {
        Cookie: `__Host-vf_session=${cookie}`,
      },
    });

    // Invariant: Must return 404 NOT_FOUND. Must NOT disclose that record exists in another tenant.
    expect(res.status).toBe(404);
    const body = await res.json();
    expect(body.error.code).toBe('NOT_FOUND');
    expect(body.error.message).toContain('Patient not found');
  });

  // TEST-SEC-002: Patient role attempting doctor/admin endpoint gets 403
  it('TEST-SEC-002: Patient role attempting doctor/admin endpoint gets 403', async () => {
    // Login as Patient Donna Noble
    const loginRes = await app.request('/api/v1/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: 'patient@demo-hospital.local',
        password: 'DemoPassword123!',
      }),
    });
    const cookie = extractSessionCookie(loginRes);

    // Patient attempts staff endpoint: search patients
    const searchRes = await app.request('/api/v1/patients/search?hospitalPatientId=PAT-DEMO-001', {
      method: 'GET',
      headers: {
        Cookie: `__Host-vf_session=${cookie}`,
      },
    });
    expect(searchRes.status).toBe(403);
    const searchBody = await searchRes.json();
    expect(searchBody.error.code).toBe('FORBIDDEN');

    // Patient attempts admin endpoint: list memberships
    const memRes = await app.request('/api/v1/memberships', {
      method: 'GET',
      headers: {
        Cookie: `__Host-vf_session=${cookie}`,
      },
    });
    expect(memRes.status).toBe(403);
    const memBody = await memRes.json();
    expect(memBody.error.code).toBe('FORBIDDEN');
  });

  // TEST-SEC-003: Client forged hospitalId or role is ignored
  it('TEST-SEC-003: Client forged hospitalId or role is ignored', async () => {
    // Login as Patient
    const loginRes = await app.request('/api/v1/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: 'patient@demo-hospital.local',
        password: 'DemoPassword123!',
      }),
    });
    const cookie = extractSessionCookie(loginRes);

    // Attempt to forge role in headers and query params
    const res = await app.request('/api/v1/patients/search?hospitalPatientId=PAT-DEMO-001', {
      method: 'GET',
      headers: {
        Cookie: `__Host-vf_session=${cookie}`,
        'X-User-Role': 'DOCTOR',
        'X-Hospital-Id': 'hosp_tenant_b_02',
      },
    });

    expect(res.status).toBe(403);
  });

  // TEST-ALLERGY-001 & 002: Confirmed vs unverified allergy records
  it('TEST-ALLERGY-001: Confirmed allergy returns canonical ingredient and CONFIRMED status', async () => {
    // Login as Doctor
    const loginRes = await app.request('/api/v1/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: 'doctor@demo-hospital.local',
        password: 'DemoPassword123!',
      }),
    });
    const cookie = extractSessionCookie(loginRes);

    // Fetch Donna Noble allergies
    const res = await app.request('/api/v1/patients/pat_rec_donna_001/allergies', {
      method: 'GET',
      headers: {
        Cookie: `__Host-vf_session=${cookie}`,
      },
    });

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.data).toBeInstanceOf(Array);
    expect(body.data.length).toBeGreaterThan(0);

    const penicillin = body.data.find(
      (a: { canonicalIngredientId?: string }) => a.canonicalIngredientId === 'ing_penicillin',
    );
    expect(penicillin).toBeDefined();
    expect(penicillin.verificationStatus).toBe('CONFIRMED');
    expect(penicillin.sourceType).toBe('CLINICIAN_RECORDED');
    expect(penicillin.severity).toBe('SEVERE');
  });

  it('TEST-ALLERGY-002: Unverified/patient-reported allergy returns REPORTED status', async () => {
    // Login as Doctor
    const loginRes = await app.request('/api/v1/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: 'doctor@demo-hospital.local',
        password: 'DemoPassword123!',
      }),
    });
    const cookie = extractSessionCookie(loginRes);

    // Fetch Rory Williams allergies
    const res = await app.request('/api/v1/patients/pat_rec_rory_002/allergies', {
      method: 'GET',
      headers: {
        Cookie: `__Host-vf_session=${cookie}`,
      },
    });

    expect(res.status).toBe(200);
    const body = await res.json();
    const aspirin = body.data.find(
      (a: { canonicalIngredientId?: string }) => a.canonicalIngredientId === 'ing_aspirin',
    );
    expect(aspirin).toBeDefined();
    expect(aspirin.verificationStatus).toBe('REPORTED');
    expect(aspirin.sourceType).toBe('PATIENT_REPORTED');
    expect(aspirin.severity).toBe('MODERATE');
  });

  // Additional check: Patient can view own profile
  it('Patient can view own profile via GET /api/v1/patient/me/summary', async () => {
    const loginRes = await app.request('/api/v1/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: 'patient@demo-hospital.local',
        password: 'DemoPassword123!',
      }),
    });
    const cookie = extractSessionCookie(loginRes);

    const res = await app.request('/api/v1/patient/me/summary', {
      method: 'GET',
      headers: {
        Cookie: `__Host-vf_session=${cookie}`,
      },
    });

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.syntheticHospitalPatientId).toBe('PAT-DEMO-001');
    expect(body.displayName).toBe('Donna Noble');
  });
});
