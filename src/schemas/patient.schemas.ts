import { z } from 'zod';

export const SearchPatientsQuerySchema = z.object({
  hospitalPatientId: z.string().min(3).max(64),
});

export const ConfirmPatientLinkSchema = z.object({
  confirmationPhrase: z.string().min(1).max(120),
});
export type ConfirmPatientLink = z.infer<typeof ConfirmPatientLinkSchema>;
