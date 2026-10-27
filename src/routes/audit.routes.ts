import { Hono } from 'hono';
import type { AppVariables } from '../types/index.js';

export const auditRoutes = new Hono<{ Variables: AppVariables }>();

// API-AUDIT-001: Append-only audit record query
