import { describe, it, expect } from 'vitest';
import { normalizeMedicineInput } from '../../src/domain/medicine-matching/normalizer.js';
import { matchMedicineFromCatalogue } from '../../src/domain/medicine-matching/matcher.js';
import { SYNTHETIC_CATALOGUE_ITEMS } from '../../src/fixtures/seed-catalogue-rules.js';

describe('Medicine Matching & Normalization Engine', () => {
  // TEST-MED-001: Exact canonical match yields correct active ingredients
  it('TEST-MED-001: Exact canonical match yields correct active ingredients', () => {
    const parsed = normalizeMedicineInput('Glucophage 500mg tab');
    expect(parsed.rawBrandQuery).toBe('glucophage');
    expect(parsed.extractedStrength).toEqual({ value: 500, unit: 'mg' });
    expect(parsed.extractedDosageForm).toBe('TABLET');

    const result = matchMedicineFromCatalogue(parsed, SYNTHETIC_CATALOGUE_ITEMS);
    expect(result.matchStatus).toBe('CONFIRMED');
    expect(result.canonicalIngredientIds).toEqual(['ing-metformin']);
    expect(result.selectedCandidate?._id).toBe('cat-metformin-500');
    expect(result.matchConfidence).toBeGreaterThanOrEqual(0.9);
  });

  // TEST-MED-002: Brand name with ambiguous strength yields AMBIGUOUS
  it('TEST-MED-002: Brand name with ambiguous strength yields AMBIGUOUS', () => {
    const parsed = normalizeMedicineInput('Glucophage'); // No strength given
    expect(parsed.extractedStrength).toBeUndefined();

    const result = matchMedicineFromCatalogue(parsed, SYNTHETIC_CATALOGUE_ITEMS);
    expect(result.matchStatus).toBe('AMBIGUOUS');
    expect(result.candidates.length).toBe(2);
    expect(result.canonicalIngredientIds).toEqual([]); // Requires pharmacist resolution
    expect(result.matchConfidence).toBe(0.5);
  });

  // TEST-MED-003: Unknown brand name yields UNSUPPORTED
  it('TEST-MED-003: Unknown brand name yields UNSUPPORTED', () => {
    const parsed = normalizeMedicineInput('NonexistentFictionalDrug 200mg');
    const result = matchMedicineFromCatalogue(parsed, SYNTHETIC_CATALOGUE_ITEMS);

    expect(result.matchStatus).toBe('UNSUPPORTED');
    expect(result.canonicalIngredientIds).toEqual([]);
    expect(result.candidates).toEqual([]);
    expect(result.matchConfidence).toBe(0.0);
  });

  // TEST-MED-004: Combination medicine missing ingredient mapping yields UNSUPPORTED
  it('TEST-MED-004: Combination medicine missing ingredient mapping yields UNSUPPORTED', () => {
    const parsed = normalizeMedicineInput('SinusClear 10mg');
    const result = matchMedicineFromCatalogue(parsed, SYNTHETIC_CATALOGUE_ITEMS);

    expect(result.matchStatus).toBe('UNSUPPORTED');
    expect(result.canonicalIngredientIds).toEqual([]);
    expect(result.resolutionNotes).toContain('incomplete active ingredient mapping');
  });

  // Normalization edge cases
  it('normalizes dirty OCR input with noisy spacing and punctuation', () => {
    const parsed = normalizeMedicineInput('  altace,  2.5 mg   caps  ');
    expect(parsed.rawBrandQuery).toBe('altace');
    expect(parsed.extractedStrength).toEqual({ value: 2.5, unit: 'mg' });
    expect(parsed.extractedDosageForm).toBe('CAPSULE');

    const result = matchMedicineFromCatalogue(parsed, SYNTHETIC_CATALOGUE_ITEMS);
    expect(result.matchStatus).toBe('CONFIRMED');
    expect(result.canonicalIngredientIds).toEqual(['ing-ramipril']);
  });
});
