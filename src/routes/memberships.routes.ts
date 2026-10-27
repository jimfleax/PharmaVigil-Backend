import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import type { AppVariables } from '../types/index.js';
import { getDatabase } from '../config/db.js';
import { MembershipService } from '../services/membership.service.js';
import { requireAuth } from '../middleware/require-auth.js';
import { requireMembership } from '../middleware/require-membership.js';
import { requireRole } from '../middleware/require-role.js';
import {
  MembershipRequestSchema,
  ApproveMembershipRequestSchema,
  RejectMembershipRequestSchema,
  SuspendMembershipRequestSchema,
} from '../schemas/auth.schemas.js';

export const membershipsRoutes = new Hono<{ Variables: AppVariables }>();

// API-MEM-001: GET /memberships (Admin only)
membershipsRoutes.get(
  '/',
  requireAuth,
  requireMembership,
  requireRole('HOSPITAL_ADMIN'),
  async (c) => {
    const membership = c.get('membership')!;
    const status = c.req.query('status') as
      import('../types/index.js').MembershipStatus | undefined;
    const service = new MembershipService(getDatabase());
    const data = await service.listMemberships(membership.hospitalId, status);
    return c.json({ data });
  },
);

// API-MEM-002: POST /memberships (Request membership in another hospital)
membershipsRoutes.post('/', requireAuth, zValidator('json', MembershipRequestSchema), async (c) => {
  const user = c.get('user')!;
  const body = c.req.valid('json');
  const requestId = c.get('requestId');
  const service = new MembershipService(getDatabase());
  const created = await service.requestMembership(user.userId, body, requestId);
  return c.json({ data: created }, 201);
});

// API-MEM-003: POST /memberships/:id/approve
membershipsRoutes.post(
  '/:id/approve',
  requireAuth,
  requireMembership,
  requireRole('HOSPITAL_ADMIN'),
  zValidator('json', ApproveMembershipRequestSchema),
  async (c) => {
    const admin = c.get('user')!;
    const membership = c.get('membership')!;
    const targetId = c.req.param('id');
    const body = c.req.valid('json');
    const requestId = c.get('requestId');

    const service = new MembershipService(getDatabase());
    const updated = await service.approveMembership(
      membership.hospitalId,
      admin.userId,
      targetId,
      body,
      requestId,
    );
    return c.json({ data: updated });
  },
);

// API-MEM-004: POST /memberships/:id/reject
membershipsRoutes.post(
  '/:id/reject',
  requireAuth,
  requireMembership,
  requireRole('HOSPITAL_ADMIN'),
  zValidator('json', RejectMembershipRequestSchema),
  async (c) => {
    const admin = c.get('user')!;
    const membership = c.get('membership')!;
    const targetId = c.req.param('id');
    const body = c.req.valid('json');
    const requestId = c.get('requestId');

    const service = new MembershipService(getDatabase());
    await service.rejectMembership(membership.hospitalId, admin.userId, targetId, body, requestId);
    return c.json({ message: 'Membership rejected' });
  },
);

// API-MEM-005: POST /memberships/:id/suspend
membershipsRoutes.post(
  '/:id/suspend',
  requireAuth,
  requireMembership,
  requireRole('HOSPITAL_ADMIN'),
  zValidator('json', SuspendMembershipRequestSchema),
  async (c) => {
    const admin = c.get('user')!;
    const membership = c.get('membership')!;
    const targetId = c.req.param('id');
    const body = c.req.valid('json');
    const requestId = c.get('requestId');

    const service = new MembershipService(getDatabase());
    await service.suspendMembership(membership.hospitalId, admin.userId, targetId, body, requestId);
    return c.json({ message: 'Membership suspended' });
  },
);
