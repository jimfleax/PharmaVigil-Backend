import { Hono } from 'hono';
import { cors } from 'hono/cors';
import type { AppVariables } from './types/index.js';
import { env } from './config/env.js';
import { connectToDatabase, checkDatabaseHealth } from './config/db.js';
import { requestIdMiddleware } from './middleware/request-id.js';
import { errorHandler } from './middleware/error-handler.js';
import { sessionMiddleware } from './middleware/session.js';
import { csrfMiddleware } from './middleware/csrf.js';

// Route imports
import { healthRoutes } from './routes/health.routes.js';
import { authRoutes } from './routes/auth.routes.js';
import { hospitalsRoutes } from './routes/hospitals.routes.js';
import { membershipsRoutes } from './routes/memberships.routes.js';
import { usersRoutes } from './routes/users.routes.js';
import { patientsRoutes } from './routes/patients.routes.js';
import { patientMeRoutes } from './routes/patient-me.routes.js';
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
import { rulesRoutes } from './routes/rules.routes.js';

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
      allowHeaders: [
        'Content-Type',
        'Authorization',
        'Cookie',
        'x-request-id',
        'x-hospital-id',
        'x-session-token',
        'Idempotency-Key',
        'If-Match',
      ],
      exposeHeaders: ['x-request-id', 'ETag'],
      maxAge: 600,
    }),
  );

  // Liveness Probe: process health only — never queries database
  app.get('/healthz/live', (c) => {
    return c.json({ status: 'UP', uptime: process.uptime() }, 200);
  });

  // Readiness Probe: checks active database connection
  app.get('/healthz/ready', async (c) => {
    const health = await checkDatabaseHealth();
    if (!health.ok) {
      return c.json({ status: 'DOWN', health }, 503);
    }
    return c.json({ status: 'READY', health }, 200);
  });

  // Global DB middleware — ensures warm/cached connection per request
  app.use('*', async (_c, next) => {
    await connectToDatabase();
    await next();
  });

  // Global session extraction and CSRF protection
  app.use('*', sessionMiddleware);
  app.use('*', csrfMiddleware);

  // Mount API v1 router
  const apiV1 = new Hono<{ Variables: AppVariables }>();

  // Mount individual resource routes
  apiV1.route('/health', healthRoutes);
  apiV1.route('/auth', authRoutes);
  apiV1.route('/hospitals', hospitalsRoutes);
  apiV1.route('/memberships', membershipsRoutes);
  apiV1.route('/users', usersRoutes);
  apiV1.route('/patients', patientsRoutes);
  apiV1.route('/patient/me', patientMeRoutes);
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
  apiV1.route('/audit-events', auditRoutes); // Dual mount for OpenAPI 3.1.0 conformance
  apiV1.route('/demo', demoRoutes);
  apiV1.route('/rule-sets', rulesRoutes);

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
