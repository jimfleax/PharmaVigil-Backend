import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import type { AppVariables, AlertStatus } from '../types/index.js';
import { getDatabase } from '../config/db.js';
import { AlertService } from '../services/alert.service.js';
import { requireAuth } from '../middleware/require-auth.js';
import { requireMembership } from '../middleware/require-membership.js';
import { requireRole } from '../middleware/require-role.js';
import { idempotencyMiddleware } from '../middleware/idempotency.js';
import { ListAlertsQuerySchema, AlertDispositionSchema } from '../schemas/alert.schemas.js';
import { ValidationError } from '../middleware/error-handler.js';

export const alertsRoutes = new Hono<{ Variables: AppVariables }>();

function parseExpectedVersion(headerVal: string | undefined): number {
  if (!headerVal) {
    throw new ValidationError('If-Match header is required for optimistic concurrency control.');
  }
  const clean = headerVal.replace(/["']/g, '');
  const version = parseInt(clean, 10);
  if (isNaN(version) || version < 1) {
    throw new ValidationError('If-Match header must be a positive integer.');
  }
  return version;
}

// API-ALERT-001: GET /alerts (Doctor, Pharmacist)
alertsRoutes.get(
  '/',
  requireAuth,
  requireMembership,
  requireRole('DOCTOR', 'PHARMACIST'),
  zValidator('query', ListAlertsQuerySchema),
  async (c) => {
    const membership = c.get('membership')!;
    const user = c.get('user')!;
    const { status, assignedToMe, cursor, limit } = c.req.valid('query');

    const service = new AlertService(getDatabase());
    const filter: {
      status?: AlertStatus;
      assignedDoctorId?: string;
      cursor?: string;
      limit: number;
    } = { limit };
    if (status) filter.status = status;
    if (assignedToMe) filter.assignedDoctorId = user.userId;
    if (cursor) filter.cursor = cursor;

    const data = await service.listAlerts(membership.hospitalId, filter);

    return c.json({ data });
  },
);

// API-ALERT-002: GET /alerts/:id (Doctor, Pharmacist)
alertsRoutes.get(
  '/:id',
  requireAuth,
  requireMembership,
  requireRole('DOCTOR', 'PHARMACIST'),
  async (c) => {
    const membership = c.get('membership')!;
    const alertId = c.req.param('id');
    const service = new AlertService(getDatabase());
    const data = await service.getAlert(membership.hospitalId, alertId);
    return c.json({ data });
  },
);

// API-ALERT-003: POST /alerts/:id/acknowledge (Doctor Only)
alertsRoutes.post(
  '/:id/acknowledge',
  requireAuth,
  requireMembership,
  requireRole('DOCTOR'),
  idempotencyMiddleware('POST /alerts/:id/acknowledge'),
  async (c) => {
    const membership = c.get('membership')!;
    const user = c.get('user')!;
    const requestId = c.get('requestId');
    const alertId = c.req.param('id');
    const expectedVersion = parseExpectedVersion(c.req.header('If-Match'));

    const service = new AlertService(getDatabase());
    const data = await service.acknowledgeAlert(
      membership.hospitalId,
      alertId,
      expectedVersion,
      user.userId,
      requestId,
    );

    return c.json({ data });
  },
);

// API-ALERT-004: POST /alerts/:id/disposition (Doctor Only)
alertsRoutes.post(
  '/:id/disposition',
  requireAuth,
  requireMembership,
  requireRole('DOCTOR'),
  idempotencyMiddleware('POST /alerts/:id/disposition'),
  zValidator('json', AlertDispositionSchema, (result) => {
    if (!result.success) {
      throw result.error;
    }
  }),
  async (c) => {
    const membership = c.get('membership')!;
    const user = c.get('user')!;
    const requestId = c.get('requestId');
    const alertId = c.req.param('id');
    const expectedVersion = parseExpectedVersion(c.req.header('If-Match'));
    const { dispositionType, rationale } = c.req.valid('json');

    const service = new AlertService(getDatabase());
    const data = await service.recordDisposition(
      membership.hospitalId,
      alertId,
      expectedVersion,
      dispositionType,
      rationale,
      user.userId,
      requestId,
    );

    return c.json({ data }, 201);
  },
);

// API-ALERT-005: POST /alerts/:id/resolve (Doctor Only)
alertsRoutes.post(
  '/:id/resolve',
  requireAuth,
  requireMembership,
  requireRole('DOCTOR'),
  async (c) => {
    const membership = c.get('membership')!;
    const user = c.get('user')!;
    const requestId = c.get('requestId');
    const alertId = c.req.param('id');
    const expectedVersion = parseExpectedVersion(c.req.header('If-Match'));

    const service = new AlertService(getDatabase());
    const data = await service.resolveAlert(
      membership.hospitalId,
      alertId,
      expectedVersion,
      user.userId,
      requestId,
    );

    return c.json({ data });
  },
);
