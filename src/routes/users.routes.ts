import { Hono } from 'hono';
import type { AppVariables } from '../types/index.js';
import { getDatabase } from '../config/db.js';
import { MembershipRepository } from '../repositories/membership.repository.js';
import { UserRepository } from '../repositories/user.repository.js';
import { requireAuth } from '../middleware/require-auth.js';
import { requireMembership } from '../middleware/require-membership.js';
import { requireRole } from '../middleware/require-role.js';

export const usersRoutes = new Hono<{ Variables: AppVariables }>();

// API-USR-001: GET /users (Admin only)
usersRoutes.get('/', requireAuth, requireMembership, requireRole('HOSPITAL_ADMIN'), async (c) => {
  const membership = c.get('membership')!;
  const db = getDatabase();
  const memRepo = new MembershipRepository(db);
  const userRepo = new UserRepository(db);

  const hospitalMemberships = await memRepo.listByHospital(membership.hospitalId, {});
  const userPromises = hospitalMemberships.map(async (m) => {
    const u = await userRepo.findById(m.userId);
    return {
      id: m.userId,
      membershipId: m._id,
      displayName: u?.displayName || 'Unknown',
      email: u?.emailNormalized || '',
      membershipStatus: m.status,
      assignedRole: m.assignedRole || m.requestedRole,
    };
  });

  const data = await Promise.all(userPromises);
  return c.json({ data });
});
