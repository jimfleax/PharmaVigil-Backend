import { randomUUID } from 'node:crypto';
import type { Db } from 'mongodb';
import { DispensingRepository } from '../repositories/dispensing.repository.js';
import { PrescriptionRepository } from '../repositories/prescription.repository.js';
import { CheckRepository } from '../repositories/check.repository.js';
import { AlertRepository } from '../repositories/alert.repository.js';
import { AuditRepository } from '../repositories/audit.repository.js';
import {
  NotFoundError,
  ValidationError,
  ConflictError,
  ForbiddenError,
} from '../middleware/error-handler.js';
import type { DispensingAuthorizationDocument, UserRole } from '../types/index.js';

export class DispensingService {
  private dispensingRepo: DispensingRepository;
  private rxRepo: PrescriptionRepository;
  private checkRepo: CheckRepository;
  private alertRepo: AlertRepository;
  private auditRepo: AuditRepository;

  constructor(db: Db) {
    this.dispensingRepo = new DispensingRepository(db);
    this.rxRepo = new PrescriptionRepository(db);
    this.checkRepo = new CheckRepository(db);
    this.alertRepo = new AlertRepository(db);
    this.auditRepo = new AuditRepository(db);
  }

  async authorizeDispensing(
    hospitalId: string,
    prescriptionId: string,
    prescriptionRevisionId: string,
    checkRunId: string,
    expectedVersion: number,
    acknowledgement: string,
    actorUserId: string,
    actorRole: UserRole,
    requestId: string,
  ) {
    // GATE 1: Pharmacist Role Required
    if (actorRole !== 'PHARMACIST') {
      throw new ForbiddenError('Only authorized pharmacists may authorize medication dispensing.');
    }

    // GATE 2: Tenancy & Entity Verification
    const prescription = await this.rxRepo.findById(hospitalId, prescriptionId);
    if (!prescription) {
      throw new NotFoundError('Prescription not found');
    }

    // GATE 3: Latest Revision Matching
    if (prescriptionRevisionId !== prescription.currentRevisionId) {
      throw new ValidationError(
        'Dispensing authorization must reference the current active prescription revision.',
        [
          {
            field: 'prescriptionRevisionId',
            code: 'STALE_REVISION',
            message: 'Revision does not match prescription currentRevisionId',
          },
        ],
      );
    }

    // GATE 4: Concurrency Check (Prescription Version)
    if (prescription.version !== expectedVersion) {
      throw new ConflictError('This record changed. Reload and review the latest version.');
    }

    // GATE 5: Exact Check Match (TEST-RX-002)
    const checkRun = await this.checkRepo.findById(hospitalId, checkRunId);
    if (!checkRun) {
      throw new NotFoundError('Check run not found');
    }

    if (
      checkRun.subjectId !== prescriptionRevisionId ||
      checkRun.subjectType !== 'PRESCRIPTION_REVISION'
    ) {
      throw new ValidationError(
        'Check run was not performed on the current prescription revision. A new clinical check run is mandatory for each revision.',
        [
          {
            field: 'checkRunId',
            code: 'CHECK_REVISION_MISMATCH',
            message: 'Check run was performed on an older or different prescription revision',
          },
        ],
      );
    }

    // GATE 6: Check Outcome Validity (TEST-DISP-002)
    if (
      checkRun.outcome === 'FAILED' ||
      checkRun.outcome === 'INCOMPLETE' ||
      checkRun.outcome === 'UNSUPPORTED'
    ) {
      throw new ValidationError(
        `Dispensing authorization rejected: Clinical check outcome is ${checkRun.outcome}. Unresolved, incomplete, or failed clinical checks cannot be authorized for dispensing.`,
        [
          {
            field: 'checkRunId',
            code: 'CHECK_NOT_CLEARABLE',
            message: `Outcome ${checkRun.outcome} cannot authorize dispensing`,
          },
        ],
      );
    }

    // GATE 7: Alert Clearance Check (TEST-DISP-001)
    const alerts = await this.alertRepo.findByCheckId(hospitalId, checkRunId);
    const unresolvedAlerts = alerts.filter((a) => a.status !== 'RESOLVED');
    if (unresolvedAlerts.length > 0) {
      throw new ConflictError(
        'Dispensing authorization blocked: Unresolved clinical alerts exist for this prescription revision. All alerts must be dispositioned and resolved prior to dispensing authorization.',
      );
    }

    // GATE 8: Mandatory Acknowledgement String
    if (acknowledgement !== 'WORKFLOW_REQUIREMENTS_REVIEWED') {
      throw new ValidationError(
        'Mandatory acknowledgement must be WORKFLOW_REQUIREMENTS_REVIEWED',
        [
          {
            field: 'acknowledgement',
            code: 'INVALID_ACKNOWLEDGEMENT',
            message: 'Explicit workflow requirements review acknowledgement required',
          },
        ],
      );
    }

    // MUTATION: Create Dispensing Authorization
    const authId = randomUUID();
    const authDoc: DispensingAuthorizationDocument = {
      _id: authId,
      hospitalId,
      patientId: prescription.patientId,
      prescriptionId,
      prescriptionRevisionId,
      checkRunId,
      pharmacistId: actorUserId,
      authorizedAt: new Date(),
      acknowledgementText: acknowledgement,
      version: 1,
    };

    await this.dispensingRepo.createAuthorization(authDoc);

    // MUTATION: Mark Prescription DISPENSED
    const updatedRx = await this.rxRepo.updateStatus(
      hospitalId,
      prescriptionId,
      expectedVersion,
      'DISPENSED',
    );

    if (!updatedRx) {
      throw new ConflictError('Prescription status changed concurrently');
    }

    // AUDIT LOGGING
    await this.auditRepo.append({
      _id: randomUUID(),
      hospitalId,
      actorUserId,
      action: 'DISPENSING_AUTHORIZED',
      resourceType: 'DispensingAuthorization',
      resourceId: authId,
      timestamp: new Date(),
      requestId,
      beforeVersion: expectedVersion,
      afterVersion: updatedRx.version,
      metadata: {
        prescriptionId,
        prescriptionRevisionId,
        checkRunId,
      },
    });

    // Mandatory Invariant: Never store or return "safe: true"
    return {
      id: authDoc._id,
      _id: authDoc._id,
      authorizedAt: authDoc.authorizedAt.toISOString(),
      prescriptionRevisionId: authDoc.prescriptionRevisionId,
      checkRunId: authDoc.checkRunId,
      message:
        'Medication dispensing authorized following completion of all workflow and clinical safety verification requirements.',
    };
  }
}
