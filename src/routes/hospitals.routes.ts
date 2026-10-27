import { Hono } from 'hono';
import type { AppVariables } from '../types/index.js';

export const hospitalsRoutes = new Hono<{ Variables: AppVariables }>();

// API-HOSP-001: GET /hospitals/current
