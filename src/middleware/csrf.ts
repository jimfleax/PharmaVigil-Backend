import { createMiddleware } from 'hono/factory';
import type { AppVariables } from '../types/index.js';
import { env } from '../config/env.js';
import { ForbiddenError } from './error-handler.js';

const MUTATION_METHODS = new Set(['POST', 'PUT', 'PATCH', 'DELETE']);

export const csrfMiddleware = createMiddleware<{ Variables: AppVariables }>(async (c, next) => {
  if (!MUTATION_METHODS.has(c.req.method)) {
    return next();
  }

  const origin = c.req.header('Origin') || c.req.header('Referer');
  if (origin) {
    const allowed = env.APP_ORIGIN_ALLOWLIST.split(',').map((o) => o.trim());
    const isAllowed = allowed.some((allowedOrigin) => origin.startsWith(allowedOrigin));
    if (!isAllowed) {
      throw new ForbiddenError('Invalid request origin');
    }
  }

  const secFetchSite = c.req.header('sec-fetch-site');
  if (secFetchSite === 'cross-site') {
    throw new ForbiddenError('Cross-site mutation requests are forbidden');
  }

  await next();
});
