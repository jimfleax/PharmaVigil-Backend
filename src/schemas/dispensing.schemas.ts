import { z } from 'zod';

export const CreateDispensingAuthorizationSchema = z.object({
  prescriptionId: z.string().min(1, 'Prescription ID is required'),
  prescriptionRevisionId: z.string().min(1, 'Prescription revision ID is required'),
  checkRunId: z.string().min(1, 'Check run ID is required'),
  expectedVersion: z.number().int().min(1, 'expectedVersion must be a positive integer'),
  acknowledgement: z.literal('WORKFLOW_REQUIREMENTS_REVIEWED', {
    errorMap: () => ({
      message: 'Mandatory acknowledgement must be WORKFLOW_REQUIREMENTS_REVIEWED',
    }),
  }),
});

export type CreateDispensingAuthorizationInput = z.infer<
  typeof CreateDispensingAuthorizationSchema
>;
