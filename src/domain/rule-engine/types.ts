export type RuleCategory = 'DRUG_DRUG' | 'FOOD_DRINK' | 'ALLERGY' | 'ADVERSE_REACTION';
export type RuleSeverity = 'INFO' | 'LOW' | 'MODERATE' | 'HIGH' | 'CRITICAL';
export type RuleSetStatus =
  | 'DRAFT'
  | 'IN_REVIEW'
  | 'APPROVED'
  | 'PUBLISHED'
  | 'RETIRED'
  | 'ILLUSTRATIVE_NOT_VALIDATED';
export type LicenseStatus =
  | 'VERIFIED'
  | 'RESTRICTED'
  | 'PERMISSION_REQUIRED'
  | 'UNVERIFIED'
  | 'ORIGINAL_ILLUSTRATIVE';
export type EvidenceStrength = 'NOT_ASSESSED' | 'LOW' | 'MODERATE' | 'HIGH';

export interface EvidenceReference {
  sourceId: string;
  title: string;
  publisher: string;
  url: string;
  locator: string;
  accessedAt: string; // YYYY-MM-DD
  licenseStatus: LicenseStatus;
  evidenceStrength: EvidenceStrength;
}

export type ClinicalContextRequirement =
  | 'PATIENT_ALLERGY_PROFILE_RECORDED'
  | 'MEDICATION_HISTORY_CONFIRMED'
  | 'RENAL_FUNCTION_ASSESSED'
  | 'PREGNANCY_STATUS_ASSESSED'
  | 'DIETARY_HABITS_RECORDED'
  | 'DIETARY_POTASSIUM_ASSESSED';

export interface ClinicalRule {
  ruleId: string; // e.g. 'ILLUSTRATIVE-DDI-001'
  ruleVersion: number;
  category: RuleCategory;
  status: RuleSetStatus;
  trigger: {
    ingredientIds: string[];
    requiresAll: boolean;
  };
  otherTrigger?: {
    ingredientIds: string[];
    requiresAll: boolean;
  };
  requiredContext: ClinicalContextRequirement[];
  severity: RuleSeverity;
  rationale: string;
  recommendedNextAction: string;
  evidenceReferences: EvidenceReference[];
  limitations: string[];
}

export interface ClinicalRuleSet {
  ruleSetId: string;
  version: string; // e.g. '2026-ILLUSTRATIVE-1.0'
  status: RuleSetStatus;
  publishedAt: string;
  rules: ClinicalRule[];
}

export type CheckOutcome =
  | 'FLAGGED'
  | 'NO_MATCHING_RULE'
  | 'INCOMPLETE'
  | 'UNSUPPORTED'
  | 'FAILED';

export type CoverageStatus =
  | 'EVALUATED_WITH_MATCHES'
  | 'NO_MATCHING_SEEDED_RULE'
  | 'INCOMPLETE'
  | 'UNSUPPORTED'
  | 'NOT_EVALUATED'
  | 'FAILED';

export interface CoverageCategory {
  status: CoverageStatus;
  limitation: string;
  evaluatedInputsCount: number;
  unsupportedInputsCount: number;
}

export interface AlertSummary {
  id: string; // e.g. 'alert-ILLUSTRATIVE-DDI-001-itemA-itemB'
  ruleId: string;
  ruleVersion: number;
  category: RuleCategory;
  severity: RuleSeverity;
  status: 'OPEN';
  rationale: string;
  recommendedNextAction: string;
  limitations: string[];
  evidenceReferences: EvidenceReference[];
  triggeringIngredients: string[];
}

export interface PrescribedSubjectItem {
  itemId: string;
  catalogueId?: string;
  canonicalIngredientIds: string[];
  matchStatus: 'CONFIRMED' | 'AMBIGUOUS' | 'UNSUPPORTED' | 'UNRESOLVED';
  brandText?: string;
  strength?: { value: number; unit: string };
  dosageForm?: string;
}

export interface ActiveMedicationEntry {
  entryId: string;
  canonicalIngredientIds: string[];
  status: 'ACTIVE' | 'STOPPED' | 'UNKNOWN';
  verificationStatus: 'VERIFIED' | 'REPORTED' | 'UNVERIFIED';
}

export interface AllergyEntry {
  allergyId: string;
  canonicalIngredientId?: string;
  substanceText: string;
  recordType: 'ALLERGY' | 'ADVERSE_REACTION';
  verificationStatus: 'CONFIRMED' | 'REPORTED' | 'UNVERIFIED';
}

export interface AdverseReactionEntry {
  reactionId: string;
  canonicalIngredientId?: string;
  substanceText: string;
  reactionDescription?: string;
  severity: 'UNKNOWN' | 'MILD' | 'MODERATE' | 'SEVERE';
  verificationStatus: 'CONFIRMED' | 'REPORTED' | 'UNVERIFIED';
}

export interface ClinicalContextSnapshot {
  recordedContextFlags: Set<ClinicalContextRequirement> | ClinicalContextRequirement[];
  isPregnant?: boolean;
  hasRenalImpairment?: boolean;
}

export interface RuleEngineInput {
  subjectType: 'PRESCRIPTION_REVISION' | 'MEDICATION_ORDER_VERSION';
  subjectId: string;
  subjectVersion: number;
  subjectItems: PrescribedSubjectItem[];
  activeMedications: ActiveMedicationEntry[];
  patientAllergies: AllergyEntry[];
  patientAdverseReactions: AdverseReactionEntry[];
  clinicalContext: ClinicalContextSnapshot;
  ruleSet: ClinicalRuleSet;
}

export interface RuleEngineOutput {
  outcome: CheckOutcome;
  ruleSetVersion: string;
  coverageByCategory: {
    drugDrug: CoverageCategory;
    foodDrink: CoverageCategory;
    allergy: CoverageCategory;
    adverseReaction: CoverageCategory;
  };
  alerts: AlertSummary[];
  limitations: string[];
  subjectId: string;
  subjectVersion: number;
  evaluatedAt: string;
}
