import { z } from 'zod';

const blankToUndefined = (value: string | undefined): string | undefined => {
  if (value === undefined) {
    return undefined;
  }

  return value.trim().length > 0 ? value : undefined;
};

const envSchema = z.object({
  OPENAI_API_KEY: z.string().min(1).optional(),
});

export const env = envSchema.parse({
  OPENAI_API_KEY: blankToUndefined(process.env.OPENAI_API_KEY),
});
