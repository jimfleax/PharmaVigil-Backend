import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import type { AppVariables } from '../types/index.js';
import { getDatabase } from '../config/db.js';
import { CheckService } from '../services/check.service.js';
import { requireAuth } from '../middleware/require-auth.js';
import { requireMembership } from '../middleware/require-membership.js';
import { requireRole } from '../middleware/require-role.js';
import { idempotencyMiddleware } from '../middleware/idempotency.js';
import { CreateCheckSchema } from '../schemas/check.schemas.js';

export const checksRoutes = new Hono<{ Variables: AppVariables }>();

// API-CHECK-001: POST /checks (Doctor, Pharmacist)
checksRoutes.post(
  '/',
  requireAuth,
  requireMembership,
  requireRole('DOCTOR', 'PHARMACIST'),
  idempotencyMiddleware('POST /checks'),
  zValidator('json', CreateCheckSchema),
  async (c) => {
    const membership = c.get('membership')!;
    const user = c.get('user')!;
    const requestId = c.get('requestId');
    const { subjectType, subjectId, subjectVersion } = c.req.valid('json');

    const service = new CheckService(getDatabase());
    const data = await service.runCheck(
      membership.hospitalId,
      subjectType,
      subjectId,
      subjectVersion,
      user.userId,
      requestId,
    );

    return c.json({ data }, 201);
  },
);

// API-CHECK-002: GET /checks/:id (Doctor, Pharmacist)
checksRoutes.get(
  '/:id',
  requireAuth,
  requireMembership,
  requireRole('DOCTOR', 'PHARMACIST'),
  async (c) => {
    const membership = c.get('membership')!;
    const checkId = c.req.param('id');
    const service = new CheckService(getDatabase());
    const data = await service.getCheck(membership.hospitalId, checkId);
    return c.json({ data });
  },
);

// API-CHECK-003: POST /checks/:id/retry (Doctor, Pharmacist)
checksRoutes.post(
  '/:id/retry',
  requireAuth,
  requireMembership,
  requireRole('DOCTOR', 'PHARMACIST'),
  idempotencyMiddleware('POST /checks/:id/retry'),
  async (c) => {
    const membership = c.get('membership')!;
    const user = c.get('user')!;
    const requestId = c.get('requestId');
    const checkId = c.req.param('id');

    const service = new CheckService(getDatabase());
    const data = await service.retryCheck(membership.hospitalId, checkId, user.userId, requestId);

    return c.json({ data }, 201);
  },
);
