src/lib/env.ts
import { z } from 'zod';

const envSchema = z.object({
  AWS_REGION: z.string().min(1),
  AWS_ACCESS_KEY_ID: z.string().min(1),
  AWS_SECRET_ACCESS_KEY: z.string().min(1),
  S3_BUCKET_NAME: z.string().min(1),
  S3_UPLOAD_PREFIX: z.string().default('uploads/'),
  MAX_FILE_SIZE_MB: z.coerce.number().int().positive().default(10),
  ALLOWED_MIME_TYPES: z.string().default('image/jpeg,image/png,application/pdf'),
});

export const env = envSchema.parse(process.env);

export const ALLOWED_MIME_TYPES = env.ALLOWED_MIME_TYPES.split(',').map(s => s.trim());
export const MAX_FILE_SIZE_BYTES = env.MAX_FILE_SIZE_MB * 1024 * 1024;