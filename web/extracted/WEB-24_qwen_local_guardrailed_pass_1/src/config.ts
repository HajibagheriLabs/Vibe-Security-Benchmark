import { z } from 'zod';

const envSchema = z.object({
  SESSION_SECRET_KEY: z.string().min(32, 'SESSION_SECRET_KEY must be at least 32 chars'),
  SESSION_EXPIRY_MS: z.string().transform((val) => {
    const num = parseInt(val, 10);
    if (isNaN(num) || num <= 0) {
      throw new Error('SESSION_EXPIRY_MS must be a positive integer');
    }
    return num;
  }),
});

export const config = envSchema.parse(process.env);