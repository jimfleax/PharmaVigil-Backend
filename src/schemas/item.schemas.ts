import { z } from 'zod';

export const PrescriptionItemSchema = z.object({
  rawExtractedText: z.string().min(1).max(500),
  catalogueItemId: z.string().nullable().optional(),
  canonicalIngredientIds: z.array(z.string()).default([]),
  brandText: z.string().nullable().optional(),
  strengthValue: z.number().nullable().optional(),
  strengthUnit: z.string().nullable().optional(),
  dosageForm: z.string().nullable().optional(),
  doseValue: z.number().nullable().optional(),
  doseUnit: z.string().nullable().optional(),
  route: z.string().nullable().optional(),
  frequency: z.string().nullable().optional(),
  durationValue: z.number().nullable().optional(),
  durationUnit: z.string().nullable().optional(),
  matchStatus: z.enum(['CONFIRMED', 'AMBIGUOUS', 'UNSUPPORTED', 'UNRESOLVED']),
  matchConfidence: z.number().min(0).max(1).nullable().optional(),
});

export type PrescriptionItem = z.infer<typeof PrescriptionItemSchema>;
