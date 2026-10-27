import { randomUUID } from 'node:crypto';
import type { Db } from 'mongodb';
import { UserRepository } from '../repositories/user.repository.js';
import { HospitalRepository } from '../repositories/hospital.repository.js';
import { MembershipRepository } from '../repositories/membership.repository.js';
import { SessionRepository } from '../repositories/session.repository.js';
import { PatientRepository } from '../repositories/patient.repository.js';
import { AuditRepository } from '../repositories/audit.repository.js';
import {
  hashPassword,
  verifyPassword,
  normalizeEmail,
  generateSessionTokens,
} from '../domain/auth/index.js';
import { ConflictError, UnauthenticatedError, NotFoundError } from '../middleware/error-handler.js';
import type { RegisterRequest, LoginRequest } from '../schemas/auth.schemas.js';
import type { PatientRecordDocument } from '../types/index.js';
import { env } from '../config/env.js';

export class AuthService {
  private userRepo: UserRepository;
  private hospitalRepo: HospitalRepository;
  private membershipRepo: MembershipRepository;
  private sessionRepo: SessionRepository;
  private patientRepo: PatientRepository;
  private auditRepo: AuditRepository;

  constructor(private db: Db) {
    this.userRepo = new UserRepository(db);
    this.hospitalRepo = new HospitalRepository(db);
    this.membershipRepo = new MembershipRepository(db);
    this.sessionRepo = new SessionRepository(db);
    this.patientRepo = new PatientRepository(db);
    this.auditRepo = new AuditRepository(db);
  }

  async register(input: RegisterRequest, requestId: string) {
    const emailNorm = normalizeEmail(input.email);
    const existing = await this.userRepo.findByEmailNormalized(emailNorm);
    if (existing) {
      throw new ConflictError('User with this email already exists');
    }

    const hospital = await this.hospitalRepo.findBySlug(input.hospitalSlug);
    if (!hospital) {
      throw new NotFoundError(`Hospital '${input.hospitalSlug}' not found`);
    }

    const passwordHash = await hashPassword(input.password);
    const userId = randomUUID();
    const now = new Date();

    const user = await this.userRepo.create({
      _id: userId,
      emailNormalized: emailNorm,
      displayName: input.displayName,
      passwordHash,
      accountStatus: 'ACTIVE',
      createdAt: now,
      updatedAt: now,
    });

    const membershipId = randomUUID();
    const membership = await this.membershipRepo.create({
      _id: membershipId,
      hospitalId: hospital._id,
      userId,
      requestedRole: input.requestedRole,
      status: 'PENDING',
      requestedAt: now,
      version: 1,
    });

    if (input.requestedRole === 'PATIENT' && input.syntheticHospitalPatientId) {
      const patients = await this.patientRepo.findBySyntheticId(
        hospital._id,
        input.syntheticHospitalPatientId,
      );
      const match = patients.find(
        (p) => p.syntheticHospitalPatientId === input.syntheticHospitalPatientId,
      );
      if (match && match.linkStatus === 'UNLINKED') {
        await this.db
          .collection<PatientRecordDocument>('patient_records')
          .updateOne(
            { _id: match._id, hospitalId: hospital._id },
            { $set: { linkedUserId: userId, linkStatus: 'PENDING_CONFIRMATION' } },
          );
      }
    }

    await this.auditRepo.append({
      _id: randomUUID(),
      hospitalId: hospital._id,
      actorUserId: userId,
      action: 'USER_REGISTERED',
      resourceType: 'User',
      resourceId: userId,
      timestamp: now,
      requestId,
    });

    return {
      userId: user._id,
      accountStatus: user.accountStatus,
      membershipStatus: membership.status,
      message: 'Account created. Membership pending administrator approval.',
    };
  }

  async login(
    input: LoginRequest,
    ip: string | undefined,
    userAgent: string | undefined,
    requestId: string,
  ) {
    const emailNorm = normalizeEmail(input.email);
    const user = await this.userRepo.findByEmailNormalized(emailNorm);

    if (!user || user.accountStatus !== 'ACTIVE') {
      throw new UnauthenticatedError('Invalid email or password');
    }

    const isMatch = await verifyPassword(input.password, user.passwordHash);
    if (!isMatch) {
      throw new UnauthenticatedError('Invalid email or password');
    }

    const { sessionId, secretVerifierHash, cookieValue } = generateSessionTokens();
    const now = new Date();
    const idleExpiresAt = new Date(now.getTime() + env.SESSION_IDLE_TIMEOUT_MINUTES * 60 * 1000);
    const absoluteExpiresAt = new Date(
      now.getTime() + env.SESSION_ABSOLUTE_TIMEOUT_HOURS * 3600 * 1000,
    );

    await this.sessionRepo.create({
      _id: sessionId,
      userId: user._id,
      secretVerifierHash,
      createdAt: now,
      lastSeenAt: now,
      idleExpiresAt,
      absoluteExpiresAt,
      ipAddress: ip,
      userAgent,
    });

    await this.userRepo.updateLastLogin(user._id);

    const memberships = await this.membershipRepo.listByUser(user._id);

    await this.auditRepo.append({
      _id: randomUUID(),
      hospitalId: memberships[0]?.hospitalId || 'GLOBAL',
      actorUserId: user._id,
      action: 'USER_LOGIN_SUCCESS',
      resourceType: 'Session',
      resourceId: sessionId,
      timestamp: now,
      requestId,
    });

    return {
      user: {
        id: user._id,
        displayName: user.displayName,
        email: user.emailNormalized,
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
      cookieValue,
      maxAgeSeconds: env.SESSION_ABSOLUTE_TIMEOUT_HOURS * 3600,
    };
  }

  async logout(sessionId: string, hospitalId: string, userId: string, requestId: string) {
    await this.sessionRepo.revoke(sessionId, 'LOGOUT');
    await this.auditRepo.append({
      _id: randomUUID(),
      hospitalId,
      actorUserId: userId,
      action: 'USER_LOGOUT',
      resourceType: 'Session',
      resourceId: sessionId,
      timestamp: new Date(),
      requestId,
    });
  }
}
