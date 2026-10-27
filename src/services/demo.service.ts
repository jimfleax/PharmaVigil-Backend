import { randomUUID } from 'node:crypto';
import type { Db } from 'mongodb';
import { env } from '../config/env.js';
import { HospitalRepository } from '../repositories/hospital.repository.js';
import { AuditRepository } from '../repositories/audit.repository.js';
import { ForbiddenError, ValidationError } from '../middleware/error-handler.js';
import {
  SYNTHETIC_CATALOGUE_ITEMS,
  SEEDED_ILLUSTRATIVE_RULESET,
} from '../fixtures/seed-catalogue-rules.js';
import { hashConfirmationPhrase } from '../domain/auth/index.js';
import type { MedicationCatalogItem } from '../domain/medicine-matching/types.js';
import type { ClinicalRuleSet } from '../domain/rule-engine/types.js';
import type {
  PatientRecordDocument,
  PatientAllergyDocument,
  PatientMedicationHistoryDocument,
} from '../types/index.js';

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
      'notifications',
      'medication_orders',
      'medication_order_versions',
      'appointments',
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

  async seedWorkspace(
    hospitalId: string,
    workspaceId: string,
    confirmation: string,
    actorUserId: string,
    requestId: string,
  ) {
    if (confirmation !== 'SEED_SYNTHETIC_DEMO') {
      throw new ValidationError('Confirmation must be SEED_SYNTHETIC_DEMO');
    }

    const hospital = await this.hospitalRepo.findById(hospitalId);
    if (!hospital) {
      throw new ForbiddenError('Hospital not found');
    }

    if (
      !hospital.isDemoWorkspace ||
      hospital._id !== env.DEMO_WORKSPACE_ID ||
      workspaceId !== env.DEMO_WORKSPACE_ID
    ) {
      throw new ForbiddenError(
        'Seed rejected: Target is not a designated synthetic demo workspace',
      );
    }

    // 1. Seed Synthetic Catalogue Items
    const catalogueColl = this.db.collection<MedicationCatalogItem>('medication_catalog');
    for (const item of SYNTHETIC_CATALOGUE_ITEMS) {
      await catalogueColl.updateOne(
        { _id: item._id },
        { $set: item },
        { upsert: true },
      );
    }

    const legacyColl = this.db.collection<MedicationCatalogItem>('medication_catalogue');
    for (const item of SYNTHETIC_CATALOGUE_ITEMS) {
      await legacyColl.updateOne(
        { _id: item._id },
        { $set: item },
        { upsert: true },
      );
    }

    // 2. Seed Illustrative Ruleset
    const rulesColl = this.db.collection<ClinicalRuleSet>('rule_sets');
    await rulesColl.updateOne(
      { ruleSetId: SEEDED_ILLUSTRATIVE_RULESET.ruleSetId, version: SEEDED_ILLUSTRATIVE_RULESET.version },
      { $set: SEEDED_ILLUSTRATIVE_RULESET },
      { upsert: true },
    );

    // 3. Seed Demo Patients and Baseline Clinical Fixtures
    const now = new Date();
    const demoPatients: PatientRecordDocument[] = [
      {
        _id: 'pat_rec_donna_001',
        hospitalId,
        syntheticHospitalPatientId: 'PAT-DEMO-001',
        displayName: 'Donna Noble',
        linkedUserId: 'usr_patient_01',
        linkStatus: 'LINKED',
        confirmationPhraseHash: hashConfirmationPhrase('noble-tempest-42'),
        createdAt: now,
        updatedAt: now,
        version: 1,
      },
      {
        _id: 'pat_rec_rory_002',
        hospitalId,
        syntheticHospitalPatientId: 'PAT-DEMO-002',
        displayName: 'Rory Williams',
        linkStatus: 'UNLINKED',
        confirmationPhraseHash: hashConfirmationPhrase('centurion-auton-99'),
        createdAt: now,
        updatedAt: now,
        version: 1,
      },
    ];

    for (const patient of demoPatients) {
      await this.db.collection<PatientRecordDocument>('patient_records').updateOne(
        { _id: patient._id },
        { $set: patient },
        { upsert: true },
      );
    }

    const demoAllergies: PatientAllergyDocument[] = [
      {
        _id: 'alg_penicillin_001',
        hospitalId,
        patientId: 'pat_rec_donna_001',
        substanceText: 'Penicillin G',
        canonicalIngredientId: 'ing_penicillin',
        recordType: 'ALLERGY',
        severity: 'SEVERE',
        reactionDescription: 'Anaphylaxis',
        verificationStatus: 'CONFIRMED',
        sourceType: 'CLINICIAN_RECORDED',
        recordedBy: 'usr_doctor_01',
        recordedAt: now,
        version: 1,
      },
      {
        _id: 'alg_aspirin_002',
        hospitalId,
        patientId: 'pat_rec_rory_002',
        substanceText: 'Aspirin',
        canonicalIngredientId: 'ing_aspirin',
        recordType: 'ADVERSE_REACTION',
        severity: 'MODERATE',
        reactionDescription: 'Gastric distress',
        verificationStatus: 'REPORTED',
        sourceType: 'PATIENT_REPORTED',
        recordedBy: 'usr_patient_01',
        recordedAt: now,
        version: 1,
      },
    ];

    for (const allergy of demoAllergies) {
      await this.db.collection<PatientAllergyDocument>('patient_allergies').updateOne(
        { _id: allergy._id },
        { $set: allergy },
        { upsert: true },
      );
    }

    const demoMedHistory: PatientMedicationHistoryDocument[] = [
      {
        _id: 'med_hist_metformin_001',
        hospitalId,
        patientId: 'pat_rec_donna_001',
        sourceType: 'CLINICIAN_PRESCRIBED',
        medicineName: 'Metformin 500mg Oral Tablet',
        canonicalIngredientIds: ['ing_metformin'],
        dose: '500',
        unit: 'mg',
        route: 'ORAL',
        frequency: 'TWICE_DAILY',
        status: 'ACTIVE',
        verificationStatus: 'VERIFIED',
        recordedBy: 'usr_doctor_01',
        recordedAt: now,
        version: 1,
      },
    ];

    for (const med of demoMedHistory) {
      await this.db.collection<PatientMedicationHistoryDocument>('patient_medication_history').updateOne(
        { _id: med._id },
        { $set: med },
        { upsert: true },
      );
    }

    // 4. Append Audit Trail
    await this.auditRepo.append({
      _id: randomUUID(),
      hospitalId,
      actorUserId,
      action: 'DEMO_FIXTURES_SEEDED',
      resourceType: 'DemoWorkspace',
      resourceId: workspaceId,
      timestamp: new Date(),
      requestId,
      metadata: {
        catalogueCount: SYNTHETIC_CATALOGUE_ITEMS.length,
        ruleset: SEEDED_ILLUSTRATIVE_RULESET.ruleSetId,
      },
    });

    return {
      message: 'Synthetic demo fixtures successfully seeded.',
      workspaceId,
      seededAt: new Date().toISOString(),
    };
  }
}
