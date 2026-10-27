import { createMiddleware } from 'hono/factory';
import type { AppVariables } from '../types/index.js';

/**
 * Session extraction middleware:
 * Validates session cookie, checks expiration, and attaches user & membership context.
 * Phase 2 implementation.
 */
export const sessionMiddleware = createMiddleware<{ Variables: AppVariables }>(
  async (_c, next) => {
    // TODO: Phase 2 - Read session cookie, verify verifier hash against MongoDB sessions collection
    await next();
  },
);
