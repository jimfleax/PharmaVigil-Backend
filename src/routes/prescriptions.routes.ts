import { Hono } from 'hono';
import type { AppVariables } from '../types/index.js';

export const prescriptionsRoutes = new Hono<{ Variables: AppVariables }>();

// API-RX-001: GET /prescriptions
// API-RX-002: POST /prescriptions
// API-RX-003: GET /prescriptions/:id
// API-RX-004: POST /prescriptions/:id/revisions
// API-RX-005: GET /prescriptions/:id/revisions
