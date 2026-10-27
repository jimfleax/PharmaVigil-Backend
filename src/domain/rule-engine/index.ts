/**
 * Domain module: Deterministic Pure Clinical Rule Engine
 * Evaluates prescription/order items against active ruleset.
 * Pure deterministic functions isolated from HTTP and database code.
 * Non-negotiable safety: NO_MATCHING_RULE is not safety clearance.
 */
export type RuleOutcome =
  | 'FLAGGED'
  | 'NO_MATCHING_RULE'
  | 'INCOMPLETE'
  | 'UNSUPPORTED'
  | 'FAILED';

export type RuleCategory = 'DRUG_DRUG' | 'FOOD_DRINK' | 'ALLERGY' | 'ADVERSE_REACTION';

export type AlertSeverity = 'UNKNOWN' | 'MILD' | 'MODERATE' | 'SEVERE';
