import { z } from 'zod';

export const ListAlertsQuerySchema = z.object({
  status: z
    .enum([
      'OPEN',
      'ACKNOWLEDGED',
      'UNDER_REVIEW',
      'CHANGE_REQUIRED',
      'CLINICAL_DISPOSITION_RECORDED',
      'RESOLVED',
    ])
    .optional(),
  assignedToMe: z
    .preprocess((val) => (val === 'true' || val === true ? true : false), z.boolean())
    .default(false),
  cursor: z.string().optional(),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});

export const AlertDispositionSchema = z.object({
  dispositionType: z.enum(['CHANGE_REQUIRED', 'CLINICALLY_REVIEWED', 'OTHER_DOCUMENTED']),
  rationale: z
    .string()
    .min(3, 'Rationale must be at least 3 characters long')
    .max(2000),
});

export type ListAlertsQuery = z.infer<typeof ListAlertsQuerySchema>;
export type AlertDispositionInput = z.infer<typeof AlertDispositionSchema>;
