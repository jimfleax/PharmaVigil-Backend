import { Hono } from 'hono';
import type { AppVariables } from '../types/index.js';
import { getDatabase } from '../config/db.js';
import { AuditService } from '../services/audit.service.js';
import { requireAuth } from '../middleware/require-auth.js';
import { requireMembership } from '../middleware/require-membership.js';
import { requireRole } from '../middleware/require-role.js';

export const auditRoutes = new Hono<{ Variables: AppVariables }>();

// API-AUDIT-001: GET /audit & /audit-events
auditRoutes.get(
  '/',
  requireAuth,
  requireMembership,
  requireRole('HOSPITAL_ADMIN', 'DOCTOR', 'PHARMACIST'),
  async (c) => {
    const membership = c.get('membership')!;
    const resourceType = c.req.query('resourceType');
    const actorUserId = c.req.query('actorUserId');
    const cursor = c.req.query('cursor');
    const limit = Math.min(Math.max(parseInt(c.req.query('limit') || '20', 10), 1), 100);

    const service = new AuditService(getDatabase());
    const filter: {
      resourceType?: string;
      actorUserId?: string;
      cursor?: string;
      limit: number;
    } = { limit };
    if (resourceType) filter.resourceType = resourceType;
    if (actorUserId) filter.actorUserId = actorUserId;
    if (cursor) filter.cursor = cursor;

    const data = await service.listEvents(membership.hospitalId, filter);

    return c.json({ data });
  },
);
