import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import type { AppVariables } from '../types/index.js';
import { getDatabase } from '../config/db.js';
import { env } from '../config/env.js';
import { AuthService } from '../services/auth.service.js';
import { MembershipRepository } from '../repositories/membership.repository.js';
import { RegisterRequestSchema, LoginRequestSchema } from '../schemas/auth.schemas.js';
import { requireAuth } from '../middleware/require-auth.js';

export const authRoutes = new Hono<{ Variables: AppVariables }>();

// API-AUTH-001: POST /auth/register
authRoutes.post('/register', zValidator('json', RegisterRequestSchema), async (c) => {
  const body = c.req.valid('json');
  const requestId = c.get('requestId');
  const service = new AuthService(getDatabase());

  const result = await service.register(body, requestId);
  return c.json(result, 201);
});

// API-AUTH-002: POST /auth/login
authRoutes.post('/login', zValidator('json', LoginRequestSchema), async (c) => {
  const body = c.req.valid('json');
  const requestId = c.get('requestId');
  const ip = c.req.header('x-forwarded-for') || undefined;
  const userAgent = c.req.header('user-agent') || undefined;
  const service = new AuthService(getDatabase());

  const result = await service.login(body, ip, userAgent, requestId);

  // Set secure HTTP-only cookie
  const isProd = env.NODE_ENV === 'production';
  const cookieFlags = [
    `${env.SESSION_COOKIE_NAME}=${result.cookieValue}`,
    'HttpOnly',
    'Path=/',
    `Max-Age=${result.maxAgeSeconds}`,
    isProd ? 'Secure' : '',
    isProd ? 'SameSite=Strict' : 'SameSite=Lax',
  ]
    .filter(Boolean)
    .join('; ');

  c.header('Set-Cookie', cookieFlags);

  return c.json({
    user: result.user,
    memberships: result.memberships,
  });
});

// API-AUTH-003: GET /auth/me
authRoutes.get('/me', requireAuth, async (c) => {
  const user = c.get('user')!;
  const membership = c.get('membership');
  const membershipRepo = new MembershipRepository(getDatabase());
  const memberships = await membershipRepo.listByUser(user.userId);
  return c.json({
    user: {
      id: user.userId,
      email: user.email,
      displayName: user.displayName,
      accountStatus: user.accountStatus,
    },
    memberships: memberships.map((m) => ({
      id: m._id,
      hospitalId: m.hospitalId,
      requestedRole: m.requestedRole,
      assignedRole: m.assignedRole,
      status: m.status,
      version: m.version,
    })),
    membership,
  });
});

// API-AUTH-004: POST /auth/logout
authRoutes.post('/logout', requireAuth, async (c) => {
  const user = c.get('user')!;
  const membership = c.get('membership');
  const requestId = c.get('requestId');

  const rawCookie = c.req.header('Cookie') || '';
  const match = rawCookie.match(new RegExp(`${env.SESSION_COOKIE_NAME}=([^;]+)`));
  const sessionId = match && match[1] ? match[1].split('.')[0] : '';

  if (sessionId) {
    const service = new AuthService(getDatabase());
    await service.logout(sessionId, membership?.hospitalId || 'GLOBAL', user.userId, requestId);
  }

  // Clear cookie
  c.header(
    'Set-Cookie',
    `${env.SESSION_COOKIE_NAME}=; Path=/; Expires=Thu, 01 Jan 1970 00:00:00 GMT; HttpOnly`,
  );

  return c.body(null, 204);
});
