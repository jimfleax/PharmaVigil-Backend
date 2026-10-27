import { randomUUID } from 'node:crypto';
import type { Db } from 'mongodb';
import { PatientRepository } from '../repositories/patient.repository.js';
import { AllergyRepository } from '../repositories/allergy.repository.js';
import { MedicationHistoryRepository } from '../repositories/medication-history.repository.js';
import { PrescriptionRepository } from '../repositories/prescription.repository.js';
import { CatalogueRepository } from '../repositories/catalogue.repository.js';
import { AuditRepository } from '../repositories/audit.repository.js';
import { hashConfirmationPhrase } from '../domain/auth/index.js';
import { normalizeMedicineInput } from '../domain/medicine-matching/normalizer.js';
import { matchMedicineFromCatalogue } from '../domain/medicine-matching/matcher.js';
import { ConflictError, ForbiddenError, NotFoundError } from '../middleware/error-handler.js';
import type {
  ConfirmPatientLink,
  AddAllergyInput,
  AddMedicationHistoryInput,
} from '../schemas/patient.schemas.js';
import type {
  UserRole,
  AllergySourceType,
  AllergyVerificationStatus,
  PatientAllergyDocument,
  MedicationHistorySourceType,
  MedicationHistoryVerificationStatus,
  PatientMedicationHistoryDocument,
} from '../types/index.js';

export class PatientService {
  private patientRepo: PatientRepository;
  private allergyRepo: AllergyRepository;
  private medHistoryRepo: MedicationHistoryRepository;
  private rxRepo: PrescriptionRepository;
  private catalogueRepo: CatalogueRepository;
  private auditRepo: AuditRepository;

  constructor(db: Db) {
    this.patientRepo = new PatientRepository(db);
    this.allergyRepo = new AllergyRepository(db);
    this.medHistoryRepo = new MedicationHistoryRepository(db);
    this.rxRepo = new PrescriptionRepository(db);
    this.catalogueRepo = new CatalogueRepository(db);
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

  async getOwnPrescriptions(hospitalId: string, userId: string) {
    const patient = await this.patientRepo.findByLinkedUserId(hospitalId, userId);
    if (!patient) {
      throw new NotFoundError('No linked patient record found');
    }
    return this.rxRepo.list(hospitalId, { patientId: patient._id, limit: 100 });
  }

  async getOwnHistory(hospitalId: string, userId: string) {
    const patient = await this.patientRepo.findByLinkedUserId(hospitalId, userId);
    if (!patient) {
      throw new NotFoundError('No linked patient record found');
    }
    const [allergies, medications, pastPrescriptions] = await Promise.all([
      this.allergyRepo.listByPatient(hospitalId, patient._id),
      this.medHistoryRepo.listByPatient(hospitalId, patient._id),
      this.rxRepo.list(hospitalId, { patientId: patient._id, limit: 100 }),
    ]);

    return {
      patient: {
        id: patient._id,
        displayName: patient.displayName,
        syntheticHospitalPatientId: patient.syntheticHospitalPatientId,
      },
      allergies: allergies.map((a) => ({
        id: a._id,
        substanceText: a.substanceText,
        recordType: a.recordType,
        verificationStatus: a.verificationStatus,
        severity: a.severity,
      })),
      medications: medications.map((m) => ({
        id: m._id,
        medicineName: m.medicineName,
        status: m.status,
        verificationStatus: m.verificationStatus,
        sourceType: m.sourceType,
      })),
      pastPrescriptions: pastPrescriptions.map((rx) => ({
        id: rx._id,
        status: rx.status,
        createdAt: rx.createdAt,
      })),
    };
  }

  async addAllergy(
    hospitalId: string,
    patientId: string,
    actor: { userId: string; role: UserRole },
    input: AddAllergyInput,
    requestId: string,
  ): Promise<PatientAllergyDocument> {
    const patient = await this.patientRepo.findById(hospitalId, patientId);
    if (!patient) {
      throw new NotFoundError('Patient not found');
    }

    let sourceType: AllergySourceType;
    let verificationStatus: AllergyVerificationStatus;

    if (actor.role === 'PATIENT') {
      if (patient.linkedUserId !== actor.userId) {
        throw new ForbiddenError('Patients may only record allergies for their own linked profile');
      }
      sourceType = 'PATIENT_REPORTED';
      verificationStatus = 'REPORTED';
    } else {
      sourceType = input.sourceType || 'CLINICIAN_RECORDED';
      verificationStatus = input.verificationStatus || 'CONFIRMED';
    }

    let canonicalIngredientId = input.canonicalIngredientId;
    if (!canonicalIngredientId) {
      const parsed = normalizeMedicineInput(input.substanceText);
      const queryTerm = parsed.rawBrandQuery || input.substanceText;
      const candidates = await this.catalogueRepo.searchCatalogue(queryTerm);
      const match = matchMedicineFromCatalogue(parsed, candidates);
      if (match.matchStatus === 'CONFIRMED' && match.canonicalIngredientIds.length > 0) {
        canonicalIngredientId = match.canonicalIngredientIds[0];
      }
    }

    const allergyDoc: PatientAllergyDocument = {
      _id: randomUUID(),
      hospitalId,
      patientId,
      substanceText: input.substanceText,
      canonicalIngredientId: canonicalIngredientId || undefined,
      recordType: input.recordType,
      reactionDescription: input.reactionDescription || undefined,
      severity: input.severity,
      sourceType,
      verificationStatus,
      recordedBy: actor.userId,
      recordedAt: new Date(),
      version: 1,
    };

    const created = await this.allergyRepo.create(allergyDoc);

    await this.auditRepo.append({
      _id: randomUUID(),
      hospitalId,
      actorUserId: actor.userId,
      action: 'ALLERGY_RECORDED',
      resourceType: 'PatientRecord',
      resourceId: created._id,
      timestamp: new Date(),
      requestId,
      metadata: {
        patientId,
        substanceText: input.substanceText,
        canonicalIngredientId,
        verificationStatus,
        sourceType,
      },
    });

    return created;
  }

  async addMedicationHistory(
    hospitalId: string,
    patientId: string,
    actor: { userId: string; role: UserRole },
    input: AddMedicationHistoryInput,
    requestId: string,
  ): Promise<PatientMedicationHistoryDocument> {
    const patient = await this.patientRepo.findById(hospitalId, patientId);
    if (!patient) {
      throw new NotFoundError('Patient not found');
    }

    let sourceType: MedicationHistorySourceType;
    let verificationStatus: MedicationHistoryVerificationStatus;

    if (actor.role === 'PATIENT') {
      if (patient.linkedUserId !== actor.userId) {
        throw new ForbiddenError(
          'Patients may only record medication history for their own linked profile',
        );
      }
      sourceType = 'PATIENT_REPORTED';
      verificationStatus = 'REPORTED';
    } else {
      sourceType = input.sourceType || 'CLINICIAN_PRESCRIBED';
      verificationStatus = input.verificationStatus || 'VERIFIED';
    }

    let canonicalIngredientIds = input.canonicalIngredientIds
      ? [...input.canonicalIngredientIds]
      : [];
    let catalogueItemId = input.catalogueItemId;

    if (canonicalIngredientIds.length === 0) {
      if (catalogueItemId) {
        const catItem = await this.catalogueRepo.findById(catalogueItemId);
        if (catItem && catItem.canonicalIngredientIds) {
          canonicalIngredientIds = [...catItem.canonicalIngredientIds];
        }
      }
      if (canonicalIngredientIds.length === 0) {
        const parsed = normalizeMedicineInput(input.medicineName);
        const queryTerm = parsed.rawBrandQuery || input.medicineName;
        const candidates = await this.catalogueRepo.searchCatalogue(queryTerm);
        const match = matchMedicineFromCatalogue(parsed, candidates);
        if (match.matchStatus === 'CONFIRMED') {
          canonicalIngredientIds = [...match.canonicalIngredientIds];
          if (match.selectedCandidate && !catalogueItemId) {
            catalogueItemId = match.selectedCandidate._id;
          }
        }
      }
    }

    const medHistoryDoc: PatientMedicationHistoryDocument = {
      _id: randomUUID(),
      hospitalId,
      patientId,
      sourceType,
      catalogueItemId: catalogueItemId || undefined,
      canonicalIngredientIds,
      medicineName: input.medicineName,
      dose: input.dose,
      unit: input.unit,
      route: input.route,
      frequency: input.frequency,
      startDate: input.startDate || undefined,
      endDate: input.endDate || undefined,
      status: input.status,
      verificationStatus,
      recordedBy: actor.userId,
      recordedAt: new Date(),
      version: 1,
    };

    const created = await this.medHistoryRepo.create(medHistoryDoc);

    await this.auditRepo.append({
      _id: randomUUID(),
      hospitalId,
      actorUserId: actor.userId,
      action: 'MEDICATION_HISTORY_RECORDED',
      resourceType: 'PatientRecord',
      resourceId: created._id,
      timestamp: new Date(),
      requestId,
      metadata: {
        patientId,
        medicineName: input.medicineName,
        canonicalIngredientIds,
        verificationStatus,
        sourceType,
      },
    });

    return created;
  }
}
