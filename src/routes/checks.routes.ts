import { Hono } from 'hono';
import type { AppVariables } from '../types/index.js';

export const checksRoutes = new Hono<{ Variables: AppVariables }>();

// API-CHECK-001: POST /checks
// API-CHECK-002: GET /checks/:id
// API-CHECK-003: POST /checks/:id/retry
