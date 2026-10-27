import { Hono } from 'hono';
import type { AppVariables } from '../types/index.js';

export const authRoutes = new Hono<{ Variables: AppVariables }>();

// API-AUTH-001: POST /auth/register
// API-AUTH-002: POST /auth/login
// API-AUTH-003: GET /auth/me
// API-AUTH-004: POST /auth/logout
