import { z } from 'zod';

export const ResetDemoWorkspaceSchema = z.object({
  confirmation: z.literal('RESET_SYNTHETIC_DEMO', {
    errorMap: () => ({
      message: 'Confirmation must be RESET_SYNTHETIC_DEMO',
    }),
  }),
  workspaceId: z.string().min(1, 'Workspace ID is required'),
});

export type ResetDemoWorkspaceInput = z.infer<typeof ResetDemoWorkspaceSchema>;
