import { Hono } from 'hono';
import type { AppVariables } from '../types/index.js';

export const capturesRoutes = new Hono<{ Variables: AppVariables }>();

// API-CAP-001: POST /prescription-captures
// API-CAP-002: GET /prescription-captures/:id
// API-CAP-003: PATCH /prescription-captures/:id
// API-CAP-004: POST /prescription-captures/:id/confirm
