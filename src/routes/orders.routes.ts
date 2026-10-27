import { Hono } from 'hono';
import type { AppVariables } from '../types/index.js';

export const ordersRoutes = new Hono<{ Variables: AppVariables }>();

// API-ORD-001: GET /medication-orders
// API-ORD-002: POST /medication-orders
// API-ORD-003: POST /medication-orders/:id/versions
// API-ORD-004: GET /medication-orders/:id
