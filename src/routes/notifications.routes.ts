import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import type { AppVariables } from '../types/index.js';
import { getDatabase } from '../config/db.js';
import { NotificationService } from '../services/notification.service.js';
import { requireAuth } from '../middleware/require-auth.js';
import { requireMembership } from '../middleware/require-membership.js';
import { ListNotificationsQuerySchema } from '../schemas/notification.schemas.js';

export const notificationsRoutes = new Hono<{ Variables: AppVariables }>();

// API-NOTIF-001: GET /notifications
notificationsRoutes.get(
  '/',
  requireAuth,
  requireMembership,
  zValidator('query', ListNotificationsQuerySchema),
  async (c) => {
    const membership = c.get('membership')!;
    const user = c.get('user')!;
    const { unreadOnly, cursor, limit } = c.req.valid('query');

    const service = new NotificationService(getDatabase());
    const data = await service.listNotifications(
      membership.hospitalId,
      user.userId,
      unreadOnly,
      cursor,
      limit,
    );

    return c.json({ data });
  },
);

// API-NOTIF-002: POST /notifications/:id/read
notificationsRoutes.post(
  '/:id/read',
  requireAuth,
  requireMembership,
  async (c) => {
    const membership = c.get('membership')!;
    const user = c.get('user')!;
    const notificationId = c.req.param('id');

    const service = new NotificationService(getDatabase());
    await service.markAsRead(membership.hospitalId, notificationId, user.userId);

    return c.body(null, 204);
  },
);
