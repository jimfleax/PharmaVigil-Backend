import type { Context } from 'hono';

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

export interface AuditEventDocument {
  _id: string;
  hospitalId: string;
  actorUserId: string;
  action: string;
  resourceType: 'User' | 'Membership' | 'PatientRecord' | 'Session';
  resourceId: string;
  timestamp: Date;
  requestId: string;
  beforeVersion?: number | undefined;
  afterVersion?: number | undefined;
  reason?: string | undefined;
  metadata?: Record<string, unknown> | undefined;
}
