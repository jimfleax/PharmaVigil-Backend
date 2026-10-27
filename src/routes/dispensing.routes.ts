import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import type { AppVariables } from '../types/index.js';
import { getDatabase } from '../config/db.js';
import { DispensingService } from '../services/dispensing.service.js';
import { requireAuth } from '../middleware/require-auth.js';
import { requireMembership } from '../middleware/require-membership.js';
import { requireRole } from '../middleware/require-role.js';
import { idempotencyMiddleware } from '../middleware/idempotency.js';
import { CreateDispensingAuthorizationSchema } from '../schemas/dispensing.schemas.js';

export const dispensingRoutes = new Hono<{ Variables: AppVariables }>();

// API-DISP-001: POST /dispensing-authorizations (Pharmacist)
dispensingRoutes.post(
  '/',
  requireAuth,
  requireMembership,
  requireRole('PHARMACIST'),
  idempotencyMiddleware('POST /dispensing-authorizations'),
  zValidator('json', CreateDispensingAuthorizationSchema),
  async (c) => {
    const membership = c.get('membership')!;
    const user = c.get('user')!;
    const requestId = c.get('requestId');
    const {
      prescriptionId,
      prescriptionRevisionId,
      checkRunId,
      expectedVersion,
      acknowledgement,
    } = c.req.valid('json');

    const service = new DispensingService(getDatabase());
    const data = await service.authorizeDispensing(
      membership.hospitalId,
      prescriptionId,
      prescriptionRevisionId,
      checkRunId,
      expectedVersion,
      acknowledgement,
      user.userId,
      membership.role,
      requestId,
    );

    return c.json({ data }, 201);
  },
);
