export type ProductType = 'SINGLE_INGREDIENT' | 'COMBINATION';
export type IngredientCompositionStatus = 'VERIFIED_FOR_DEMO' | 'UNKNOWN';
export type CatalogueItemStatus = 'ACTIVE' | 'RETIRED' | 'UNSUPPORTED';

export interface StrengthSpecification {
  value: number;
  unit: string; // e.g. 'mg', 'mcg', 'g', 'ml', 'IU'
}

export interface CatalogueSourceReference {
  sourceId: string;
  description: string;
  referenceUrl?: string;
}

export interface MedicationCatalogItem {
  _id: string; // e.g. 'cat-metformin-500', 'cat-augmentin-625'
  canonicalIngredientIds: string[]; // e.g. ['ing-metformin'], ['ing-amoxicillin', 'ing-clavulanic-acid']
  productType: ProductType;
  brandNames: string[]; // e.g. ['Glucophage', 'Riomet', 'Fortamet']
  synonyms: string[]; // e.g. ['metformin hydrochloride', 'metformin HCl']
  strengths: StrengthSpecification[]; // e.g. [{ value: 500, unit: 'mg' }]
  dosageForms: string[]; // e.g. ['TABLET', 'CAPSULE', 'ORAL_SUSPENSION']
  routes: string[]; // e.g. ['ORAL', 'INTRAVENOUS', 'TOPICAL']
  ingredientCompositionStatus: IngredientCompositionStatus;
  sourceRefs: CatalogueSourceReference[];
  catalogueVersion: string; // e.g. '2026-ILLUSTRATIVE-1.0'
  status: CatalogueItemStatus;
  createdAt: Date;
  updatedAt: Date;
}

export interface ParsedMedicineToken {
  cleanedText: string;
  rawBrandQuery: string;
  extractedStrength?: { value: number; unit: string };
  extractedDosageForm?: string;
}

export type ResolutionStatus = 'CONFIRMED' | 'AMBIGUOUS' | 'UNSUPPORTED' | 'UNRESOLVED';

export interface MatchResult {
  matchStatus: ResolutionStatus;
  selectedCandidate?: MedicationCatalogItem;
  canonicalIngredientIds: string[];
  candidates: MedicationCatalogItem[];
  matchConfidence: number; // 0.0 to 1.0 (distinct from OCR confidence)
  resolutionNotes: string;
}
