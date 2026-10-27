import { z } from 'zod';
import { PrescriptionItemSchema } from './item.schemas.js';

export const CreatePrescriptionSchema = z.object({
  patientId: z.string().min(1, 'Patient ID is required'),
  items: z.array(PrescriptionItemSchema).min(1, 'At least one prescription item is required'),
  sourceCaptureId: z.string().optional(),
});

export const CreateRevisionSchema = z.object({
  items: z.array(PrescriptionItemSchema).min(1, 'At least one prescription item is required'),
  changeReason: z.string().min(3, 'Change reason must be at least 3 characters').max(1000),
  expectedVersion: z.number().int().min(1),
});

export const ListPrescriptionsQuerySchema = z.object({
  patientId: z.string().optional(),
  status: z.string().optional(),
  cursor: z.string().optional(),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});

export type CreatePrescriptionInput = z.infer<typeof CreatePrescriptionSchema>;
export type CreateRevisionInput = z.infer<typeof CreateRevisionSchema>;
export type ListPrescriptionsQuery = z.infer<typeof ListPrescriptionsQuerySchema>;
