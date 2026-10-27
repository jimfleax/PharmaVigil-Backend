import { randomUUID } from 'node:crypto';
import type { Db } from 'mongodb';
import { PrescriptionRepository } from '../repositories/prescription.repository.js';
import { PatientRepository } from '../repositories/patient.repository.js';
import { AuditRepository } from '../repositories/audit.repository.js';
import { NotFoundError, ConflictError } from '../middleware/error-handler.js';
import type {
  PrescriptionDocument,
  PrescriptionRevisionDocument,
  PrescriptionItemModel,
} from '../types/index.js';

export class PrescriptionService {
  private rxRepo: PrescriptionRepository;
  private patientRepo: PatientRepository;
  private auditRepo: AuditRepository;

  constructor(db: Db) {
    this.rxRepo = new PrescriptionRepository(db);
    this.patientRepo = new PatientRepository(db);
    this.auditRepo = new AuditRepository(db);
  }

  async createPrescription(
    hospitalId: string,
    patientId: string,
    items: PrescriptionItemModel[],
    sourceCaptureId: string | undefined,
    doctorUserId: string,
    requestId: string,
  ) {
    const patient = await this.patientRepo.findById(hospitalId, patientId);
    if (!patient) {
      throw new NotFoundError('Patient not found');
    }

    const prescriptionId = randomUUID();
    const initialRevisionId = randomUUID();

    const initialRevision: PrescriptionRevisionDocument = {
      _id: initialRevisionId,
      hospitalId,
      prescriptionId,
      revisionNumber: 1,
      supersedesRevisionId: null,
      items,
      sourceCaptureId: sourceCaptureId || null,
      changeReason: 'Initial prescription',
      createdBy: doctorUserId,
      createdAt: new Date(),
      version: 1,
    };

    const prescription: PrescriptionDocument = {
      _id: prescriptionId,
      hospitalId,
      patientId,
      prescriberUserId: doctorUserId,
      workflowType: 'OUTPATIENT',
      currentRevisionId: initialRevisionId,
      status: 'ACTIVE',
      createdAt: new Date(),
      updatedAt: new Date(),
      version: 1,
    };

    await this.rxRepo.createPrescription(prescription, initialRevision);

    await this.auditRepo.append({
      _id: randomUUID(),
      hospitalId,
      actorUserId: doctorUserId,
      action: 'PRESCRIPTION_CREATED',
      resourceType: 'Prescription',
      resourceId: prescriptionId,
      timestamp: new Date(),
      requestId,
      beforeVersion: 0,
      afterVersion: 1,
    });

    return formatPrescription(prescription, initialRevision);
  }

  async getPrescription(hospitalId: string, id: string) {
    const rx = await this.rxRepo.findById(hospitalId, id);
    if (!rx) {
      throw new NotFoundError('Prescription not found');
    }
    const currentRev = await this.rxRepo.getRevisionById(hospitalId, rx.currentRevisionId);
    return formatPrescription(rx, currentRev || undefined);
  }

  async listPrescriptions(
    hospitalId: string,
    filter: { patientId?: string; status?: string; cursor?: string; limit: number },
  ) {
    const list = await this.rxRepo.list(hospitalId, filter);
    return list.map((rx) => formatPrescription(rx));
  }

  async listRevisions(hospitalId: string, prescriptionId: string) {
    const rx = await this.rxRepo.findById(hospitalId, prescriptionId);
    if (!rx) {
      throw new NotFoundError('Prescription not found');
    }
    const revisions = await this.rxRepo.listRevisions(hospitalId, prescriptionId);
    return revisions.map(formatRevision);
  }

  async createRevision(
    hospitalId: string,
    prescriptionId: string,
    expectedVersion: number,
    items: PrescriptionItemModel[],
    changeReason: string,
    doctorUserId: string,
    requestId: string,
  ) {
    const rx = await this.rxRepo.findById(hospitalId, prescriptionId);
    if (!rx) {
      throw new NotFoundError('Prescription not found');
    }

    if (rx.version !== expectedVersion) {
      throw new ConflictError('This record changed. Reload and review the latest version.');
    }

    const currentRev = await this.rxRepo.getRevisionById(hospitalId, rx.currentRevisionId);
    const nextRevisionNumber = currentRev ? currentRev.revisionNumber + 1 : 2;
    const newRevisionId = randomUUID();

    const newRevision: PrescriptionRevisionDocument = {
      _id: newRevisionId,
      hospitalId,
      prescriptionId,
      revisionNumber: nextRevisionNumber,
      supersedesRevisionId: rx.currentRevisionId,
      items,
      changeReason,
      createdBy: doctorUserId,
      createdAt: new Date(),
      version: 1,
    };

    const result = await this.rxRepo.createRevision(
      hospitalId,
      prescriptionId,
      expectedVersion,
      newRevision,
    );

    if (!result) {
      throw new ConflictError('This record changed. Reload and review the latest version.');
    }

    await this.auditRepo.append({
      _id: randomUUID(),
      hospitalId,
      actorUserId: doctorUserId,
      action: 'PRESCRIPTION_REVISED',
      resourceType: 'PrescriptionRevision',
      resourceId: newRevisionId,
      timestamp: new Date(),
      requestId,
      beforeVersion: expectedVersion,
      afterVersion: result.prescription.version,
      reason: changeReason,
    });

    return formatPrescription(result.prescription, result.revision);
  }
}

function formatPrescription(rx: PrescriptionDocument, revision?: PrescriptionRevisionDocument) {
  return {
    id: rx._id,
    _id: rx._id,
    hospitalId: rx.hospitalId,
    patientId: rx.patientId,
    prescriberUserId: rx.prescriberUserId,
    workflowType: rx.workflowType,
    currentRevisionId: rx.currentRevisionId,
    status: rx.status,
    version: rx.version,
    createdAt: rx.createdAt.toISOString(),
    updatedAt: rx.updatedAt.toISOString(),
    currentRevision: revision ? formatRevision(revision) : undefined,
  };
}

function formatRevision(rev: PrescriptionRevisionDocument) {
  return {
    id: rev._id,
    _id: rev._id,
    prescriptionId: rev.prescriptionId,
    revisionNumber: rev.revisionNumber,
    supersedesRevisionId: rev.supersedesRevisionId || null,
    items: rev.items,
    sourceCaptureId: rev.sourceCaptureId || null,
    changeReason: rev.changeReason || null,
    createdBy: rev.createdBy,
    createdAt: rev.createdAt.toISOString(),
    version: rev.version,
  };
}
