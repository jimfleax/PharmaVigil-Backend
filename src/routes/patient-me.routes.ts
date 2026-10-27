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
