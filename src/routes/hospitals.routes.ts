import { Hono } from 'hono';
import type { AppVariables } from '../types/index.js';
import { getDatabase } from '../config/db.js';
import { HospitalRepository } from '../repositories/hospital.repository.js';
import { requireAuth } from '../middleware/require-auth.js';
import { requireMembership } from '../middleware/require-membership.js';
import { NotFoundError } from '../middleware/error-handler.js';

export const hospitalsRoutes = new Hono<{ Variables: AppVariables }>();

// API-HOSP-001: GET /hospitals/current
hospitalsRoutes.get('/current', requireAuth, requireMembership, async (c) => {
  const membership = c.get('membership')!;
  const repo = new HospitalRepository(getDatabase());
  const hospital = await repo.findById(membership.hospitalId);

  if (!hospital) {
    throw new NotFoundError('Hospital not found');
  }

  return c.json({
    id: hospital._id,
    name: hospital.name,
    slug: hospital.slug,
    status: hospital.status,
    isDemoWorkspace: hospital.isDemoWorkspace,
  });
});
