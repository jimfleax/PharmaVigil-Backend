import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import type { AppVariables } from '../types/index.js';
import { getDatabase } from '../config/db.js';
import { CaptureService } from '../services/capture.service.js';
import { requireAuth } from '../middleware/require-auth.js';
import { requireMembership } from '../middleware/require-membership.js';
import { requireRole } from '../middleware/require-role.js';
import { idempotencyMiddleware } from '../middleware/idempotency.js';
import {
  CreateCaptureSchema,
  UpdateCaptureSchema,
  ConfirmCaptureSchema,
} from '../schemas/capture.schemas.js';
import { ValidationError } from '../middleware/error-handler.js';

export const capturesRoutes = new Hono<{ Variables: AppVariables }>();

function parseExpectedVersion(headerVal: string | undefined): number {
  if (!headerVal) {
    throw new ValidationError('If-Match header with record version is required for this operation.');
  }
  const clean = headerVal.replace(/["']/g, '');
  const version = parseInt(clean, 10);
  if (isNaN(version) || version < 1) {
    throw new ValidationError('If-Match header must be a positive integer.');
  }
  return version;
}

// API-CAP-001: POST /prescription-captures (Pharmacist)
capturesRoutes.post(
  '/',
  requireAuth,
  requireMembership,
  requireRole('PHARMACIST'),
  idempotencyMiddleware('POST /prescription-captures'),
  zValidator('json', CreateCaptureSchema),
  async (c) => {
    const membership = c.get('membership')!;
    const user = c.get('user')!;
    const requestId = c.get('requestId');
    const { patientId, captureMode, ocrLanguage, extractedText } = c.req.valid('json');

    const service = new CaptureService(getDatabase());
    const data = await service.createCapture(
      membership.hospitalId,
      patientId,
      captureMode,
      ocrLanguage,
      extractedText,
      user.userId,
      requestId,
    );

    return c.json({ data }, 201);
  },
);

// API-CAP-002: GET /prescription-captures/:id (Doctor, Pharmacist)
capturesRoutes.get(
  '/:id',
  requireAuth,
  requireMembership,
  requireRole('DOCTOR', 'PHARMACIST'),
  async (c) => {
    const membership = c.get('membership')!;
    const captureId = c.req.param('id');
    const service = new CaptureService(getDatabase());
    const data = await service.getCapture(membership.hospitalId, captureId);
    return c.json({ data });
  },
);

// API-CAP-003: PATCH /prescription-captures/:id (Pharmacist)
capturesRoutes.patch(
  '/:id',
  requireAuth,
  requireMembership,
  requireRole('PHARMACIST'),
  zValidator('json', UpdateCaptureSchema),
  async (c) => {
    const membership = c.get('membership')!;
    const user = c.get('user')!;
    const requestId = c.get('requestId');
    const captureId = c.req.param('id');
    const expectedVersion = parseExpectedVersion(c.req.header('If-Match'));
    const body = c.req.valid('json');

    const service = new CaptureService(getDatabase());
    const data = await service.updateCapture(
      membership.hospitalId,
      captureId,
      expectedVersion,
      body,
      user.userId,
      requestId,
    );

    return c.json({ data });
  },
);

// API-CAP-004: POST /prescription-captures/:id/confirm (Pharmacist)
capturesRoutes.post(
  '/:id/confirm',
  requireAuth,
  requireMembership,
  requireRole('PHARMACIST'),
  idempotencyMiddleware('POST /prescription-captures/:id/confirm'),
  zValidator('json', ConfirmCaptureSchema),
  async (c) => {
    const membership = c.get('membership')!;
    const user = c.get('user')!;
    const requestId = c.get('requestId');
    const captureId = c.req.param('id');
    const expectedVersion = parseExpectedVersion(c.req.header('If-Match'));
    const { patientConfirmed, items } = c.req.valid('json');

    const service = new CaptureService(getDatabase());
    const data = await service.confirmCapture(
      membership.hospitalId,
      captureId,
      expectedVersion,
      patientConfirmed,
      items,
      user.userId,
      requestId,
    );

    return c.json({ data });
  },
);
