import { Hono } from 'hono';
import type { AppVariables } from '../types/index.js';

export const appointmentsRoutes = new Hono<{ Variables: AppVariables }>();

// API-APT-001: GET /appointments
// API-APT-002: POST /appointments
// API-APT-003: POST /appointments/:id/cancel
