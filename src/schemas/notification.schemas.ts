import { z } from 'zod';

export const ListNotificationsQuerySchema = z.object({
  unreadOnly: z
    .preprocess((val) => (val === 'true' || val === true ? true : false), z.boolean())
    .default(false),
  cursor: z.string().optional(),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});

export type ListNotificationsQuery = z.infer<typeof ListNotificationsQuerySchema>;
