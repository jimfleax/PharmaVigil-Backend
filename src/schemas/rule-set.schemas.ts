import { z } from 'zod';

export const CreateRuleSetDraftSchema = z.object({
  ruleSetId: z.string().min(1, 'ruleSetId is required'),
  version: z.string().min(1, 'version is required'),
  description: z.string().min(5, 'description must be at least 5 characters'),
  limitations: z.array(z.string()).default([]),
  rules: z.array(z.any()).min(1, 'At least 1 clinical rule is required'),
});

export const ApproveRuleSetSchema = z.object({
  rationale: z.string().min(3, 'Review rationale must be at least 3 characters long').max(2000),
});

export const ListRuleSetsQuerySchema = z.object({
  status: z
    .enum(['DRAFT', 'IN_REVIEW', 'APPROVED', 'PUBLISHED', 'RETIRED', 'ILLUSTRATIVE_NOT_VALIDATED'])
    .optional(),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});

export type CreateRuleSetDraftInput = z.infer<typeof CreateRuleSetDraftSchema>;
export type ApproveRuleSetInput = z.infer<typeof ApproveRuleSetSchema>;
export type ListRuleSetsQuery = z.infer<typeof ListRuleSetsQuerySchema>;
