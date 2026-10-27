import { Hono } from 'hono';
import type { AppVariables } from '../types/index.js';

export const alertsRoutes = new Hono<{ Variables: AppVariables }>();

// API-ALERT-001: GET /alerts
// API-ALERT-002: GET /alerts/:id
// API-ALERT-003: POST /alerts/:id/acknowledge
// API-ALERT-004: POST /alerts/:id/disposition
// API-ALERT-005: POST /alerts/:id/resolve
