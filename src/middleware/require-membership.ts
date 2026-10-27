import { createMiddleware } from 'hono/factory';
import type { AppVariables } from '../types/index.js';
import { ForbiddenError } from './error-handler.js';

/**
 * Membership verification guard:
 * Ensures the authenticated user has an ACTIVE membership in the target hospital.
 */
export const requireMembership = createMiddleware<{ Variables: AppVariables }>(
  async (c, next) => {
    const membership = c.get('membership');
    if (!membership || membership.status !== 'ACTIVE') {
      throw new ForbiddenError('Active hospital membership required');
    }
    await next();
  },
);
