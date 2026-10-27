import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import type { AppVariables } from '../types/index.js';
import { getDatabase } from '../config/db.js';
import { DemoService } from '../services/demo.service.js';
import { requireAuth } from '../middleware/require-auth.js';
import { requireMembership } from '../middleware/require-membership.js';
import { requireRole } from '../middleware/require-role.js';
import { idempotencyMiddleware } from '../middleware/idempotency.js';
import { ResetDemoWorkspaceSchema, SeedDemoWorkspaceSchema } from '../schemas/demo.schemas.js';

export const demoRoutes = new Hono<{ Variables: AppVariables }>();

// API-DEMO-001: POST /demo/reset (Hospital Admin Only)
demoRoutes.post(
  '/reset',
  requireAuth,
  requireMembership,
  requireRole('HOSPITAL_ADMIN'),
  idempotencyMiddleware('POST /demo/reset'),
  zValidator('json', ResetDemoWorkspaceSchema),
  async (c) => {
    const membership = c.get('membership')!;
    const user = c.get('user')!;
    const requestId = c.get('requestId');
    const { confirmation, workspaceId } = c.req.valid('json');

    const service = new DemoService(getDatabase());
    const data = await service.resetWorkspace(
      membership.hospitalId,
      workspaceId,
      confirmation,
      user.userId,
      requestId,
    );

    return c.json(data, 202);
  },
);

// API-DEMO-002: POST /demo/seed (Hospital Admin Only)
demoRoutes.post(
  '/seed',
  requireAuth,
  requireMembership,
  requireRole('HOSPITAL_ADMIN'),
  idempotencyMiddleware('POST /demo/seed'),
  zValidator('json', SeedDemoWorkspaceSchema),
  async (c) => {
    const membership = c.get('membership')!;
    const user = c.get('user')!;
    const requestId = c.get('requestId');
    const { confirmation, workspaceId } = c.req.valid('json');

    const service = new DemoService(getDatabase());
    const data = await service.seedWorkspace(
      membership.hospitalId,
      workspaceId,
      confirmation,
      user.userId,
      requestId,
    );

    return c.json(data, 202);
  },
);
