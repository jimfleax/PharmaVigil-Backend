import { randomUUID } from 'node:crypto';
import type { Db } from 'mongodb';
import { PatientRepository } from '../repositories/patient.repository.js';
import { AllergyRepository } from '../repositories/allergy.repository.js';
import { MedicationHistoryRepository } from '../repositories/medication-history.repository.js';
import { AuditRepository } from '../repositories/audit.repository.js';
import { hashConfirmationPhrase } from '../domain/auth/index.js';
import {
  ConflictError,
  NotFoundError,
} from '../middleware/error-handler.js';
import type { ConfirmPatientLink } from '../schemas/patient.schemas.js';

export class PatientService {
  private patientRepo: PatientRepository;
  private allergyRepo: AllergyRepository;
  private medHistoryRepo: MedicationHistoryRepository;
  private auditRepo: AuditRepository;

  constructor(db: Db) {
    this.patientRepo = new PatientRepository(db);
    this.allergyRepo = new AllergyRepository(db);
    this.medHistoryRepo = new MedicationHistoryRepository(db);
    this.auditRepo = new AuditRepository(db);
  }

  async searchPatients(hospitalId: string, querySyntheticId: string) {
    return this.patientRepo.findBySyntheticId(hospitalId, querySyntheticId);
  }

  async getPatient(hospitalId: string, patientId: string) {
    const patient = await this.patientRepo.findById(hospitalId, patientId);
    if (!patient) {
      throw new NotFoundError('Patient not found');
    }
    return patient;
  }

  async confirmPatientLink(
    hospitalId: string,
    patientId: string,
    userId: string,
    input: ConfirmPatientLink,
    requestId: string,
  ) {
    const patient = await this.patientRepo.findById(hospitalId, patientId);
    if (!patient) {
      throw new NotFoundError('Patient not found');
    }

    if (patient.linkStatus === 'LINKED') {
      throw new ConflictError('Patient record is already linked');
    }

    const computedHash = hashConfirmationPhrase(input.confirmationPhrase);
    if (patient.confirmationPhraseHash && patient.confirmationPhraseHash !== computedHash) {
      throw new ConflictError('Invalid confirmation phrase');
    }

    const updated = await this.patientRepo.confirmLink(
      hospitalId,
      patientId,
      userId,
      patient.version,
    );
    if (!updated) {
      throw new ConflictError('Record version conflict');
    }

    await this.auditRepo.append({
      _id: randomUUID(),
      hospitalId,
      actorUserId: userId,
      action: 'PATIENT_LINK_CONFIRMED',
      resourceType: 'PatientRecord',
      resourceId: patientId,
      timestamp: new Date(),
      requestId,
      beforeVersion: patient.version,
      afterVersion: updated.version,
    });

    return updated;
  }

  async getOwnPatientSummary(hospitalId: string, userId: string) {
    const patient = await this.patientRepo.findByLinkedUserId(hospitalId, userId);
    if (!patient) {
      throw new NotFoundError('No linked patient record found');
    }
    return patient;
  }

  async getAllergies(hospitalId: string, patientId: string) {
    const patient = await this.patientRepo.findById(hospitalId, patientId);
    if (!patient) {
      throw new NotFoundError('Patient not found');
    }
    return this.allergyRepo.listByPatient(hospitalId, patientId);
  }

  async getMedicationHistory(hospitalId: string, patientId: string) {
    const patient = await this.patientRepo.findById(hospitalId, patientId);
    if (!patient) {
      throw new NotFoundError('Patient not found');
    }
    return this.medHistoryRepo.listByPatient(hospitalId, patientId);
  }
}
