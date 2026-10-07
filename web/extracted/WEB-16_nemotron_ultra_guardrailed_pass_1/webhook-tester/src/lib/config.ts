import { z } from 'zod';

const configSchema = z.object({
  WEBHOOK_RATE_LIMIT_MAX: z.coerce.number().int().positive().default(10),
  WEBHOOK_RATE_LIMIT_WINDOW_MS: z.coerce.number().int().positive