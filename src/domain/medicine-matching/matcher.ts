import type { MedicationCatalogItem, ParsedMedicineToken, MatchResult } from './types.js';

/**
 * Pure deterministic medicine matcher against candidate catalogue items.
 * Strictly upholds Brand != Ingredient boundary and safety gates.
 */
export function matchMedicineFromCatalogue(
  parsed: ParsedMedicineToken,
  catalogueItems: MedicationCatalogItem[],
): MatchResult {
  const query = parsed.rawBrandQuery.toLowerCase();

  if (!query) {
    return {
      matchStatus: 'UNRESOLVED',
      canonicalIngredientIds: [],
      candidates: [],
      matchConfidence: 0.0,
      resolutionNotes: 'Empty brand query. Cannot match medicine.',
    };
  }

  // 1. Find direct matches across active items
  const directMatches = catalogueItems.filter(
    (item) =>
      item.status === 'ACTIVE' &&
      (item.brandNames.some((b) => b.toLowerCase() === query) ||
        item.synonyms.some((s) => s.toLowerCase() === query) ||
        item.brandNames.some((b) => b.toLowerCase().includes(query))),
  );

  // GATE 1: Unknown brand / zero matches -> UNSUPPORTED (TEST-MED-003)
  if (directMatches.length === 0) {
    return {
      matchStatus: 'UNSUPPORTED',
      canonicalIngredientIds: [],
      candidates: [],
      matchConfidence: 0.0,
      resolutionNotes: `Unknown brand or unseeded medicine: '${parsed.cleanedText}'. Cannot resolve active ingredients safely.`,
    };
  }

  // GATE 2: Combination product with missing ingredient mapping -> UNSUPPORTED (TEST-MED-004)
  for (const match of directMatches) {
    if (
      match.productType === 'COMBINATION' &&
      (match.ingredientCompositionStatus === 'UNKNOWN' ||
        match.canonicalIngredientIds.length < 2)
    ) {
      return {
        matchStatus: 'UNSUPPORTED',
        canonicalIngredientIds: [],
        candidates: directMatches,
        matchConfidence: 0.0,
        resolutionNotes: `Combination product '${match._id}' has incomplete active ingredient mapping. Marked UNSUPPORTED to prevent false negative clinical checks.`,
      };
    }
  }

  // 3. Exact match by brand AND strength (TEST-MED-001)
  if (parsed.extractedStrength) {
    const strengthMatches = directMatches.filter((item) =>
      item.strengths.some(
        (s) =>
          s.value === parsed.extractedStrength?.value &&
          s.unit.toLowerCase() === parsed.extractedStrength?.unit.toLowerCase(),
      ),
    );

    if (strengthMatches.length === 1) {
      const selected = strengthMatches[0]!;
      return {
        matchStatus: 'CONFIRMED',
        selectedCandidate: selected,
        canonicalIngredientIds: [...selected.canonicalIngredientIds],
        candidates: [selected],
        matchConfidence: 0.95,
        resolutionNotes: `Exact match for brand '${query}' with strength ${parsed.extractedStrength.value}${parsed.extractedStrength.unit}.`,
      };
    }
  }

  // GATE 3: Ambiguous brand with multiple strengths / presentations -> AMBIGUOUS (TEST-MED-002)
  if (directMatches.length > 1) {
    return {
      matchStatus: 'AMBIGUOUS',
      canonicalIngredientIds: [],
      candidates: directMatches,
      matchConfidence: 0.5,
      resolutionNotes: `Brand '${query}' has ${directMatches.length} candidate presentations with differing strengths/forms. Pharmacist manual selection required.`,
    };
  }

  // 4. Single candidate without ambiguous competitors
  const single = directMatches[0]!;
  if (single.ingredientCompositionStatus === 'UNKNOWN') {
    return {
      matchStatus: 'UNSUPPORTED',
      canonicalIngredientIds: [],
      candidates: [single],
      matchConfidence: 0.0,
      resolutionNotes: `Item '${single._id}' has UNKNOWN ingredient composition.`,
    };
  }

  return {
    matchStatus: 'CONFIRMED',
    selectedCandidate: single,
    canonicalIngredientIds: [...single.canonicalIngredientIds],
    candidates: [single],
    matchConfidence: 0.85,
    resolutionNotes: `Single matching candidate resolved for '${query}'.`,
  };
}
