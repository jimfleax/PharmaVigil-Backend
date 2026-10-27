import { Hono } from 'hono';
import type { AppVariables } from '../types/index.js';

export const notificationsRoutes = new Hono<{ Variables: AppVariables }>();

// API-NOTIF-001: GET /notifications
