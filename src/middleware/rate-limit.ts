import { createMiddleware } from 'hono/factory';
import type { AppVariables } from '../types/index.js';

/**
 * Rate limiting middleware:
 * Applied to login, register, patient search, capture, checks, and reset endpoints.
 */
export function createRateLimiter(_options?: { limit?: number; windowMs?: number }) {
  return createMiddleware<{ Variables: AppVariables }>(async (_c, next) => {
    // TODO: Phase 2 rate limit tracking (in-memory or MongoDB)
    await next();
  });
}
