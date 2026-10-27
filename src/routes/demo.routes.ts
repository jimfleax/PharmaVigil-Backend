import { Hono } from 'hono';
import type { AppVariables } from '../types/index.js';

export const demoRoutes = new Hono<{ Variables: AppVariables }>();

// API-DEMO-001: POST /demo/reset - Scoped reset of synthetic demo workspace
