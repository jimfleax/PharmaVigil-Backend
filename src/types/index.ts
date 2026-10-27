import type { Context } from 'hono';
import type { CoverageCategory, EvidenceReference } from '../domain/rule-engine/types.js';

export type UserRole = 'PATIENT' | 'DOCTOR' | 'PHARMACIST' | 'HOSPITAL_ADMIN';
export type MembershipStatus = 'PENDING' | 'ACTIVE' | 'REJECTED' | 'SUSPENDED' | 'REVOKED';
export type AccountStatus = 'ACTIVE' | 'DISABLED' | 'PENDING';

export interface AuthenticatedUser {
  userId: string;
  email: string;
  displayName: string;
  accountStatus: AccountStatus;
}

export interface ActiveMembership {
  membershipId: string;
  hospitalId: string;
  role: UserRole;
  status: MembershipStatus;
  version: number;
}

export interface AppVariables {
  requestId: string;
  user?: AuthenticatedUser | undefined;
  membership?: ActiveMembership | undefined;
}

export type AppContext = Context<{ Variables: AppVariables }>;

export interface ErrorDetail {
  field?: string | undefined;
  code?: string | undefined;
  message?: string | undefined;
}

export interface ErrorEnvelope {
  error: {
    code: string;
    message: string;
    requestId: string;
    details: ErrorDetail[];
  };
}

// Domain Model Documents
export interface HospitalDocument {
  _id: string;
  name: string;
  slug: string;
  status: 'ACTIVE' | 'SUSPENDED';
  isDemoWorkspace: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface UserDocument {
  _id: string;
  emailNormalized: string;
  displayName: string;
  passwordHash: string;
  accountStatus: AccountStatus;
  createdAt: Date;
  updatedAt: Date;
  lastLoginAt?: Date | undefined;
}

export interface MembershipDocument {
  _id: string;
  hospitalId: string;
  userId: string;
  requestedRole: UserRole;
  assignedRole?: UserRole | undefined;
  status: MembershipStatus;
  requestedAt: Date;
  reviewedAt?: Date | undefined;
  reviewedBy?: string | undefined;
  reason?: string | undefined;
  version: number;
}

export interface SessionDocument {
  _id: string;
  userId: string;
  secretVerifierHash: string;
  createdAt: Date;
  lastSeenAt: Date;
  idleExpiresAt: Date;
  absoluteExpiresAt: Date;
  revokedAt?: Date | undefined;
  revocationReason?: ('LOGOUT' | 'SECURITY_REVOCATION' | 'SUSPENDED_USER') | undefined;
  ipAddress?: string | undefined;
  userAgent?: string | undefined;
}

export type PatientLinkStatus = 'UNLINKED' | 'PENDING_CONFIRMATION' | 'LINKED' | 'REVIEW_REQUIRED';

export interface PatientRecordDocument {
  _id: string;
  hospitalId: string;
  syntheticHospitalPatientId: string;
  linkedUserId?: string | undefined;
  displayName: string;
  dateOfBirth?: string | undefined;
  gender?: ('MALE' | 'FEMALE' | 'OTHER' | 'UNKNOWN') | undefined;
  phoneNumberMasked?: string | undefined;
  confirmationPhraseHash?: string | undefined;
  linkStatus: PatientLinkStatus;
  createdAt: Date;
  updatedAt: Date;
  version: number;
}

export type AllergyRecordType = 'ALLERGY' | 'ADVERSE_REACTION';
export type AllergySeverity = 'UNKNOWN' | 'MILD' | 'MODERATE' | 'SEVERE';
export type AllergySourceType = 'CLINICIAN_RECORDED' | 'PATIENT_REPORTED';
export type AllergyVerificationStatus = 'CONFIRMED' | 'REPORTED' | 'UNVERIFIED';

export interface PatientAllergyDocument {
  _id: string;
  hospitalId: string;
  patientId: string;
  substanceText: string;
  canonicalIngredientId?: string | undefined;
  recordType: AllergyRecordType;
  reactionDescription?: string | undefined;
  severity: AllergySeverity;
  sourceType: AllergySourceType;
  verificationStatus: AllergyVerificationStatus;
  recordedBy: string;
  recordedAt: Date;
  version: number;
}

export type MedicationHistorySourceType = 'CLINICIAN_PRESCRIBED' | 'PATIENT_REPORTED' | 'IMPORTED_SYNTHETIC';
export type MedicationHistoryStatus = 'ACTIVE' | 'STOPPED' | 'UNKNOWN';
export type MedicationHistoryVerificationStatus = 'VERIFIED' | 'REPORTED' | 'UNVERIFIED';

export interface PatientMedicationHistoryDocument {
  _id: string;
  hospitalId: string;
  patientId: string;
  sourceType: MedicationHistorySourceType;
  catalogueItemId?: string | undefined;
  canonicalIngredientIds: string[];
  medicineName: string;
  dose: string;
  unit: string;
  route: string;
  frequency: string;
  startDate?: Date | undefined;
  endDate?: Date | undefined;
  status: MedicationHistoryStatus;
  verificationStatus: MedicationHistoryVerificationStatus;
  recordedBy: string;
  recordedAt: Date;
  version: number;
}

// Track 3 Workflow, Revisions, Checks, Alerts & Dispensing Documents

export type CaptureMode = 'BROWSER_OCR' | 'MANUAL_ENTRY' | 'SEEDED_IMAGE';
export type CaptureStatus = 'UPLOADED' | 'OCR_COMPLETE' | 'MANUAL_ENTRY' | 'CONFIRMED' | 'FAILED' | 'EXPIRED';

export interface PrescriptionItemModel {
  rawExtractedText: string;
  catalogueItemId?: string | null | undefined;
  canonicalIngredientIds: string[];
  brandText?: string | null | undefined;
  strengthValue?: number | null | undefined;
  strengthUnit?: string | null | undefined;
  dosageForm?: string | null | undefined;
  doseValue?: number | null | undefined;
  doseUnit?: string | null | undefined;
  route?: string | null | undefined;
  frequency?: string | null | undefined;
  durationValue?: number | null | undefined;
  durationUnit?: string | null | undefined;
  matchStatus: 'CONFIRMED' | 'AMBIGUOUS' | 'UNSUPPORTED' | 'UNRESOLVED';
  matchConfidence?: number | null | undefined;
}

export interface PrescriptionCaptureDocument {
  _id: string;
  hospitalId: string;
  patientId: string;
  captureMode: CaptureMode;
  ocrLanguage: string;
  extractedText: string;
  ocrConfidence?: number | null | undefined;
  items: PrescriptionItemModel[];
  status: CaptureStatus;
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
  version: number;
}

export type PrescriptionStatus =
  | 'ACTIVE'
  | 'DOCTOR_REVIEW_REQUIRED'
  | 'DISPENSED'
  | 'CANCELLED';

export interface PrescriptionDocument {
  _id: string;
  hospitalId: string;
  patientId: string;
  prescriberUserId: string;
  workflowType: 'OUTPATIENT';
  currentRevisionId: string;
  status: PrescriptionStatus;
  createdAt: Date;
  updatedAt: Date;
  version: number;
}

export interface PrescriptionRevisionDocument {
  _id: string;
  hospitalId: string;
  prescriptionId: string;
  revisionNumber: number;
  supersedesRevisionId?: string | null | undefined;
  items: PrescriptionItemModel[];
  sourceCaptureId?: string | null | undefined;
  changeReason?: string | null | undefined;
  createdBy: string;
  createdAt: Date;
  version: number;
}

export interface CheckRunDocument {
  _id: string;
  hospitalId: string;
  patientId: string;
  subjectType: 'PRESCRIPTION_REVISION' | 'MEDICATION_ORDER_VERSION';
  subjectId: string;
  subjectVersion: number;
  ruleSetId: string;
  ruleSetVersion: string;
  outcome: 'FLAGGED' | 'NO_MATCHING_RULE' | 'INCOMPLETE' | 'UNSUPPORTED' | 'FAILED';
  coverageByCategory: {
    drugDrug: CoverageCategory;
    foodDrink: CoverageCategory;
    allergy: CoverageCategory;
    adverseReaction: CoverageCategory;
  };
  alertIds: string[];
  limitations: string[];
  requestId: string;
  createdBy: string;
  createdAt: Date;
  failureCode?: string;
  failureMessage?: string;
}

export type AlertStatus =
  | 'OPEN'
  | 'ACKNOWLEDGED'
  | 'UNDER_REVIEW'
  | 'CHANGE_REQUIRED'
  | 'CLINICAL_DISPOSITION_RECORDED'
  | 'RESOLVED';

export type AlertSeverity = 'INFO' | 'LOW' | 'MODERATE' | 'HIGH' | 'CRITICAL';

export interface AlertDocument {
  _id: string;
  hospitalId: string;
  patientId: string;
  checkId: string;
  subjectType: 'PRESCRIPTION_REVISION' | 'MEDICATION_ORDER_VERSION';
  subjectId: string;
  subjectVersion: number;
  ruleId: string;
  ruleVersion: number;
  category: 'DRUG_DRUG' | 'FOOD_DRINK' | 'ALLERGY' | 'ADVERSE_REACTION';
  severity: AlertSeverity;
  status: AlertStatus;
  rationale: string;
  recommendedNextAction: string;
  limitations: string[];
  evidenceReferences: EvidenceReference[];
  assignedDoctorId?: string | null | undefined;
  createdAt: Date;
  updatedAt: Date;
  version: number;
}

export type DispositionType = 'CHANGE_REQUIRED' | 'CLINICALLY_REVIEWED' | 'OTHER_DOCUMENTED';

export interface AlertDispositionDocument {
  _id: string;
  hospitalId: string;
  alertId: string;
  doctorId: string;
  dispositionType: DispositionType;
  rationale: string;
  alertVersionAtDisposition: number;
  recordedAt: Date;
}

export interface DispensingAuthorizationDocument {
  _id: string;
  hospitalId: string;
  patientId: string;
  prescriptionId: string;
  prescriptionRevisionId: string;
  checkRunId: string;
  pharmacistId: string;
  authorizedAt: Date;
  acknowledgementText: string;
  version: number;
}

export interface IdempotencyRecordDocument {
  _id: string;
  hospitalId: string;
  actorUserId: string;
  operation: string;
  key: string;
  requestHash: string;
  responseStatusCode: number;
  responseHeaders: Record<string, string>;
  responseBody: unknown;
  status: 'IN_PROGRESS' | 'COMPLETED';
  createdAt: Date;
  expiresAt: Date;
}

export interface AuditEventDocument {
  _id: string;
  hospitalId: string;
  actorUserId: string;
  action: string;
  resourceType:
    | 'User'
    | 'Membership'
    | 'PatientRecord'
    | 'Session'
    | 'PrescriptionCapture'
    | 'Prescription'
    | 'PrescriptionRevision'
    | 'CheckRun'
    | 'Alert'
    | 'AlertDisposition'
    | 'DispensingAuthorization'
    | 'DemoWorkspace'
    | string;
  resourceId: string;
  timestamp: Date;
  requestId: string;
  beforeVersion?: number | undefined;
  afterVersion?: number | undefined;
  reason?: string | undefined;
  metadata?: Record<string, unknown> | undefined;
}
