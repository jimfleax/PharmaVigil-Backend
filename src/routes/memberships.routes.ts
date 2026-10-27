import { Hono } from 'hono';
import type { AppVariables } from '../types/index.js';

export const membershipsRoutes = new Hono<{ Variables: AppVariables }>();

// API-MEM-001: GET /memberships
// API-MEM-002: POST /memberships
// API-MEM-003: POST /memberships/:id/approve
// API-MEM-004: POST /memberships/:id/reject
// API-MEM-005: POST /memberships/:id/suspend
