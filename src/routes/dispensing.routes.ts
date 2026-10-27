import { Hono } from 'hono';
import type { AppVariables } from '../types/index.js';

export const dispensingRoutes = new Hono<{ Variables: AppVariables }>();

// API-DISP-001: POST /dispensing-authorizations
