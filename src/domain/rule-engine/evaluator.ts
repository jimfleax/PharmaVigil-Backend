import type {
  RuleEngineInput,
  RuleEngineOutput,
  CheckOutcome,
  AlertSummary,
  CoverageCategory,
  ClinicalRule,
  ClinicalContextRequirement,
} from './types.js';

export const ENGINE_LIMITATION_DISCLAIMER =
  'Illustrative demonstration ruleset only. NO_MATCHING_RULE does NOT certify medication safety or clinical clearance. Qualified clinician review is always mandatory.';

function hasContextFlag(
  flags: Set<ClinicalContextRequirement> | ClinicalContextRequirement[],
  req: ClinicalContextRequirement,
): boolean {
  if (flags instanceof Set) {
    return flags.has(req);
  }
  if (Array.isArray(flags)) {
    return flags.includes(req);
  }
  return false;
}

/**
 * Pure deterministic clinical rule engine.
 * ZERO network, ZERO database, ZERO async, ZERO mutable state.
 */
export function evaluateClinicalRules(input: RuleEngineInput): RuleEngineOutput {
  try {
    if (!input || !input.ruleSet || !Array.isArray(input.ruleSet.rules)) {
      throw new Error('Invalid rule engine input payload');
    }

    const alerts: AlertSummary[] = [];
    const limitations: string[] = [ENGINE_LIMITATION_DISCLAIMER];

    // 1. Safety Check: Verify subject items for UNSUPPORTED / AMBIGUOUS products (TEST-FAIL / TEST-MED)
    const unsupportedItems = input.subjectItems.filter(
      (item) => item.matchStatus === 'UNSUPPORTED' || item.matchStatus === 'UNRESOLVED',
    );
    const ambiguousItems = input.subjectItems.filter((item) => item.matchStatus === 'AMBIGUOUS');

    if (unsupportedItems.length > 0 || ambiguousItems.length > 0) {
      return {
        outcome: 'UNSUPPORTED',
        ruleSetVersion: input.ruleSet.version,
        coverageByCategory: {
          drugDrug: {
            status: 'UNSUPPORTED',
            limitation:
              'One or more prescribed medicines have unresolved or unsupported active ingredient mappings.',
            evaluatedInputsCount:
              input.subjectItems.length - unsupportedItems.length - ambiguousItems.length,
            unsupportedInputsCount: unsupportedItems.length + ambiguousItems.length,
          },
          foodDrink: {
            status: 'UNSUPPORTED',
            limitation: 'Cannot evaluate with unresolved medicine.',
            evaluatedInputsCount: 0,
            unsupportedInputsCount: 1,
          },
          allergy: {
            status: 'UNSUPPORTED',
            limitation: 'Cannot evaluate with unresolved medicine.',
            evaluatedInputsCount: 0,
            unsupportedInputsCount: 1,
          },
          adverseReaction: {
            status: 'UNSUPPORTED',
            limitation: 'Cannot evaluate with unresolved medicine.',
            evaluatedInputsCount: 0,
            unsupportedInputsCount: 1,
          },
        },
        alerts: [],
        limitations: [
          ...limitations,
          'Clinical check blocked: Cannot evaluate prescription containing unresolved or unsupported medication candidates.',
        ],
        subjectId: input.subjectId,
        subjectVersion: input.subjectVersion,
        evaluatedAt: new Date().toISOString(),
      };
    }

    // 2. Collect all active ingredients present in this subject
    const subjectIngredients = new Set<string>();
    for (const item of input.subjectItems) {
      for (const ing of item.canonicalIngredientIds) {
        subjectIngredients.add(ing);
      }
    }

    // Collect all active ingredients in patient's active medication history
    const activeHistoryIngredients = new Set<string>();
    for (const med of input.activeMedications) {
      if (med.status === 'ACTIVE') {
        for (const ing of med.canonicalIngredientIds) {
          activeHistoryIngredients.add(ing);
        }
      }
    }

    // Combine all active patient ingredients (new prescription + active profile)
    const allPatientIngredients = new Set<string>([
      ...subjectIngredients,
      ...activeHistoryIngredients,
    ]);

    // Track category evaluation statuses
    let drugDrugIncomplete = false;
    let foodDrinkIncomplete = false;
    let allergyIncomplete = false;
    let adverseIncomplete = false;

    let drugDrugFlagged = false;
    let foodDrinkFlagged = false;
    let allergyFlagged = false;
    let adverseFlagged = false;

    // 3. Iterate over pinned ruleset
    for (const rule of input.ruleSet.rules) {
      const missingContext = rule.requiredContext.filter(
        (ctx) => !hasContextFlag(input.clinicalContext.recordedContextFlags, ctx),
      );

      switch (rule.category) {
        case 'DRUG_DRUG': {
          const triggerA = rule.trigger.ingredientIds.some((id) => subjectIngredients.has(id));
          const triggerB = rule.otherTrigger
            ? rule.otherTrigger.ingredientIds.some((id) => allPatientIngredients.has(id))
            : false;

          if (triggerA && triggerB) {
            if (missingContext.length > 0) {
              drugDrugIncomplete = true;
            } else {
              drugDrugFlagged = true;
              alerts.push(
                createAlertSummary(rule, Array.from(subjectIngredients), input.subjectId),
              );
            }
          }
          break;
        }

        case 'FOOD_DRINK': {
          const trigger = rule.trigger.ingredientIds.some((id) => subjectIngredients.has(id));
          if (trigger) {
            if (missingContext.length > 0) {
              foodDrinkIncomplete = true; // Required dietary context missing (TEST-RULE-003)
            } else {
              foodDrinkFlagged = true;
              alerts.push(
                createAlertSummary(rule, Array.from(subjectIngredients), input.subjectId),
              );
            }
          }
          break;
        }

        case 'ALLERGY': {
          const allergyIngredients = new Set(
            input.patientAllergies
              .filter((a) => a.canonicalIngredientId)
              .map((a) => a.canonicalIngredientId!),
          );

          const trigger = rule.trigger.ingredientIds.some((id) => subjectIngredients.has(id));
          const hasAllergyRecord = rule.trigger.ingredientIds.some((id) =>
            allergyIngredients.has(id),
          );

          if (trigger) {
            if (missingContext.length > 0) {
              allergyIncomplete = true;
            } else if (hasAllergyRecord) {
              allergyFlagged = true;
              alerts.push(
                createAlertSummary(rule, Array.from(subjectIngredients), input.subjectId),
              );
            }
          }
          break;
        }

        case 'ADVERSE_REACTION': {
          const reactionIngredients = new Set(
            input.patientAdverseReactions
              .filter((r) => r.canonicalIngredientId)
              .map((r) => r.canonicalIngredientId!),
          );

          const trigger = rule.trigger.ingredientIds.some((id) => subjectIngredients.has(id));
          const hasReaction = rule.trigger.ingredientIds.some((id) => reactionIngredients.has(id));

          if (trigger) {
            if (missingContext.length > 0) {
              adverseIncomplete = true;
            } else if (hasReaction) {
              adverseFlagged = true;
              alerts.push(
                createAlertSummary(rule, Array.from(subjectIngredients), input.subjectId),
              );
            }
          }
          break;
        }
      }
    }

    // 4. Construct category coverage results
    const drugDrugCoverage: CoverageCategory = {
      status: drugDrugFlagged
        ? 'EVALUATED_WITH_MATCHES'
        : drugDrugIncomplete
          ? 'INCOMPLETE'
          : 'NO_MATCHING_SEEDED_RULE',
      limitation: drugDrugIncomplete
        ? 'Required medication context was missing during drug-drug evaluation.'
        : 'Evaluated against seeded illustrative drug-drug rules only.',
      evaluatedInputsCount: subjectIngredients.size,
      unsupportedInputsCount: 0,
    };

    const foodDrinkCoverage: CoverageCategory = {
      status: foodDrinkFlagged
        ? 'EVALUATED_WITH_MATCHES'
        : foodDrinkIncomplete
          ? 'INCOMPLETE'
          : 'NO_MATCHING_SEEDED_RULE',
      limitation: foodDrinkIncomplete
        ? 'Patient dietary/food intake context was not recorded. Marked INCOMPLETE.'
        : 'Evaluated against seeded illustrative food/drink rules only.',
      evaluatedInputsCount: subjectIngredients.size,
      unsupportedInputsCount: 0,
    };

    const allergyCoverage: CoverageCategory = {
      status: allergyFlagged
        ? 'EVALUATED_WITH_MATCHES'
        : allergyIncomplete
          ? 'INCOMPLETE'
          : 'NO_MATCHING_SEEDED_RULE',
      limitation: allergyIncomplete
        ? 'Patient allergy history unconfirmed. Marked INCOMPLETE to prevent false clearance.'
        : 'Evaluated against recorded allergies and seeded illustrative rules only.',
      evaluatedInputsCount: subjectIngredients.size,
      unsupportedInputsCount: 0,
    };

    const adverseReactionCoverage: CoverageCategory = {
      status: adverseFlagged
        ? 'EVALUATED_WITH_MATCHES'
        : adverseIncomplete
          ? 'INCOMPLETE'
          : 'NO_MATCHING_SEEDED_RULE',
      limitation: adverseIncomplete
        ? 'Adverse reaction context missing.'
        : 'Evaluated against recorded adverse reactions.',
      evaluatedInputsCount: subjectIngredients.size,
      unsupportedInputsCount: 0,
    };

    // 5. Determine overall check outcome
    let outcome: CheckOutcome;
    if (alerts.length > 0) {
      outcome = 'FLAGGED';
    } else if (
      drugDrugIncomplete ||
      foodDrinkIncomplete ||
      allergyIncomplete ||
      adverseIncomplete
    ) {
      outcome = 'INCOMPLETE';
    } else {
      outcome = 'NO_MATCHING_RULE';
    }

    return {
      outcome,
      ruleSetVersion: input.ruleSet.version,
      coverageByCategory: {
        drugDrug: drugDrugCoverage,
        foodDrink: foodDrinkCoverage,
        allergy: allergyCoverage,
        adverseReaction: adverseReactionCoverage,
      },
      alerts,
      limitations,
      subjectId: input.subjectId,
      subjectVersion: input.subjectVersion,
      evaluatedAt: new Date().toISOString(),
    };
  } catch {
    // Fail-Closed on any unhandled exception (TEST-FAIL-001)
    return {
      outcome: 'FAILED',
      ruleSetVersion: input?.ruleSet?.version || 'UNKNOWN',
      coverageByCategory: {
        drugDrug: {
          status: 'FAILED',
          limitation: 'Rule evaluation threw exception',
          evaluatedInputsCount: 0,
          unsupportedInputsCount: 0,
        },
        foodDrink: {
          status: 'FAILED',
          limitation: 'Rule evaluation threw exception',
          evaluatedInputsCount: 0,
          unsupportedInputsCount: 0,
        },
        allergy: {
          status: 'FAILED',
          limitation: 'Rule evaluation threw exception',
          evaluatedInputsCount: 0,
          unsupportedInputsCount: 0,
        },
        adverseReaction: {
          status: 'FAILED',
          limitation: 'Rule evaluation threw exception',
          evaluatedInputsCount: 0,
          unsupportedInputsCount: 0,
        },
      },
      alerts: [],
      limitations: ['Engine failure during evaluation. Dispensing authorization cannot proceed.'],
      subjectId: input?.subjectId || 'UNKNOWN',
      subjectVersion: input?.subjectVersion || 0,
      evaluatedAt: new Date().toISOString(),
    };
  }
}

function createAlertSummary(
  rule: ClinicalRule,
  triggeringIngredients: string[],
  subjectId: string,
): AlertSummary {
  return {
    id: `alert-${rule.ruleId}-${subjectId}`,
    ruleId: rule.ruleId,
    ruleVersion: rule.ruleVersion,
    category: rule.category,
    severity: rule.severity,
    status: 'OPEN',
    rationale: rule.rationale,
    recommendedNextAction: rule.recommendedNextAction,
    limitations: rule.limitations,
    evidenceReferences: rule.evidenceReferences,
    triggeringIngredients,
  };
}
