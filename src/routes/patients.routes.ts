import { Hono } from 'hono';
import type { AppVariables } from '../types/index.js';

export const patientsRoutes = new Hono<{ Variables: AppVariables }>();

// API-PAT-001: GET /patients/search
// API-PAT-002: GET /patients/:patientId
// API-PAT-003: POST /patients/:patientId/confirm-link
// API-PAT-004: GET /patient/me/summary
// API-PAT-005: GET /patient/me/prescriptions
// API-PAT-006: GET /patient/me/history
// API-HIST-001: GET /patients/:id/medication-history
// API-ALLERGY-001: GET /patients/:id/allergies
