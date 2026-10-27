import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import type { AppVariables } from '../types/index.js';
import { getDatabase } from '../config/db.js';
import { AppointmentService } from '../services/appointment.service.js';
import { requireAuth } from '../middleware/require-auth.js';
import { requireMembership } from '../middleware/require-membership.js';
import { idempotencyMiddleware } from '../middleware/idempotency.js';
import {
  CreateAppointmentSchema,
  ListAppointmentsQuerySchema,
  CancelAppointmentSchema,
} from '../schemas/appointment.schemas.js';

export const appointmentsRoutes = new Hono<{ Variables: AppVariables }>();

// API-APT-001: GET /appointments
appointmentsRoutes.get(
  '/',
  requireAuth,
  requireMembership,
  zValidator('query', ListAppointmentsQuerySchema),
  async (c) => {
    const membership = c.get('membership')!;
    const user = c.get('user')!;
    const query = c.req.valid('query');

    const service = new AppointmentService(getDatabase());
    const data = await service.listAppointments(
      membership.hospitalId,
      query,
      user.userId,
      membership.role,
    );

    return c.json({ data });
  },
);

// API-APT-002: POST /appointments
appointmentsRoutes.post(
  '/',
  requireAuth,
  requireMembership,
  idempotencyMiddleware('POST /appointments'),
  zValidator('json', CreateAppointmentSchema, (result) => {
    if (!result.success) throw result.error;
  }),
  async (c) => {
    const membership = c.get('membership')!;
    const user = c.get('user')!;
    const requestId = c.get('requestId');
    const input = c.req.valid('json');

    const service = new AppointmentService(getDatabase());
    const data = await service.createAppointment(
      membership.hospitalId,
      input,
      user.userId,
      membership.role,
      requestId,
    );

    return c.json({ data }, 201);
  },
);

// API-APT-003: POST /appointments/:id/cancel
appointmentsRoutes.post(
  '/:id/cancel',
  requireAuth,
  requireMembership,
  idempotencyMiddleware('POST /appointments/:id/cancel'),
  zValidator('json', CancelAppointmentSchema, (result) => {
    if (!result.success) throw result.error;
  }),
  async (c) => {
    const membership = c.get('membership')!;
    const user = c.get('user')!;
    const requestId = c.get('requestId');
    const appointmentId = c.req.param('id');
    const input = c.req.valid('json');

    const service = new AppointmentService(getDatabase());
    const data = await service.cancelAppointment(
      membership.hospitalId,
      appointmentId,
      input,
      user.userId,
      membership.role,
      requestId,
    );

    return c.json({ data });
  },
);
