import { createMiddleware } from 'hono/factory';
import type { ContentfulStatusCode } from 'hono/utils/http-status';
import crypto from 'node:crypto';
import type { AppVariables } from '../types/index.js';
import { getDatabase } from '../config/db.js';
import { IdempotencyRepository } from '../repositories/idempotency.repository.js';
import { AppError } from './error-handler.js';

export function idempotencyMiddleware(operationName?: string) {
  return createMiddleware<{ Variables: AppVariables }>(async (c, next) => {
    const key = c.req.header('Idempotency-Key');
    if (!key) {
      return next();
    }

    const membership = c.get('membership');
    const user = c.get('user');
    const hospitalId = membership?.hospitalId || 'GLOBAL';
    const actorUserId = user?.userId || 'ANONYMOUS';
    const operation = operationName || `${c.req.method} ${c.req.path}`;

    let rawBody = '';
    try {
      const clonedReq = c.req.raw.clone();
      rawBody = await clonedReq.text();
    } catch {
      rawBody = '';
    }

    const requestHash = crypto.createHash('sha256').update(rawBody).digest('hex');
    const db = getDatabase();
    const repo = new IdempotencyRepository(db);

    const existing = await repo.findByKey(hospitalId, actorUserId, operation, key);
    if (existing) {
      if (existing.requestHash !== requestHash) {
        throw new AppError(
          409,
          'IDEMPOTENCY_CONFLICT',
          'Idempotency key was previously used with a different request payload.',
        );
      }
      return c.json(
        existing.responseBody as Record<string, unknown>,
        existing.responseStatusCode as ContentfulStatusCode,
      );
    }

    await next();

    // Cache successful 2xx responses
    if (c.res && c.res.status >= 200 && c.res.status < 300) {
      try {
        const clonedRes = c.res.clone();
        const responseBody = await clonedRes.json();
        const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);
        await repo.save({
          _id: crypto.randomUUID(),
          hospitalId,
          actorUserId,
          operation,
          key,
          requestHash,
          responseStatusCode: c.res.status,
          responseHeaders: {},
          responseBody,
          status: 'COMPLETED',
          createdAt: new Date(),
          expiresAt,
        });
      } catch {
        // Response was not JSON or streaming; ignore caching
      }
    }
  });
}
