import { z } from 'zod';

export const CreateCheckSchema = z.object({
  subjectType: z.enum(['PRESCRIPTION_REVISION', 'MEDICATION_ORDER_VERSION']),
  subjectId: z.string().min(1, 'Subject ID is required'),
  subjectVersion: z.number().int().min(1),
});

export type CreateCheckInput = z.infer<typeof CreateCheckSchema>;
