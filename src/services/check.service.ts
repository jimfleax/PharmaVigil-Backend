import { randomUUID } from 'node:crypto';
import type { Db } from 'mongodb';
import { CheckRepository } from '../repositories/check.repository.js';
import { PrescriptionRepository } from '../repositories/prescription.repository.js';
import { AllergyRepository } from '../repositories/allergy.repository.js';
import { MedicationHistoryRepository } from '../repositories/medication-history.repository.js';
import { AlertRepository } from '../repositories/alert.repository.js';
import { AuditRepository } from '../repositories/audit.repository.js';
import { evaluateClinicalRules } from '../domain/rule-engine/evaluator.js';
import { SEEDED_ILLUSTRATIVE_RULESET } from '../fixtures/seed-catalogue-rules.js';
import { NotFoundError } from '../middleware/error-handler.js';
import type {
  CheckRunDocument,
  AlertDocument,
} from '../types/index.js';
import type {
  PrescribedSubjectItem,
  ActiveMedicationEntry,
  AllergyEntry,
  AdverseReactionEntry,
  ClinicalContextRequirement,
} from '../domain/rule-engine/types.js';

export class CheckService {
  private checkRepo: CheckRepository;
  private rxRepo: PrescriptionRepository;
  private allergyRepo: AllergyRepository;
  private medHistoryRepo: MedicationHistoryRepository;
  private alertRepo: AlertRepository;
  private auditRepo: AuditRepository;

  constructor(db: Db) {
    this.checkRepo = new CheckRepository(db);
    this.rxRepo = new PrescriptionRepository(db);
    this.allergyRepo = new AllergyRepository(db);
    this.medHistoryRepo = new MedicationHistoryRepository(db);
    this.alertRepo = new AlertRepository(db);
    this.auditRepo = new AuditRepository(db);
  }

  async runCheck(
    hospitalId: string,
    subjectType: 'PRESCRIPTION_REVISION' | 'MEDICATION_ORDER_VERSION',
    subjectId: string,
    subjectVersion: number,
    actorUserId: string,
    requestId: string,
  ) {
    let patientId = '';
    let subjectItems: PrescribedSubjectItem[] = [];

    if (subjectType === 'PRESCRIPTION_REVISION') {
      const revision = await this.rxRepo.getRevisionById(hospitalId, subjectId);
      if (!revision) {
        throw new NotFoundError('Prescription revision not found');
      }
      const prescription = await this.rxRepo.findById(hospitalId, revision.prescriptionId);
      if (!prescription) {
        throw new NotFoundError('Prescription not found');
      }
      patientId = prescription.patientId;

      subjectItems = revision.items.map((item, idx) => ({
        itemId: `item-${idx + 1}`,
        catalogueId: item.catalogueItemId || undefined,
        canonicalIngredientIds: item.canonicalIngredientIds || [],
        matchStatus: item.matchStatus,
        brandText: item.brandText || undefined,
        strength:
          item.strengthValue && item.strengthUnit
            ? { value: item.strengthValue, unit: item.strengthUnit }
            : undefined,
        dosageForm: item.dosageForm || undefined,
      }));
    } else {
      throw new NotFoundError(`Unsupported subjectType: ${subjectType}`);
    }

    // Pull patient allergies & active medication history
    const patientAllergiesList = await this.allergyRepo.listByPatient(hospitalId, patientId);
    const patientMedsList = await this.medHistoryRepo.listByPatient(hospitalId, patientId);

    const activeMedications: ActiveMedicationEntry[] = patientMedsList
      .filter((m) => m.status === 'ACTIVE')
      .map((m) => ({
        entryId: m._id,
        canonicalIngredientIds: m.canonicalIngredientIds || [],
        status: m.status,
        verificationStatus: m.verificationStatus,
      }));

    const patientAllergies: AllergyEntry[] = patientAllergiesList
      .filter((a) => a.recordType === 'ALLERGY')
      .map((a) => ({
        allergyId: a._id,
        canonicalIngredientId: a.canonicalIngredientId || undefined,
        substanceText: a.substanceText,
        recordType: a.recordType,
        verificationStatus: a.verificationStatus,
      }));

    const patientAdverseReactions: AdverseReactionEntry[] = patientAllergiesList
      .filter((a) => a.recordType === 'ADVERSE_REACTION')
      .map((a) => ({
        reactionId: a._id,
        canonicalIngredientId: a.canonicalIngredientId || undefined,
        substanceText: a.substanceText,
        reactionDescription: a.reactionDescription,
        severity: a.severity,
        verificationStatus: a.verificationStatus,
      }));

    const contextFlags = new Set<ClinicalContextRequirement>([
      'MEDICATION_HISTORY_CONFIRMED',
      'PATIENT_ALLERGY_PROFILE_RECORDED',
      'DIETARY_HABITS_RECORDED',
      'DIETARY_POTASSIUM_ASSESSED',
    ]);

    // Pure deterministic rule engine call
    const engineOutput = evaluateClinicalRules({
      subjectType,
      subjectId,
      subjectVersion,
      subjectItems,
      activeMedications,
      patientAllergies,
      patientAdverseReactions,
      clinicalContext: {
        recordedContextFlags: contextFlags,
      },
      ruleSet: SEEDED_ILLUSTRATIVE_RULESET,
    });

    const checkRunId = randomUUID();
    const alertDocs: AlertDocument[] = [];

    if (engineOutput.alerts.length > 0) {
      for (const alert of engineOutput.alerts) {
        alertDocs.push({
          _id: randomUUID(),
          hospitalId,
          patientId,
          checkId: checkRunId,
          subjectType,
          subjectId,
          subjectVersion,
          ruleId: alert.ruleId,
          ruleVersion: alert.ruleVersion,
          category: alert.category,
          severity: alert.severity,
          status: 'OPEN',
          rationale: alert.rationale,
          recommendedNextAction: alert.recommendedNextAction,
          limitations: alert.limitations,
          evidenceReferences: alert.evidenceReferences,
          assignedDoctorId: null,
          createdAt: new Date(),
          updatedAt: new Date(),
          version: 1,
        });
      }

      await this.alertRepo.createMany(alertDocs);

      // Transition prescription to DOCTOR_REVIEW_REQUIRED
      if (subjectType === 'PRESCRIPTION_REVISION') {
        const rev = await this.rxRepo.getRevisionById(hospitalId, subjectId);
        if (rev) {
          await this.rxRepo.updateStatusWithoutVersion(
            hospitalId,
            rev.prescriptionId,
            'DOCTOR_REVIEW_REQUIRED',
          );
        }
      }
    }

    const checkRun: CheckRunDocument = {
      _id: checkRunId,
      hospitalId,
      patientId,
      subjectType,
      subjectId,
      subjectVersion,
      ruleSetId: SEEDED_ILLUSTRATIVE_RULESET.ruleSetId,
      ruleSetVersion: engineOutput.ruleSetVersion,
      outcome: engineOutput.outcome,
      coverageByCategory: engineOutput.coverageByCategory,
      alertIds: alertDocs.map((a) => a._id),
      limitations: engineOutput.limitations,
      requestId,
      createdBy: actorUserId,
      createdAt: new Date(),
    };

    await this.checkRepo.createCheckRun(checkRun);

    await this.auditRepo.append({
      _id: randomUUID(),
      hospitalId,
      actorUserId,
      action: 'CLINICAL_CHECK_RUN',
      resourceType: 'CheckRun',
      resourceId: checkRunId,
      timestamp: new Date(),
      requestId,
      metadata: {
        outcome: engineOutput.outcome,
        alertsCount: alertDocs.length,
      },
    });

    return formatCheckEnvelope(checkRun, alertDocs);
  }

  async getCheck(hospitalId: string, id: string) {
    const check = await this.checkRepo.findById(hospitalId, id);
    if (!check) {
      throw new NotFoundError('Clinical check run not found');
    }
    const alerts = await this.alertRepo.findByCheckId(hospitalId, id);
    return formatCheckEnvelope(check, alerts);
  }

  async retryCheck(hospitalId: string, priorCheckId: string, actorUserId: string, requestId: string) {
    const prior = await this.checkRepo.findById(hospitalId, priorCheckId);
    if (!prior) {
      throw new NotFoundError('Prior check run not found');
    }
    return this.runCheck(
      hospitalId,
      prior.subjectType,
      prior.subjectId,
      prior.subjectVersion,
      actorUserId,
      requestId,
    );
  }
}

function formatCheckEnvelope(check: CheckRunDocument, alerts: AlertDocument[]) {
  return {
    id: check._id,
    _id: check._id,
    outcome: check.outcome,
    ruleSetVersion: check.ruleSetVersion,
    coverageByCategory: check.coverageByCategory,
    alerts: alerts.map((a) => ({
      id: a._id,
      _id: a._id,
      ruleId: a.ruleId,
      ruleVersion: a.ruleVersion,
      severity: a.severity,
      status: a.status,
      rationale: a.rationale,
      limitations: a.limitations,
      evidenceReferences: a.evidenceReferences,
      category: a.category,
      version: a.version,
    })),
    limitations: check.limitations,
    subjectId: check.subjectId,
    subjectVersion: check.subjectVersion,
    requestId: check.requestId,
    createdAt: check.createdAt.toISOString(),
  };
}
