import { z } from 'zod';

export const SearchPatientsQuerySchema = z.object({
  hospitalPatientId: z.string().min(3).max(64),
});

export const ConfirmPatientLinkSchema = z.object({
  confirmationPhrase: z.string().min(1).max(120),
});
export type ConfirmPatientLink = z.infer<typeof ConfirmPatientLinkSchema>;

export const AddAllergySchema = z.object({
  substanceText: z.string().trim().min(1, 'Substance text is required').max(200),
  canonicalIngredientId: z.string().trim().min(1).max(100).optional(),
  recordType: z.enum(['ALLERGY', 'ADVERSE_REACTION']).default('ALLERGY'),
  reactionDescription: z.string().trim().max(500).optional(),
  severity: z.enum(['UNKNOWN', 'MILD', 'MODERATE', 'SEVERE']).default('UNKNOWN'),
  sourceType: z.enum(['CLINICIAN_RECORDED', 'PATIENT_REPORTED']).optional(),
  verificationStatus: z.enum(['CONFIRMED', 'REPORTED', 'UNVERIFIED']).optional(),
});
export type AddAllergyInput = z.infer<typeof AddAllergySchema>;

export const AddMedicationHistorySchema = z.object({
  medicineName: z.string().trim().min(1, 'Medicine name is required').max(200),
  canonicalIngredientIds: z.array(z.string().trim().min(1)).optional(),
  catalogueItemId: z.string().trim().optional(),
  dose: z.string().trim().min(1).max(50).default('1'),
  unit: z.string().trim().min(1).max(30).default('dose'),
  route: z.string().trim().max(50).default('ORAL'),
  frequency: z.string().trim().max(50).default('ONCE_DAILY'),
  status: z.enum(['ACTIVE', 'STOPPED', 'UNKNOWN']).default('ACTIVE'),
  startDate: z.coerce.date().optional(),
  endDate: z.coerce.date().optional(),
  sourceType: z.enum(['CLINICIAN_PRESCRIBED', 'PATIENT_REPORTED', 'IMPORTED_SYNTHETIC']).optional(),
  verificationStatus: z.enum(['VERIFIED', 'REPORTED', 'UNVERIFIED']).optional(),
});
export type AddMedicationHistoryInput = z.infer<typeof AddMedicationHistorySchema>;

