import { z } from 'zod';
import { PrescriptionItemSchema } from './item.schemas.js';

export const CreateMedicationOrderSchema = z.object({
  patientId: z.string().min(1, 'patientId is required'),
  items: z.array(PrescriptionItemSchema).min(1, 'At least 1 medication order item is required'),
  notes: z.string().max(1000).optional(),
});

export const CreateMedicationOrderVersionSchema = z.object({
  items: z.array(PrescriptionItemSchema).min(1, 'At least 1 medication order item is required'),
  changeReason: z.string().min(3, 'changeReason must be at least 3 characters long').max(1000),
  expectedVersion: z.number().int().min(1),
});

export const ListMedicationOrdersQuerySchema = z.object({
  patientId: z.string().optional(),
  status: z.enum(['ACTIVE', 'DISCONTINUED', 'CANCELLED']).optional(),
  cursor: z.string().optional(),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});

export type CreateMedicationOrderInput = z.infer<typeof CreateMedicationOrderSchema>;
export type CreateMedicationOrderVersionInput = z.infer<typeof CreateMedicationOrderVersionSchema>;
export type ListMedicationOrdersQuery = z.infer<typeof ListMedicationOrdersQuerySchema>;
