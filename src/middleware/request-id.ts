import { createMiddleware } from 'hono/factory';
import { randomUUID } from 'node:crypto';
import type { AppVariables } from '../types/index.js';

export const requestIdMiddleware = createMiddleware<{ Variables: AppVariables }>(
  async (c, next) => {
    const incomingId = c.req.header('x-request-id');
    const requestId = incomingId || `req_${randomUUID()}`;

    c.set('requestId', requestId);
    c.header('x-request-id', requestId);

    await next();
  },
);
