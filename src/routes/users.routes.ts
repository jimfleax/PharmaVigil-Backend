import { Hono } from 'hono';
import type { AppVariables } from '../types/index.js';

export const usersRoutes = new Hono<{ Variables: AppVariables }>();

// API-USR-001: GET /users
