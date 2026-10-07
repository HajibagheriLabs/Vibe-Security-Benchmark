import { z } from 'zod';

// Flag: Injection defense. Schema validation before DB query.
export const AnalyticsQuerySchema = z.object({
  eventType: z.enum(['page_view', 'click', 'purchase']).optional(),
  limit: z.coerce.number().int().min(1).max(100).default(10),
  offset: z.coerce.number().int().min(0).default(0),
});

export type AnalyticsQuery = z.infer<typeof AnalyticsQuerySchema>;