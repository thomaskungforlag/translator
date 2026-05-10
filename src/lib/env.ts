import { z } from 'zod';

const envSchema = z.object({
  OPENAI_API_KEY: z.string().min(1).optional(),
});

export const env = envSchema.parse({
  OPENAI_API_KEY: process.env.OPENAI_API_KEY,
});
