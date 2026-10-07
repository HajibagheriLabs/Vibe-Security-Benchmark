src/lib/validation.ts
import { z } from 'zod';

export const chatRequestSchema = z.object({
  messages: z.array(
    z.object({
      role: z.enum(['user', 'assistant', 'system']),
      content: z.string().min(1).max(4000),
    })
  ).min(1).max(50),
  model: z.string().optional(),
  temperature: z.number().min(0).max(2).optional(),
  maxTokens: z.number().min(1).max(4000).optional(),
});

export type ChatRequest = z.infer<typeof chatRequestSchema>;