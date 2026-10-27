import { describe, it, expect } from 'vitest';
import {
  AddAllergySchema,
  AddMedicationHistorySchema,
  SeedDemoWorkspaceSchema,
} from '../../src/schemas/index.js';

describe('Deferred Clinical Write API Schemas', () => {
  describe('AddAllergySchema', () => {
    it('TEST-UNIT-SCHEMA-001: accepts valid allergy and defaults recordType to ALLERGY and severity to UNKNOWN', () => {
      const parsed = AddAllergySchema.parse({
        substanceText: 'Amoxil 500mg',
      });
      expect(parsed.substanceText).toBe('Amoxil 500mg');
      expect(parsed.recordType).toBe('ALLERGY');
      expect(parsed.severity).toBe('UNKNOWN');
      expect(parsed.sourceType).toBeUndefined();
      expect(parsed.verificationStatus).toBeUndefined();
    });

    it('TEST-UNIT-SCHEMA-002: rejects empty substanceText or string exceeding 200 characters', () => {
      expect(() => AddAllergySchema.parse({ substanceText: '' })).toThrow();
      expect(() => AddAllergySchema.parse({ substanceText: '   ' })).toThrow();
      expect(() => AddAllergySchema.parse({ substanceText: 'a'.repeat(201) })).toThrow();
    });

    it('accepts valid adverse reaction with optional fields', () => {
      const parsed = AddAllergySchema.parse({
        substanceText: 'Aspirin',
        canonicalIngredientId: 'ing-aspirin',
        recordType: 'ADVERSE_REACTION',
        reactionDescription: 'Severe rash and itching',
        severity: 'SEVERE',
        sourceType: 'CLINICIAN_RECORDED',
        verificationStatus: 'CONFIRMED',
      });
      expect(parsed.canonicalIngredientId).toBe('ing-aspirin');
      expect(parsed.recordType).toBe('ADVERSE_REACTION');
      expect(parsed.severity).toBe('SEVERE');
      expect(parsed.sourceType).toBe('CLINICIAN_RECORDED');
      expect(parsed.verificationStatus).toBe('CONFIRMED');
    });
  });

  describe('AddMedicationHistorySchema', () => {
    it('TEST-UNIT-SCHEMA-003: accepts valid medication and defaults status to ACTIVE, dose to 1, route to ORAL', () => {
      const parsed = AddMedicationHistorySchema.parse({
        medicineName: 'Aldactone 25mg',
      });
      expect(parsed.medicineName).toBe('Aldactone 25mg');
      expect(parsed.dose).toBe('1');
      expect(parsed.unit).toBe('dose');
      expect(parsed.route).toBe('ORAL');
      expect(parsed.frequency).toBe('ONCE_DAILY');
      expect(parsed.status).toBe('ACTIVE');
    });

    it('TEST-UNIT-SCHEMA-004: rejects invalid status enums or missing medicineName', () => {
      expect(() => AddMedicationHistorySchema.parse({ medicineName: '', status: 'ACTIVE' })).toThrow();
      expect(() =>
        AddMedicationHistorySchema.parse({
          medicineName: 'Aldactone',
          // @ts-expect-error test invalid enum
          status: 'INVALID_STATUS',
        }),
      ).toThrow();
    });

    it('coerces valid start/end dates and arrays of canonical ingredient IDs', () => {
      const parsed = AddMedicationHistorySchema.parse({
        medicineName: 'Aldactone 25mg',
        canonicalIngredientIds: ['ing-spironolactone'],
        catalogueItemId: 'cat-spironolactone-25',
        startDate: '2026-01-01T00:00:00.000Z',
        endDate: '2026-06-01T00:00:00.000Z',
        status: 'STOPPED',
      });
      expect(parsed.canonicalIngredientIds).toEqual(['ing-spironolactone']);
      expect(parsed.catalogueItemId).toBe('cat-spironolactone-25');
      expect(parsed.startDate).toBeInstanceOf(Date);
      expect(parsed.endDate).toBeInstanceOf(Date);
      expect(parsed.status).toBe('STOPPED');
    });
  });

  describe('SeedDemoWorkspaceSchema', () => {
    it('TEST-UNIT-SCHEMA-005: requires exact literal SEED_SYNTHETIC_DEMO and non-empty workspaceId', () => {
      const parsed = SeedDemoWorkspaceSchema.parse({
        confirmation: 'SEED_SYNTHETIC_DEMO',
        workspaceId: 'hosp_demo_synthetic_01',
      });
      expect(parsed.confirmation).toBe('SEED_SYNTHETIC_DEMO');
      expect(parsed.workspaceId).toBe('hosp_demo_synthetic_01');

      expect(() =>
        SeedDemoWorkspaceSchema.parse({
          confirmation: 'RESET_SYNTHETIC_DEMO',
          workspaceId: 'hosp_demo_synthetic_01',
        }),
      ).toThrow();

      expect(() =>
        SeedDemoWorkspaceSchema.parse({
          confirmation: 'SEED_SYNTHETIC_DEMO',
          workspaceId: '',
        }),
      ).toThrow();
    });
  });
});
