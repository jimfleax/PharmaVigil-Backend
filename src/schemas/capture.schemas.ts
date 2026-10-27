import { z } from 'zod';
import { PrescriptionItemSchema } from './item.schemas.js';

export const CreateCaptureSchema = z.object({
  patientId: z.string().min(1, 'Patient ID is required'),
  captureMode: z.enum(['BROWSER_OCR', 'MANUAL_ENTRY', 'SEEDED_IMAGE']),
  ocrLanguage: z.enum(['eng']).default('eng'),
  extractedText: z.string().max(20000).optional().default(''),
});

export const UpdateCaptureSchema = z.object({
  extractedText: z.string().max(20000).optional(),
  items: z.array(PrescriptionItemSchema).optional(),
});

export const ConfirmCaptureSchema = z.object({
  patientConfirmed: z.literal(true, {
    errorMap: () => ({ message: 'Patient identity confirmation is mandatory' }),
  }),
  items: z.array(PrescriptionItemSchema).min(1, 'At least one prescription item is required'),
});

export type CreateCaptureInput = z.infer<typeof CreateCaptureSchema>;
export type UpdateCaptureInput = z.infer<typeof UpdateCaptureSchema>;
export type ConfirmCaptureInput = z.infer<typeof ConfirmCaptureSchema>;
