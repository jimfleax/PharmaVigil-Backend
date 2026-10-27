import { createMiddleware } from 'hono/factory';
import type { AppVariables } from '../types/index.js';
import { UnauthenticatedError } from './error-handler.js';

export const requireAuth = createMiddleware<{ Variables: AppVariables }>(async (c, next) => {
  const user = c.get('user');
  if (!user || user.accountStatus !== 'ACTIVE') {
    throw new UnauthenticatedError('Authentication required');
  }
  await next();
});
