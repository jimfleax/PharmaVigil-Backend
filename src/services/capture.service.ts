import { randomUUID } from 'node:crypto';
import type { Db } from 'mongodb';
import { CaptureRepository } from '../repositories/capture.repository.js';
import { PatientRepository } from '../repositories/patient.repository.js';
import { AuditRepository } from '../repositories/audit.repository.js';
import { NotFoundError, ValidationError, ConflictError } from '../middleware/error-handler.js';
import type {
  CaptureMode,
  CaptureStatus,
  PrescriptionCaptureDocument,
  PrescriptionItemModel,
} from '../types/index.js';

export class CaptureService {
  private captureRepo: CaptureRepository;
  private patientRepo: PatientRepository;
  private auditRepo: AuditRepository;

  constructor(db: Db) {
    this.captureRepo = new CaptureRepository(db);
    this.patientRepo = new PatientRepository(db);
    this.auditRepo = new AuditRepository(db);
  }

  async createCapture(
    hospitalId: string,
    patientId: string,
    captureMode: CaptureMode,
    ocrLanguage: string,
    extractedText: string,
    actorUserId: string,
    requestId: string,
  ) {
    const patient = await this.patientRepo.findById(hospitalId, patientId);
    if (!patient) {
      throw new NotFoundError('Patient not found');
    }

    const captureId = randomUUID();
    let initialStatus: CaptureStatus = 'UPLOADED';
    if (captureMode === 'MANUAL_ENTRY') {
      initialStatus = 'MANUAL_ENTRY';
    } else if (extractedText && extractedText.trim().length > 0) {
      initialStatus = 'OCR_COMPLETE';
    }

    const capture: PrescriptionCaptureDocument = {
      _id: captureId,
      hospitalId,
      patientId,
      captureMode,
      ocrLanguage,
      extractedText,
      ocrConfidence: captureMode === 'BROWSER_OCR' ? 0.85 : null,
      items: [],
      status: initialStatus,
      createdBy: actorUserId,
      createdAt: new Date(),
      updatedAt: new Date(),
      version: 1,
    };

    await this.captureRepo.create(capture);

    await this.auditRepo.append({
      _id: randomUUID(),
      hospitalId,
      actorUserId,
      action: 'PRESCRIPTION_CAPTURE_CREATED',
      resourceType: 'PrescriptionCapture',
      resourceId: captureId,
      timestamp: new Date(),
      requestId,
      beforeVersion: 0,
      afterVersion: 1,
    });

    return formatCapture(capture);
  }

  async getCapture(hospitalId: string, captureId: string) {
    const capture = await this.captureRepo.findById(hospitalId, captureId);
    if (!capture) {
      throw new NotFoundError('Prescription capture not found');
    }
    return formatCapture(capture);
  }

  async updateCapture(
    hospitalId: string,
    captureId: string,
    expectedVersion: number,
    updates: { extractedText?: string | undefined; items?: PrescriptionItemModel[] | undefined },
    actorUserId: string,
    requestId: string,
  ) {
    const existing = await this.captureRepo.findById(hospitalId, captureId);
    if (!existing) {
      throw new NotFoundError('Prescription capture not found');
    }

    if (existing.status === 'CONFIRMED') {
      throw new ConflictError('Confirmed captures cannot be modified');
    }

    const updated = await this.captureRepo.updateDraft(hospitalId, captureId, expectedVersion, {
      ...(updates.extractedText !== undefined ? { extractedText: updates.extractedText } : {}),
      ...(updates.items !== undefined ? { items: updates.items } : {}),
      status: 'OCR_COMPLETE',
    });

    if (!updated) {
      throw new ConflictError('This record changed. Reload and review the latest version.');
    }

    await this.auditRepo.append({
      _id: randomUUID(),
      hospitalId,
      actorUserId,
      action: 'PRESCRIPTION_CAPTURE_UPDATED',
      resourceType: 'PrescriptionCapture',
      resourceId: captureId,
      timestamp: new Date(),
      requestId,
      beforeVersion: expectedVersion,
      afterVersion: updated.version,
    });

    return formatCapture(updated);
  }

  async confirmCapture(
    hospitalId: string,
    captureId: string,
    expectedVersion: number,
    patientConfirmed: boolean,
    items: PrescriptionItemModel[],
    actorUserId: string,
    requestId: string,
  ) {
    if (!patientConfirmed) {
      throw new ValidationError('Patient identity confirmation is mandatory');
    }

    const existing = await this.captureRepo.findById(hospitalId, captureId);
    if (!existing) {
      throw new NotFoundError('Prescription capture not found');
    }

    if (existing.status === 'CONFIRMED') {
      throw new ConflictError('Capture is already confirmed');
    }

    // TEST-OCR-001 Invariant: Every item MUST have matchStatus === 'CONFIRMED'
    const unresolvedItems = items.filter((item) => item.matchStatus !== 'CONFIRMED');
    if (unresolvedItems.length > 0) {
      throw new ValidationError(
        'All prescription items must be CONFIRMED before capture confirmation. Unresolved, ambiguous, or unsupported items cannot be confirmed.',
        [
          {
            field: 'items',
            code: 'UNRESOLVED_ITEM_MATCH',
            message: `Found ${unresolvedItems.length} unconfirmed item(s). Pharmacist resolution is required.`,
          },
        ],
      );
    }

    const confirmed = await this.captureRepo.confirmCapture(
      hospitalId,
      captureId,
      expectedVersion,
      items,
    );

    if (!confirmed) {
      throw new ConflictError('This record changed. Reload and review the latest version.');
    }

    await this.auditRepo.append({
      _id: randomUUID(),
      hospitalId,
      actorUserId,
      action: 'PRESCRIPTION_CAPTURE_CONFIRMED',
      resourceType: 'PrescriptionCapture',
      resourceId: captureId,
      timestamp: new Date(),
      requestId,
      beforeVersion: expectedVersion,
      afterVersion: confirmed.version,
    });

    return formatCapture(confirmed);
  }
}

function formatCapture(doc: PrescriptionCaptureDocument) {
  return {
    id: doc._id,
    _id: doc._id,
    hospitalId: doc.hospitalId,
    patientId: doc.patientId,
    captureMode: doc.captureMode,
    ocrLanguage: doc.ocrLanguage,
    extractedText: doc.extractedText,
    ocrConfidence: doc.ocrConfidence ?? null,
    items: doc.items,
    status: doc.status,
    version: doc.version,
    createdAt: doc.createdAt.toISOString(),
    updatedAt: doc.updatedAt.toISOString(),
  };
}
