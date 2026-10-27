import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import type { AppVariables } from '../types/index.js';
import { getDatabase } from '../config/db.js';
import { MedicationOrderService } from '../services/medication-order.service.js';
import { requireAuth } from '../middleware/require-auth.js';
import { requireMembership } from '../middleware/require-membership.js';
import { requireRole } from '../middleware/require-role.js';
import { idempotencyMiddleware } from '../middleware/idempotency.js';
import {
  CreateMedicationOrderSchema,
  CreateMedicationOrderVersionSchema,
  ListMedicationOrdersQuerySchema,
} from '../schemas/order.schemas.js';

export const ordersRoutes = new Hono<{ Variables: AppVariables }>();

// API-ORD-001: GET /medication-orders
ordersRoutes.get(
  '/',
  requireAuth,
  requireMembership,
  requireRole('DOCTOR', 'PHARMACIST', 'HOSPITAL_ADMIN'),
  zValidator('query', ListMedicationOrdersQuerySchema),
  async (c) => {
    const membership = c.get('membership')!;
    const query = c.req.valid('query');
    const service = new MedicationOrderService(getDatabase());
    const filter: {
      patientId?: string;
      status?: string;
      cursor?: string;
      limit: number;
    } = { limit: query.limit };
    if (query.patientId) filter.patientId = query.patientId;
    if (query.status) filter.status = query.status;
    if (query.cursor) filter.cursor = query.cursor;

    const data = await service.listOrders(membership.hospitalId, filter);
    return c.json({ data });
  },
);

// API-ORD-002: POST /medication-orders
ordersRoutes.post(
  '/',
  requireAuth,
  requireMembership,
  requireRole('DOCTOR'),
  idempotencyMiddleware('POST /medication-orders'),
  zValidator('json', CreateMedicationOrderSchema, (result) => {
    if (!result.success) throw result.error;
  }),
  async (c) => {
    const membership = c.get('membership')!;
    const user = c.get('user')!;
    const requestId = c.get('requestId');
    const { patientId, items, notes } = c.req.valid('json');

    const service = new MedicationOrderService(getDatabase());
    const data = await service.createOrder(
      membership.hospitalId,
      patientId,
      items,
      notes,
      user.userId,
      requestId,
    );

    return c.json({ data }, 201);
  },
);

// API-ORD-004: GET /medication-orders/:id
ordersRoutes.get(
  '/:id',
  requireAuth,
  requireMembership,
  requireRole('DOCTOR', 'PHARMACIST', 'HOSPITAL_ADMIN'),
  async (c) => {
    const membership = c.get('membership')!;
    const orderId = c.req.param('id');
    const service = new MedicationOrderService(getDatabase());
    const data = await service.getOrder(membership.hospitalId, orderId);
    return c.json({ data });
  },
);

// API-ORD-003: POST /medication-orders/:id/versions
ordersRoutes.post(
  '/:id/versions',
  requireAuth,
  requireMembership,
  requireRole('DOCTOR'),
  idempotencyMiddleware('POST /medication-orders/:id/versions'),
  zValidator('json', CreateMedicationOrderVersionSchema, (result) => {
    if (!result.success) throw result.error;
  }),
  async (c) => {
    const membership = c.get('membership')!;
    const user = c.get('user')!;
    const requestId = c.get('requestId');
    const orderId = c.req.param('id');
    const { items, changeReason, expectedVersion } = c.req.valid('json');

    const service = new MedicationOrderService(getDatabase());
    const data = await service.appendVersion(
      membership.hospitalId,
      orderId,
      expectedVersion,
      items,
      changeReason,
      user.userId,
      requestId,
    );

    return c.json({ data }, 201);
  },
);
