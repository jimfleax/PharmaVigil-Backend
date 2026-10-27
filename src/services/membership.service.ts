import { randomUUID } from 'node:crypto';
import type { Db } from 'mongodb';
import { MembershipRepository } from '../repositories/membership.repository.js';
import { HospitalRepository } from '../repositories/hospital.repository.js';
import { AuditRepository } from '../repositories/audit.repository.js';
import {
  ConflictError,
  NotFoundError,
} from '../middleware/error-handler.js';
import type { MembershipStatus } from '../types/index.js';
import type {
  MembershipRequest,
  ApproveMembershipRequest,
  RejectMembershipRequest,
  SuspendMembershipRequest,
} from '../schemas/auth.schemas.js';

export class MembershipService {
  private membershipRepo: MembershipRepository;
  private hospitalRepo: HospitalRepository;
  private auditRepo: AuditRepository;

  constructor(db: Db) {
    this.membershipRepo = new MembershipRepository(db);
    this.hospitalRepo = new HospitalRepository(db);
    this.auditRepo = new AuditRepository(db);
  }

  async requestMembership(userId: string, input: MembershipRequest, requestId: string) {
    const hospital = await this.hospitalRepo.findBySlug(input.hospitalSlug);
    if (!hospital) {
      throw new NotFoundError(`Hospital '${input.hospitalSlug}' not found`);
    }

    const existing = await this.membershipRepo.findByUserAndHospital(userId, hospital._id);
    if (existing) {
      throw new ConflictError('Membership already exists for this hospital');
    }

    const membership = await this.membershipRepo.create({
      _id: randomUUID(),
      hospitalId: hospital._id,
      userId,
      requestedRole: input.requestedRole,
      status: 'PENDING',
      requestedAt: new Date(),
      version: 1,
    });

    await this.auditRepo.append({
      _id: randomUUID(),
      hospitalId: hospital._id,
      actorUserId: userId,
      action: 'MEMBERSHIP_REQUESTED',
      resourceType: 'Membership',
      resourceId: membership._id,
      timestamp: new Date(),
      requestId,
    });

    return membership;
  }

  async listMemberships(hospitalId: string, status?: MembershipStatus) {
    return this.membershipRepo.listByHospital(hospitalId, status ? { status } : {});
  }

  async approveMembership(
    hospitalId: string,
    adminUserId: string,
    membershipId: string,
    input: ApproveMembershipRequest,
    requestId: string,
  ) {
    const updated = await this.membershipRepo.updateStatusWithVersion(
      hospitalId,
      membershipId,
      input.expectedVersion,
      {
        status: 'ACTIVE',
        assignedRole: input.assignedRole,
        reviewedAt: new Date(),
        reviewedBy: adminUserId,
        reason: input.reason,
      },
    );

    if (!updated) {
      const current = await this.membershipRepo.findById(hospitalId, membershipId);
      if (!current) {
        throw new NotFoundError('Membership not found in this hospital');
      }
      throw new ConflictError(
        'This record changed. Reload and review the latest version.',
      );
    }

    await this.auditRepo.append({
      _id: randomUUID(),
      hospitalId,
      actorUserId: adminUserId,
      action: 'MEMBERSHIP_APPROVED',
      resourceType: 'Membership',
      resourceId: membershipId,
      timestamp: new Date(),
      requestId,
      beforeVersion: input.expectedVersion,
      afterVersion: updated.version,
    });

    return updated;
  }

  async rejectMembership(
    hospitalId: string,
    adminUserId: string,
    membershipId: string,
    input: RejectMembershipRequest,
    requestId: string,
  ) {
    const updated = await this.membershipRepo.updateStatusWithVersion(
      hospitalId,
      membershipId,
      input.expectedVersion,
      {
        status: 'REJECTED',
        reviewedAt: new Date(),
        reviewedBy: adminUserId,
        reason: input.reason,
      },
    );

    if (!updated) {
      throw new ConflictError(
        'This record changed. Reload and review the latest version.',
      );
    }

    await this.auditRepo.append({
      _id: randomUUID(),
      hospitalId,
      actorUserId: adminUserId,
      action: 'MEMBERSHIP_REJECTED',
      resourceType: 'Membership',
      resourceId: membershipId,
      timestamp: new Date(),
      requestId,
      beforeVersion: input.expectedVersion,
      afterVersion: updated.version,
    });

    return updated;
  }

  async suspendMembership(
    hospitalId: string,
    adminUserId: string,
    membershipId: string,
    input: SuspendMembershipRequest,
    requestId: string,
  ) {
    const updated = await this.membershipRepo.updateStatusWithVersion(
      hospitalId,
      membershipId,
      input.expectedVersion,
      {
        status: 'SUSPENDED',
        reviewedAt: new Date(),
        reviewedBy: adminUserId,
        reason: input.reason,
      },
    );

    if (!updated) {
      throw new ConflictError(
        'This record changed. Reload and review the latest version.',
      );
    }

    await this.auditRepo.append({
      _id: randomUUID(),
      hospitalId,
      actorUserId: adminUserId,
      action: 'MEMBERSHIP_SUSPENDED',
      resourceType: 'Membership',
      resourceId: membershipId,
      timestamp: new Date(),
      requestId,
      beforeVersion: input.expectedVersion,
      afterVersion: updated.version,
    });

    return updated;
  }
}
