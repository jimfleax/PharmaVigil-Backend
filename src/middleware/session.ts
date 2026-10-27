import { createMiddleware } from 'hono/factory';
import type { AppVariables } from '../types/index.js';
import { env } from '../config/env.js';
import { getDatabase } from '../config/db.js';
import { SessionRepository } from '../repositories/session.repository.js';
import { UserRepository } from '../repositories/user.repository.js';
import { MembershipRepository } from '../repositories/membership.repository.js';
import { verifySessionSecret } from '../domain/auth/index.js';

export const sessionMiddleware = createMiddleware<{ Variables: AppVariables }>(
  async (c, next) => {
    const rawCookie = c.req.header('Cookie');
    if (!rawCookie) {
      return next();
    }

    const cookieMatch = rawCookie.match(new RegExp(`${env.SESSION_COOKIE_NAME}=([^;]+)`));
    if (!cookieMatch || !cookieMatch[1]) {
      return next();
    }

    const cookieValue = cookieMatch[1];
    const parts = cookieValue.split('.');
    if (parts.length !== 2) {
      return next();
    }

    const sessionId = parts[0];
    const rawSecret = parts[1];
    if (!sessionId || !rawSecret) {
      return next();
    }

    try {
      const db = getDatabase();
      const sessionRepo = new SessionRepository(db);
      const userRepo = new UserRepository(db);
      const membershipRepo = new MembershipRepository(db);

      const session = await sessionRepo.findById(sessionId);
      if (!session || session.revokedAt) {
        return next();
      }

      const now = new Date();
      if (now > session.absoluteExpiresAt || now > session.idleExpiresAt) {
        return next();
      }

      const isValidSecret = verifySessionSecret(rawSecret, session.secretVerifierHash);
      if (!isValidSecret) {
        return next();
      }

      const user = await userRepo.findById(session.userId);
      if (!user || user.accountStatus !== 'ACTIVE') {
        return next();
      }

      c.set('user', {
        userId: user._id,
        email: user.emailNormalized,
        displayName: user.displayName,
        accountStatus: user.accountStatus,
      });

      // Find active membership
      const targetHospitalId = c.req.header('x-hospital-id');
      const memberships = await membershipRepo.listByUser(user._id);

      let matchedMembership = null;
      if (targetHospitalId) {
        matchedMembership = memberships.find(
          (m) => m.hospitalId === targetHospitalId && m.status === 'ACTIVE',
        );
      }
      if (!matchedMembership) {
        matchedMembership = memberships.find((m) => m.status === 'ACTIVE') || memberships[0];
      }

      if (matchedMembership) {
        c.set('membership', {
          membershipId: matchedMembership._id,
          hospitalId: matchedMembership.hospitalId,
          role: matchedMembership.assignedRole || matchedMembership.requestedRole,
          status: matchedMembership.status,
          version: matchedMembership.version,
        });
      }

      // Slide idle timeout if within last 15 minutes of idle window
      const remainingIdleMs = session.idleExpiresAt.getTime() - now.getTime();
      if (remainingIdleMs < 15 * 60 * 1000) {
        const newIdle = new Date(now.getTime() + env.SESSION_IDLE_TIMEOUT_MINUTES * 60 * 1000);
        await sessionRepo.touchIdle(sessionId, newIdle);
      }
    } catch {
      // Invariant: Unhandled session errors fail closed as unauthenticated
    }

    await next();
  },
);
