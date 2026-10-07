src/lib/openai.ts
import OpenAI from 'openai';

export const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export const DEFAULT_MODEL = process.env.OPENAI_MODEL || 'gpt-4o-mini';
export const MAX_TOKENS = 2000;
export const TEMPERATURE = 0.7;