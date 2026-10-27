import { z } from 'zod';

export const StrengthSpecificationSchema = z.object({
  value: z.number().positive('Strength value must be positive'),
  unit: z.string().min(1, 'Unit required'),
});

export const CatalogueSearchQuerySchema = z.object({
  query: z
    .string()
    .min(2, 'Query must be at least 2 characters')
    .max(120, 'Query must not exceed 120 characters'),
  limit: z.coerce.number().int().min(1).max(50).default(10),
});

export const MedicineCandidateSchema = z.object({
  id: z.string(),
  displayName: z.string(),
  canonicalIngredientIds: z.array(z.string()),
  productType: z.enum(['SINGLE_INGREDIENT', 'COMBINATION']),
  strengths: z.array(StrengthSpecificationSchema).optional(),
  dosageForms: z.array(z.string()).optional(),
  matchStatus: z.enum(['CANDIDATE', 'AMBIGUOUS', 'UNSUPPORTED']),
  matchConfidence: z.number().min(0).max(1).optional(),
});

export type MedicineCandidate = z.infer<typeof MedicineCandidateSchema>;
