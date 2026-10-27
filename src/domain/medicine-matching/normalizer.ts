import type { ParsedMedicineToken } from './types.js';

const DOSAGE_FORM_PATTERNS: Record<string, string> = {
  tab: 'TABLET',
  tablet: 'TABLET',
  tabs: 'TABLET',
  cap: 'CAPSULE',
  capsule: 'CAPSULE',
  caps: 'CAPSULE',
  syr: 'SYRUP',
  syrup: 'SYRUP',
  susp: 'SUSPENSION',
  suspension: 'SUSPENSION',
  inj: 'INJECTION',
  injection: 'INJECTION',
  soln: 'SOLUTION',
  solution: 'SOLUTION',
};

const STRENGTH_REGEX = /(\d+(?:\.\d+)?)\s*(mg|mcg|g|ml|iu)/i;

/**
 * Normalizes messy clinical / OCR tokens and extracts dosage and strength.
 */
export function normalizeMedicineInput(rawInput: string): ParsedMedicineToken {
  const trimmed = rawInput.trim();
  let workingText = trimmed.toLowerCase();

  // 1. Extract strength token if present
  let extractedStrength: { value: number; unit: string } | undefined;
  const strengthMatch = workingText.match(STRENGTH_REGEX);
  if (strengthMatch && strengthMatch[1] && strengthMatch[2]) {
    extractedStrength = {
      value: parseFloat(strengthMatch[1]),
      unit: strengthMatch[2].toLowerCase(),
    };
    workingText = workingText.replace(STRENGTH_REGEX, ' ');
  }

  // 2. Extract dosage form token if present
  let extractedDosageForm: string | undefined;
  const words = workingText.split(/[\s,/-]+/);
  const remainingWords: string[] = [];

  for (const word of words) {
    const cleanWord = word.trim();
    if (!cleanWord) continue;

    if (DOSAGE_FORM_PATTERNS[cleanWord]) {
      extractedDosageForm = DOSAGE_FORM_PATTERNS[cleanWord];
    } else {
      remainingWords.push(cleanWord);
    }
  }

  const rawBrandQuery = remainingWords.join(' ').trim();

  return {
    cleanedText: trimmed,
    rawBrandQuery,
    ...(extractedStrength ? { extractedStrength } : {}),
    ...(extractedDosageForm ? { extractedDosageForm } : {}),
  };
}
