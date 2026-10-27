import { createMiddleware } from 'hono/factory';
import type { AppVariables } from '../types/index.js';

/**
 * CSRF and Origin Protection middleware:
 * Validates Origin/Referer headers on state-changing requests when cookie authentication is used.
 */
export const csrfProtection = createMiddleware<{ Variables: AppVariables }>(
  async (_c, next) => {
    // TODO: Verify Sec-Fetch-Site / Origin matches APP_ORIGIN_ALLOWLIST
    await next();
  },
);
