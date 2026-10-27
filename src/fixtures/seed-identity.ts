import type { Db } from 'mongodb';
import bcrypt from 'bcryptjs';
import { hashConfirmationPhrase } from '../domain/auth/index.js';
import type {
  HospitalDocument,
  UserDocument,
  MembershipDocument,
  PatientRecordDocument,
  PatientAllergyDocument,
  PatientMedicationHistoryDocument,
} from '../types/index.js';

export async function seedIdentityDatabase(db: Db): Promise<void> {
  // Clear identity & patient collections
  await db.collection('hospitals').deleteMany({});
  await db.collection('users').deleteMany({});
  await db.collection('memberships').deleteMany({});
  await db.collection('sessions').deleteMany({});
  await db.collection('patient_records').deleteMany({});
  await db.collection('patient_allergies').deleteMany({});
  await db.collection('patient_medication_history').deleteMany({});
  await db.collection('audit_events').deleteMany({});

  const now = new Date();
  const passwordHash = await bcrypt.hash('DemoPassword123!', 10);

  // 1. Seed Hospitals
  await db.collection<HospitalDocument>('hospitals').insertMany([
    {
      _id: 'hosp_demo_synthetic_01',
      name: 'VentureForge Demo General Hospital',
      slug: 'demo-hospital',
      status: 'ACTIVE',
      isDemoWorkspace: true,
      createdAt: now,
      updatedAt: now,
    },
    {
      _id: 'hosp_tenant_b_02',
      name: 'Metropolis Community Hospital (Tenant B)',
      slug: 'hospital-b',
      status: 'ACTIVE',
      isDemoWorkspace: false,
      createdAt: now,
      updatedAt: now,
    },
  ]);

  // 2. Seed Users
  await db.collection<UserDocument>('users').insertMany([
    {
      _id: 'usr_admin_01',
      emailNormalized: 'admin@demo-hospital.local',
      displayName: 'Dr. Arthur Pendelton',
      passwordHash,
      accountStatus: 'ACTIVE',
      createdAt: now,
      updatedAt: now,
    },
    {
      _id: 'usr_doctor_01',
      emailNormalized: 'doctor@demo-hospital.local',
      displayName: 'Dr. Clara Oswald',
      passwordHash,
      accountStatus: 'ACTIVE',
      createdAt: now,
      updatedAt: now,
    },
    {
      _id: 'usr_pharmacist_01',
      emailNormalized: 'pharmacist@demo-hospital.local',
      displayName: 'Sarah Jane Smith (RPh)',
      passwordHash,
      accountStatus: 'ACTIVE',
      createdAt: now,
      updatedAt: now,
    },
    {
      _id: 'usr_patient_01',
      emailNormalized: 'patient@demo-hospital.local',
      displayName: 'Donna Noble',
      passwordHash,
      accountStatus: 'ACTIVE',
      createdAt: now,
      updatedAt: now,
    },
    {
      _id: 'usr_pending_doctor_01',
      emailNormalized: 'pending.doctor@demo-hospital.local',
      displayName: 'Dr. Martha Jones (Pending)',
      passwordHash,
      accountStatus: 'ACTIVE',
      createdAt: now,
      updatedAt: now,
    },
    {
      _id: 'usr_suspended_pharma_01',
      emailNormalized: 'suspended.pharma@demo-hospital.local',
      displayName: 'Jack Harkness (Suspended)',
      passwordHash,
      accountStatus: 'ACTIVE',
      createdAt: now,
      updatedAt: now,
    },
    {
      _id: 'usr_doctor_tenant_b',
      emailNormalized: 'doctor@hospital-b.local',
      displayName: 'Dr. John Watson (Tenant B)',
      passwordHash,
      accountStatus: 'ACTIVE',
      createdAt: now,
      updatedAt: now,
    },
  ]);

  // 3. Seed Memberships
  await db.collection<MembershipDocument>('memberships').insertMany([
    {
      _id: 'mem_admin_01',
      hospitalId: 'hosp_demo_synthetic_01',
      userId: 'usr_admin_01',
      requestedRole: 'HOSPITAL_ADMIN',
      assignedRole: 'HOSPITAL_ADMIN',
      status: 'ACTIVE',
      requestedAt: now,
      reviewedAt: now,
      reviewedBy: 'usr_admin_01',
      version: 1,
    },
    {
      _id: 'mem_doctor_01',
      hospitalId: 'hosp_demo_synthetic_01',
      userId: 'usr_doctor_01',
      requestedRole: 'DOCTOR',
      assignedRole: 'DOCTOR',
      status: 'ACTIVE',
      requestedAt: now,
      reviewedAt: now,
      reviewedBy: 'usr_admin_01',
      version: 1,
    },
    {
      _id: 'mem_pharmacist_01',
      hospitalId: 'hosp_demo_synthetic_01',
      userId: 'usr_pharmacist_01',
      requestedRole: 'PHARMACIST',
      assignedRole: 'PHARMACIST',
      status: 'ACTIVE',
      requestedAt: now,
      reviewedAt: now,
      reviewedBy: 'usr_admin_01',
      version: 1,
    },
    {
      _id: 'mem_patient_01',
      hospitalId: 'hosp_demo_synthetic_01',
      userId: 'usr_patient_01',
      requestedRole: 'PATIENT',
      assignedRole: 'PATIENT',
      status: 'ACTIVE',
      requestedAt: now,
      reviewedAt: now,
      reviewedBy: 'usr_admin_01',
      version: 1,
    },
    {
      _id: 'mem_pending_doctor_01',
      hospitalId: 'hosp_demo_synthetic_01',
      userId: 'usr_pending_doctor_01',
      requestedRole: 'DOCTOR',
      status: 'PENDING',
      requestedAt: now,
      version: 1,
    },
    {
      _id: 'mem_suspended_pharma_01',
      hospitalId: 'hosp_demo_synthetic_01',
      userId: 'usr_suspended_pharma_01',
      requestedRole: 'PHARMACIST',
      assignedRole: 'PHARMACIST',
      status: 'SUSPENDED',
      reason: 'License verification pending',
      requestedAt: now,
      version: 2,
    },
    {
      _id: 'mem_doctor_tenant_b',
      hospitalId: 'hosp_tenant_b_02',
      userId: 'usr_doctor_tenant_b',
      requestedRole: 'DOCTOR',
      assignedRole: 'DOCTOR',
      status: 'ACTIVE',
      requestedAt: now,
      version: 1,
    },
  ]);

  // 4. Seed Patients
  await db.collection<PatientRecordDocument>('patient_records').insertMany([
    {
      _id: 'pat_rec_donna_001',
      hospitalId: 'hosp_demo_synthetic_01',
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
      hospitalId: 'hosp_demo_synthetic_01',
      syntheticHospitalPatientId: 'PAT-DEMO-002',
      displayName: 'Rory Williams',
      linkStatus: 'UNLINKED',
      confirmationPhraseHash: hashConfirmationPhrase('centurion-auton-99'),
      createdAt: now,
      updatedAt: now,
      version: 1,
    },
    {
      _id: 'pat_rec_tenant_b_001',
      hospitalId: 'hosp_tenant_b_02',
      syntheticHospitalPatientId: 'PAT-HOSPB-001',
      displayName: 'Mickey Smith',
      linkStatus: 'UNLINKED',
      createdAt: now,
      updatedAt: now,
      version: 1,
    },
  ]);

  // 5. Seed Allergies
  await db.collection<PatientAllergyDocument>('patient_allergies').insertMany([
    {
      _id: 'alg_penicillin_001',
      hospitalId: 'hosp_demo_synthetic_01',
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
      hospitalId: 'hosp_demo_synthetic_01',
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
  ]);

  // 6. Seed Medication History
  await db.collection<PatientMedicationHistoryDocument>('patient_medication_history').insertMany([
    {
      _id: 'med_hist_metformin_001',
      hospitalId: 'hosp_demo_synthetic_01',
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
  ]);
}
