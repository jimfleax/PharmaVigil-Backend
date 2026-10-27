import { Hono } from 'hono';
import type { AppVariables } from '../types/index.js';
import { getDatabase } from '../config/db.js';
import { PatientService } from '../services/patient.service.js';
import { requireAuth } from '../middleware/require-auth.js';
import { requireMembership } from '../middleware/require-membership.js';
import { requireRole } from '../middleware/require-role.js';

export const patientMeRoutes = new Hono<{ Variables: AppVariables }>();

// API-PAT-004: GET /patient/me/summary
patientMeRoutes.get(
  '/summary',
  requireAuth,
  requireMembership,
  requireRole('PATIENT'),
  async (c) => {
    const user = c.get('user')!;
    const membership = c.get('membership')!;
    const service = new PatientService(getDatabase());
    const patient = await service.getOwnPatientSummary(membership.hospitalId, user.userId);
    return c.json(patient);
  },
);

// API-PAT-005: GET /patient/me/prescriptions
patientMeRoutes.get(
  '/prescriptions',
  requireAuth,
  requireMembership,
  requireRole('PATIENT'),
  async (c) => {
    const user = c.get('user')!;
    const membership = c.get('membership')!;
    const service = new PatientService(getDatabase());
    const data = await service.getOwnPrescriptions(membership.hospitalId, user.userId);
    return c.json({ data });
  },
);

// API-PAT-006: GET /patient/me/history
patientMeRoutes.get(
  '/history',
  requireAuth,
  requireMembership,
  requireRole('PATIENT'),
  async (c) => {
    const user = c.get('user')!;
    const membership = c.get('membership')!;
    const service = new PatientService(getDatabase());
    const data = await service.getOwnHistory(membership.hospitalId, user.userId);
    return c.json({ data });
  },
);
