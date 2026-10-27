import { z } from 'zod';

export const CreateAppointmentSchema = z
  .object({
    patientId: z.string().min(1, 'patientId is required'),
    doctorUserId: z.string().min(1, 'doctorUserId is required'),
    startAt: z.string().datetime({ message: 'startAt must be a valid ISO 8601 datetime' }),
    endAt: z.string().datetime({ message: 'endAt must be a valid ISO 8601 datetime' }),
    reason: z.string().max(1000).optional(),
  })
  .refine(
    (data) => new Date(data.startAt).getTime() < new Date(data.endAt).getTime(),
    {
      message: 'startAt must be strictly before endAt',
      path: ['endAt'],
    },
  );

export const ListAppointmentsQuerySchema = z.object({
  from: z.string().datetime().optional(),
  to: z.string().datetime().optional(),
  patientId: z.string().optional(),
  doctorUserId: z.string().optional(),
  cursor: z.string().optional(),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});

export const CancelAppointmentSchema = z.object({
  expectedVersion: z.number().int().min(1).optional(),
  reason: z.string().max(500).optional(),
});

export type CreateAppointmentInput = z.infer<typeof CreateAppointmentSchema>;
export type ListAppointmentsQuery = z.infer<typeof ListAppointmentsQuerySchema>;
export type CancelAppointmentInput = z.infer<typeof CancelAppointmentSchema>;
