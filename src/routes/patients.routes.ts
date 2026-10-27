import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import type { AppVariables } from '../types/index.js';
import { getDatabase } from '../config/db.js';
import { PatientService } from '../services/patient.service.js';
import { requireAuth } from '../middleware/require-auth.js';
import { requireMembership } from '../middleware/require-membership.js';
import { requireRole } from '../middleware/require-role.js';
import {
  SearchPatientsQuerySchema,
  ConfirmPatientLinkSchema,
  AddAllergySchema,
  AddMedicationHistorySchema,
} from '../schemas/patient.schemas.js';

export const patientsRoutes = new Hono<{ Variables: AppVariables }>();

// API-PAT-001: GET /patients/search (Doctor, Pharmacist)
patientsRoutes.get(
  '/search',
  requireAuth,
  requireMembership,
  requireRole('DOCTOR', 'PHARMACIST'),
  zValidator('query', SearchPatientsQuerySchema),
  async (c) => {
    const membership = c.get('membership')!;
    const { hospitalPatientId } = c.req.valid('query');
    const service = new PatientService(getDatabase());
    const data = await service.searchPatients(membership.hospitalId, hospitalPatientId);
    return c.json({ data });
  },
);

// API-PAT-002: GET /patients/:patientId (Doctor, Pharmacist, Hospital Admin)
patientsRoutes.get(
  '/:patientId',
  requireAuth,
  requireMembership,
  requireRole('DOCTOR', 'PHARMACIST', 'HOSPITAL_ADMIN'),
  async (c) => {
    const membership = c.get('membership')!;
    const patientId = c.req.param('patientId');
    const service = new PatientService(getDatabase());
    const patient = await service.getPatient(membership.hospitalId, patientId);
    return c.json(patient);
  },
);

// API-PAT-003: POST /patients/:patientId/confirm-link (Patient, Admin)
patientsRoutes.post(
  '/:patientId/confirm-link',
  requireAuth,
  requireMembership,
  requireRole('PATIENT', 'HOSPITAL_ADMIN'),
  zValidator('json', ConfirmPatientLinkSchema),
  async (c) => {
    const user = c.get('user')!;
    const membership = c.get('membership')!;
    const patientId = c.req.param('patientId');
    const body = c.req.valid('json');
    const requestId = c.get('requestId');

    const service = new PatientService(getDatabase());
    const updated = await service.confirmPatientLink(
      membership.hospitalId,
      patientId,
      user.userId,
      body,
      requestId,
    );
    return c.json(updated);
  },
);

// API-ALLERGY-001: GET /patients/:id/allergies (Doctor, Pharmacist)
patientsRoutes.get(
  '/:id/allergies',
  requireAuth,
  requireMembership,
  requireRole('DOCTOR', 'PHARMACIST'),
  async (c) => {
    const membership = c.get('membership')!;
    const patientId = c.req.param('id');
    const service = new PatientService(getDatabase());
    const data = await service.getAllergies(membership.hospitalId, patientId);
    return c.json({ data });
  },
);

// API-ALLERGY-002: POST /patients/:id/allergies (Doctor, Pharmacist, Patient)
patientsRoutes.post(
  '/:id/allergies',
  requireAuth,
  requireMembership,
  requireRole('DOCTOR', 'PHARMACIST', 'PATIENT'),
  zValidator('json', AddAllergySchema),
  async (c) => {
    const user = c.get('user')!;
    const membership = c.get('membership')!;
    const patientId = c.req.param('id');
    const body = c.req.valid('json');
    const requestId = c.get('requestId');

    const service = new PatientService(getDatabase());
    const data = await service.addAllergy(
      membership.hospitalId,
      patientId,
      { userId: user.userId, role: membership.role },
      body,
      requestId,
    );
    return c.json(data, 201);
  },
);

// API-HIST-001: GET /patients/:id/medication-history (Doctor, Pharmacist)
patientsRoutes.get(
  '/:id/medication-history',
  requireAuth,
  requireMembership,
  requireRole('DOCTOR', 'PHARMACIST'),
  async (c) => {
    const membership = c.get('membership')!;
    const patientId = c.req.param('id');
    const service = new PatientService(getDatabase());
    const data = await service.getMedicationHistory(membership.hospitalId, patientId);
    return c.json({ data });
  },
);

// API-HIST-002: POST /patients/:id/medication-history (Doctor, Pharmacist, Patient)
patientsRoutes.post(
  '/:id/medication-history',
  requireAuth,
  requireMembership,
  requireRole('DOCTOR', 'PHARMACIST', 'PATIENT'),
  zValidator('json', AddMedicationHistorySchema),
  async (c) => {
    const user = c.get('user')!;
    const membership = c.get('membership')!;
    const patientId = c.req.param('id');
    const body = c.req.valid('json');
    const requestId = c.get('requestId');

    const service = new PatientService(getDatabase());
    const data = await service.addMedicationHistory(
      membership.hospitalId,
      patientId,
      { userId: user.userId, role: membership.role },
      body,
      requestId,
    );
    return c.json(data, 201);
  },
);
