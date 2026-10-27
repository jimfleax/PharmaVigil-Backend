import { describe, it, expect } from 'vitest';
import {
  CreateRuleSetDraftSchema,
  ApproveRuleSetSchema,
  ListRuleSetsQuerySchema,
} from '../../src/schemas/rule-set.schemas.js';

describe('Clinical Rule Governance Schemas & Invariants', () => {
  it('validates a valid draft ruleset creation payload', () => {
    const valid = {
      ruleSetId: 'RULESET-TEST-001',
      version: '2026-TEST-1.0',
      description: 'Test illustrative ruleset for unit tests',
      rules: [
        {
          ruleId: 'TEST-RULE-01',
          ruleVersion: 1,
          category: 'DRUG_DRUG',
          severity: 'HIGH',
          rationale: 'Known interaction risk',
        },
      ],
      limitations: ['Synthetic unit test only'],
    };
    const parsed = CreateRuleSetDraftSchema.safeParse(valid);
    expect(parsed.success).toBe(true);
  });

  it('rejects a draft ruleset with 0 rules', () => {
    const invalid = {
      ruleSetId: 'RULESET-TEST-002',
      version: '2026-TEST-2.0',
      description: 'Draft with empty rules',
      rules: [],
    };
    const parsed = CreateRuleSetDraftSchema.safeParse(invalid);
    expect(parsed.success).toBe(false);
  });

  it('validates a valid clinical review approval rationale', () => {
    const valid = {
      rationale: 'Independent clinical pharmacology panel approved these rules.',
    };
    const parsed = ApproveRuleSetSchema.safeParse(valid);
    expect(parsed.success).toBe(true);
  });

  it('rejects an approval rationale shorter than 3 characters', () => {
    const invalid = {
      rationale: 'ok',
    };
    const parsed = ApproveRuleSetSchema.safeParse(invalid);
    expect(parsed.success).toBe(false);
  });

  it('coerces and defaults query limits for ruleset listings', () => {
    const query = {
      status: 'PUBLISHED',
      limit: '50',
    };
    const parsed = ListRuleSetsQuerySchema.safeParse(query);
    expect(parsed.success).toBe(true);
    if (parsed.success) {
      expect(parsed.data.limit).toBe(50);
      expect(parsed.data.status).toBe('PUBLISHED');
    }
  });
});
