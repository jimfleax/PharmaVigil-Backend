import { describe, it, expect } from 'vitest';
import { evaluateClinicalRules, ENGINE_LIMITATION_DISCLAIMER } from '../../src/domain/rule-engine/evaluator.js';
import { SEEDED_ILLUSTRATIVE_RULESET } from '../../src/fixtures/seed-catalogue-rules.js';
import type { RuleEngineInput } from '../../src/domain/rule-engine/types.js';

describe('Pure Deterministic Clinical Rule Engine', () => {
  const baseInput: RuleEngineInput = {
    subjectType: 'PRESCRIPTION_REVISION',
    subjectId: 'presc-rev-001',
    subjectVersion: 1,
    subjectItems: [],
    activeMedications: [],
    patientAllergies: [],
    patientAdverseReactions: [],
    clinicalContext: {
      recordedContextFlags: new Set([
        'MEDICATION_HISTORY_CONFIRMED',
        'PATIENT_ALLERGY_PROFILE_RECORDED',
        'DIETARY_HABITS_RECORDED',
        'DIETARY_POTASSIUM_ASSESSED',
      ]),
    },
    ruleSet: SEEDED_ILLUSTRATIVE_RULESET,
  };

  // TEST-RULE-001: Seeded critical drug-drug interaction triggers expected alert & version snapshot
  it('TEST-RULE-001: Seeded critical drug-drug interaction triggers expected alert & version snapshot', () => {
    const input: RuleEngineInput = {
      ...baseInput,
      subjectItems: [
        {
          itemId: 'item-1',
          canonicalIngredientIds: ['ing-potassium-chloride'],
          matchStatus: 'CONFIRMED',
        },
        {
          itemId: 'item-2',
          canonicalIngredientIds: ['ing-spironolactone'],
          matchStatus: 'CONFIRMED',
        },
      ],
    };

    const output = evaluateClinicalRules(input);
    expect(output.outcome).toBe('FLAGGED');
    expect(output.ruleSetVersion).toBe('2026-ILLUSTRATIVE-1.0');
    expect(output.coverageByCategory.drugDrug.status).toBe('EVALUATED_WITH_MATCHES');
    expect(output.alerts.length).toBeGreaterThanOrEqual(1);

    const alert = output.alerts.find((a) => a.ruleId === 'ILLUSTRATIVE-DDI-001');
    expect(alert).toBeDefined();
    expect(alert?.severity).toBe('CRITICAL');
    expect(alert?.evidenceReferences.length).toBeGreaterThan(0);
    expect(alert?.evidenceReferences[0]?.sourceId).toBe('SRC-ILLUS-DDI-01');
  });

  // TEST-RULE-002: No matching seeded rule triggers NO_MATCHING_RULE + limitation disclaimer (never safe)
  it('TEST-RULE-002: No matching seeded rule triggers NO_MATCHING_RULE + limitation disclaimer (never safe)', () => {
    const input: RuleEngineInput = {
      ...baseInput,
      subjectItems: [
        {
          itemId: 'item-1',
          canonicalIngredientIds: ['ing-metformin'],
          matchStatus: 'CONFIRMED',
        },
      ],
    };

    const output = evaluateClinicalRules(input);
    expect(output.outcome).toBe('NO_MATCHING_RULE');
    expect(output.alerts).toHaveLength(0);
    expect(output.limitations).toContain(ENGINE_LIMITATION_DISCLAIMER);
    // Mandatory invariant: Must never present NO_MATCHING_RULE as safe
    expect(output.limitations.some((lim) => lim.includes('does NOT certify medication safety'))).toBe(true);
  });

  // TEST-RULE-003: Required clinical context missing yields INCOMPLETE
  it('TEST-RULE-003: Required clinical context missing yields INCOMPLETE', () => {
    const input: RuleEngineInput = {
      ...baseInput,
      subjectItems: [
        {
          itemId: 'item-1',
          canonicalIngredientIds: ['ing-warfarin'],
          matchStatus: 'CONFIRMED',
        },
      ],
      // Remove dietary context flag
      clinicalContext: {
        recordedContextFlags: new Set([
          'MEDICATION_HISTORY_CONFIRMED',
          'PATIENT_ALLERGY_PROFILE_RECORDED',
        ]),
      },
    };

    const output = evaluateClinicalRules(input);
    expect(output.coverageByCategory.foodDrink.status).toBe('INCOMPLETE');
    expect(output.outcome).toBe('INCOMPLETE');
  });

  // TEST-RULE-004: Ruleset change preserves version snapshot
  it('TEST-RULE-004: Ruleset change preserves version snapshot', () => {
    const inputV1: RuleEngineInput = {
      ...baseInput,
      ruleSet: {
        ...SEEDED_ILLUSTRATIVE_RULESET,
        version: '2026-ILLUSTRATIVE-1.0',
      },
    };
    const outputV1 = evaluateClinicalRules(inputV1);
    expect(outputV1.ruleSetVersion).toBe('2026-ILLUSTRATIVE-1.0');

    const inputV2: RuleEngineInput = {
      ...baseInput,
      ruleSet: {
        ...SEEDED_ILLUSTRATIVE_RULESET,
        version: '2026-ILLUSTRATIVE-2.0-SNAPSHOT',
      },
    };
    const outputV2 = evaluateClinicalRules(inputV2);
    expect(outputV2.ruleSetVersion).toBe('2026-ILLUSTRATIVE-2.0-SNAPSHOT');
  });

  // TEST-FAIL-001: Rule engine timeout/invalid payload fails closed
  it('TEST-FAIL-001: Rule engine invalid payload fails closed', () => {
    // Pass corrupted ruleSet
    const corruptInput = {
      ...baseInput,
      ruleSet: null as unknown as typeof SEEDED_ILLUSTRATIVE_RULESET,
    };

    const output = evaluateClinicalRules(corruptInput);
    expect(output.outcome).toBe('FAILED');
    expect(output.alerts).toHaveLength(0);
    expect(output.coverageByCategory.drugDrug.status).toBe('FAILED');
    expect(output.limitations[0]).toContain('Engine failure during evaluation');
  });
});
