import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import type { AppVariables } from '../types/index.js';
import { getDatabase } from '../config/db.js';
import { PrescriptionService } from '../services/prescription.service.js';
import { requireAuth } from '../middleware/require-auth.js';
import { requireMembership } from '../middleware/require-membership.js';
import { requireRole } from '../middleware/require-role.js';
import { idempotencyMiddleware } from '../middleware/idempotency.js';
import {
  CreatePrescriptionSchema,
  CreateRevisionSchema,
  ListPrescriptionsQuerySchema,
} from '../schemas/prescription.schemas.js';

export const prescriptionsRoutes = new Hono<{ Variables: AppVariables }>();

// API-RX-001: GET /prescriptions (Doctor, Pharmacist)
prescriptionsRoutes.get(
  '/',
  requireAuth,
  requireMembership,
  requireRole('DOCTOR', 'PHARMACIST'),
  zValidator('query', ListPrescriptionsQuerySchema),
  async (c) => {
    const membership = c.get('membership')!;
    const query = c.req.valid('query');
    const service = new PrescriptionService(getDatabase());
    const filter: {
      patientId?: string;
      status?: string;
      cursor?: string;
      limit: number;
    } = { limit: query.limit };
    if (query.patientId) filter.patientId = query.patientId;
    if (query.status) filter.status = query.status;
    if (query.cursor) filter.cursor = query.cursor;

    const data = await service.listPrescriptions(membership.hospitalId, filter);
    return c.json({ data });
  },
);

// API-RX-002: POST /prescriptions (Doctor)
prescriptionsRoutes.post(
  '/',
  requireAuth,
  requireMembership,
  requireRole('DOCTOR'),
  idempotencyMiddleware('POST /prescriptions'),
  zValidator('json', CreatePrescriptionSchema),
  async (c) => {
    const membership = c.get('membership')!;
    const user = c.get('user')!;
    const requestId = c.get('requestId');
    const { patientId, items, sourceCaptureId } = c.req.valid('json');

    const service = new PrescriptionService(getDatabase());
    const data = await service.createPrescription(
      membership.hospitalId,
      patientId,
      items,
      sourceCaptureId,
      user.userId,
      requestId,
    );

    return c.json({ data }, 201);
  },
);

// API-RX-003: GET /prescriptions/:id (Doctor, Pharmacist)
prescriptionsRoutes.get(
  '/:id',
  requireAuth,
  requireMembership,
  requireRole('DOCTOR', 'PHARMACIST'),
  async (c) => {
    const membership = c.get('membership')!;
    const prescriptionId = c.req.param('id');
    const service = new PrescriptionService(getDatabase());
    const data = await service.getPrescription(membership.hospitalId, prescriptionId);
    return c.json({ data });
  },
);

// API-RX-004: GET /prescriptions/:id/revisions (Doctor, Pharmacist)
prescriptionsRoutes.get(
  '/:id/revisions',
  requireAuth,
  requireMembership,
  requireRole('DOCTOR', 'PHARMACIST'),
  async (c) => {
    const membership = c.get('membership')!;
    const prescriptionId = c.req.param('id');
    const service = new PrescriptionService(getDatabase());
    const data = await service.listRevisions(membership.hospitalId, prescriptionId);
    return c.json({ data });
  },
);

// API-RX-005: POST /prescriptions/:id/revisions (Doctor)
prescriptionsRoutes.post(
  '/:id/revisions',
  requireAuth,
  requireMembership,
  requireRole('DOCTOR'),
  idempotencyMiddleware('POST /prescriptions/:id/revisions'),
  zValidator('json', CreateRevisionSchema),
  async (c) => {
    const membership = c.get('membership')!;
    const user = c.get('user')!;
    const requestId = c.get('requestId');
    const prescriptionId = c.req.param('id');
    const { items, changeReason, expectedVersion } = c.req.valid('json');

    const service = new PrescriptionService(getDatabase());
    const data = await service.createRevision(
      membership.hospitalId,
      prescriptionId,
      expectedVersion,
      items,
      changeReason,
      user.userId,
      requestId,
    );

    return c.json({ data }, 201);
  },
);
