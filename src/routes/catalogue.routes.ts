import { Hono } from 'hono';
import type { AppVariables } from '../types/index.js';

export const catalogueRoutes = new Hono<{ Variables: AppVariables }>();

// API-MED-001: GET /medicine-catalogue/search
// API-MED-002: GET /medicine-catalogue/:itemId
