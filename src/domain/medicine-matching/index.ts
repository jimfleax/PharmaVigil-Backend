/**
 * Domain module: Medicine Matching & Normalization
 * Matches raw OCR text and brand names to canonical ingredients.
 * Brand is not an ingredient. Unknown composition => UNSUPPORTED.
 */
export type MedicineMatchStatus = 'CONFIRMED' | 'AMBIGUOUS' | 'UNSUPPORTED' | 'UNRESOLVED';
