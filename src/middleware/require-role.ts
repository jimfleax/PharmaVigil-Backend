import { createMiddleware } from 'hono/factory';
import type { AppVariables, UserRole } from '../types/index.js';
import { ForbiddenError } from './error-handler.js';

export function requireRole(...allowedRoles: UserRole[]) {
  return createMiddleware<{ Variables: AppVariables }>(async (c, next) => {
    const membership = c.get('membership');
    if (!membership || !allowedRoles.includes(membership.role)) {
      throw new ForbiddenError('Insufficient permissions for this resource');
    }
    await next();
  });
}
