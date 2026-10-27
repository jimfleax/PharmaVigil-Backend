import { Hono } from 'hono';
import type { AppVariables } from '../types/index.js';
import { checkDatabaseHealth } from '../config/db.js';

export const healthRoutes = new Hono<{ Variables: AppVariables }>();

/**
 * API-HEALTH-001: Liveness check
 * Confirms process is running and responding.
 */
healthRoutes.get('/live', (c) => {
  return c.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
  });
});

/**
 * API-HEALTH-002: Readiness check
 * Confirms essential dependencies (MongoDB) are available without exposing sensitive details.
 */
healthRoutes.get('/ready', async (c) => {
  const health = await checkDatabaseHealth();

  if (!health.ok) {
    const requestId = c.get('requestId') || 'unknown';
    return c.json(
      {
        error: {
          code: 'SERVICE_UNAVAILABLE',
          message: 'Database connection is currently unavailable.',
          requestId,
          details: health.error ? [health.error] : [],
        },
      },
      503,
    );
  }

  return c.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
  });
});
