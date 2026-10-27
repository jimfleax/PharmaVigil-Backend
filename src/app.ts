import { Hono } from 'hono';
import { cors } from 'hono/cors';
import type { AppVariables } from './types/index.js';
import { env } from './config/env.js';
import { requestIdMiddleware } from './middleware/request-id.js';
import { errorHandler } from './middleware/error-handler.js';

// Route imports
import { healthRoutes } from './routes/health.routes.js';
import { authRoutes } from './routes/auth.routes.js';
import { hospitalsRoutes } from './routes/hospitals.routes.js';
import { membershipsRoutes } from './routes/memberships.routes.js';
import { usersRoutes } from './routes/users.routes.js';
import { patientsRoutes } from './routes/patients.routes.js';
import { catalogueRoutes } from './routes/catalogue.routes.js';
import { capturesRoutes } from './routes/captures.routes.js';
import { prescriptionsRoutes } from './routes/prescriptions.routes.js';
import { checksRoutes } from './routes/checks.routes.js';
import { alertsRoutes } from './routes/alerts.routes.js';
import { dispensingRoutes } from './routes/dispensing.routes.js';
import { ordersRoutes } from './routes/orders.routes.js';
import { appointmentsRoutes } from './routes/appointments.routes.js';
import { notificationsRoutes } from './routes/notifications.routes.js';
import { auditRoutes } from './routes/audit.routes.js';
import { demoRoutes } from './routes/demo.routes.js';

export function createApp(): Hono<{ Variables: AppVariables }> {
  const app = new Hono<{ Variables: AppVariables }>();

  // Attach global error handler
  app.onError(errorHandler);

  // Global request correlation ID
  app.use('*', requestIdMiddleware);

  // Exact CORS allowlist; credentials allowed, never wildcard with credentials
  const allowedOrigins = env.APP_ORIGIN_ALLOWLIST.split(',').map((origin) => origin.trim());
  app.use(
    '*',
    cors({
      origin: (origin) => {
        if (!origin || allowedOrigins.includes(origin)) {
          return origin || allowedOrigins[0] || 'http://localhost:3000';
        }
        return null;
      },
      credentials: true,
      allowMethods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
      allowHeaders: ['Content-Type', 'Authorization', 'x-request-id', 'Idempotency-Key', 'If-Match'],
      exposeHeaders: ['x-request-id', 'ETag'],
      maxAge: 600,
    }),
  );

  // Mount API v1 router
  const apiV1 = new Hono<{ Variables: AppVariables }>();

  // Mount individual resource routes
  apiV1.route('/health', healthRoutes);
  apiV1.route('/auth', authRoutes);
  apiV1.route('/hospitals', hospitalsRoutes);
  apiV1.route('/memberships', membershipsRoutes);
  apiV1.route('/users', usersRoutes);
  apiV1.route('/patients', patientsRoutes);
  apiV1.route('/medicine-catalogue', catalogueRoutes);
  apiV1.route('/prescription-captures', capturesRoutes);
  apiV1.route('/prescriptions', prescriptionsRoutes);
  apiV1.route('/checks', checksRoutes);
  apiV1.route('/alerts', alertsRoutes);
  apiV1.route('/dispensing-authorizations', dispensingRoutes);
  apiV1.route('/medication-orders', ordersRoutes);
  apiV1.route('/appointments', appointmentsRoutes);
  apiV1.route('/notifications', notificationsRoutes);
  apiV1.route('/audit', auditRoutes);
  apiV1.route('/demo', demoRoutes);

  // Mount API v1 under root
  app.route('/api/v1', apiV1);

  // 404 handler matching standard error envelope
  app.notFound((c) => {
    const requestId = c.get('requestId') || 'unknown';
    return c.json(
      {
        error: {
          code: 'NOT_FOUND',
          message: `Endpoint ${c.req.method} ${c.req.path} not found.`,
          requestId,
          details: [],
        },
      },
      404,
    );
  });

  return app;
}

export const app = createApp();
