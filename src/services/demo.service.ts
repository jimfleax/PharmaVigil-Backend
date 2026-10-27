import { randomUUID } from 'node:crypto';
import type { Db } from 'mongodb';
import { env } from '../config/env.js';
import { HospitalRepository } from '../repositories/hospital.repository.js';
import { AuditRepository } from '../repositories/audit.repository.js';
import { ForbiddenError, ValidationError } from '../middleware/error-handler.js';

export class DemoService {
  private hospitalRepo: HospitalRepository;
  private auditRepo: AuditRepository;

  constructor(private db: Db) {
    this.hospitalRepo = new HospitalRepository(db);
    this.auditRepo = new AuditRepository(db);
  }

  async resetWorkspace(
    hospitalId: string,
    workspaceId: string,
    confirmation: string,
    actorUserId: string,
    requestId: string,
  ) {
    if (confirmation !== 'RESET_SYNTHETIC_DEMO') {
      throw new ValidationError('Confirmation must be RESET_SYNTHETIC_DEMO');
    }

    const hospital = await this.hospitalRepo.findById(hospitalId);
    if (!hospital) {
      throw new ForbiddenError('Hospital not found');
    }

    // TEST-RESET-001 Invariant: Only designated synthetic demo workspace may be reset
    if (
      !hospital.isDemoWorkspace ||
      hospital._id !== env.DEMO_WORKSPACE_ID ||
      workspaceId !== env.DEMO_WORKSPACE_ID
    ) {
      throw new ForbiddenError(
        'Reset rejected: Target is not a designated synthetic demo workspace',
      );
    }

    // Clear mutable operational collections for demo hospital
    const operationalCollections = [
      'prescription_captures',
      'prescriptions',
      'prescription_revisions',
      'check_runs',
      'alerts',
      'alert_dispositions',
      'dispensing_authorizations',
      'idempotency_records',
    ];

    for (const collName of operationalCollections) {
      await this.db.collection(collName).deleteMany({ hospitalId });
    }

    // Reset synthetic patients to unlinked state
    await this.db.collection('patient_records').updateMany(
      { hospitalId },
      {
        $set: {
          linkStatus: 'UNLINKED',
          linkedUserId: null,
          version: 1,
          updatedAt: new Date(),
        },
      },
    );

    // TEST-RESET-002 Invariant: Preserve reset event in audit trail
    await this.auditRepo.deleteExceptAction(hospitalId, 'DEMO_WORKSPACE_RESET');

    await this.auditRepo.append({
      _id: randomUUID(),
      hospitalId,
      actorUserId,
      action: 'DEMO_WORKSPACE_RESET',
      resourceType: 'DemoWorkspace',
      resourceId: workspaceId,
      timestamp: new Date(),
      requestId,
      reason: 'Authorized synthetic demo workspace reset',
    });

    return {
      message: 'Synthetic demo workspace reset successfully completed.',
      workspaceId,
      resetAt: new Date().toISOString(),
    };
  }
}
