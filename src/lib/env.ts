import { z } from 'zod';

const blankToUndefined = (value: string | undefined): string | undefined => {
  if (value === undefined) {
    return undefined;
  }

  return value.trim().length > 0 ? value : undefined;
};

const envSchema = z.object({
  AI_PROVIDER: z.enum(['openai', 'poe']).default('openai'),
  OPENAI_API_KEY: z.string().min(1).optional(),
  OPENAI_MODEL: z.string().min(1).optional(),
  POE_API_KEY: z.string().min(1).optional(),
  POE_BOT: z.string().min(1).optional(),
  POE_API_URL: z.string().url().optional(),
  REFERENCE_SOURCE_PDF_URL: z.string().url().optional(),
  REFERENCE_DRAFT_PDF_URL: z.string().url().optional(),
  BLOB_READ_WRITE_TOKEN: z.string().min(1).optional(),
  WORDPRESS_TRANSLATION_API_KEY: z.string().min(1).optional(),
});

export const env = envSchema.parse({
  AI_PROVIDER: blankToUndefined(process.env.AI_PROVIDER),
  OPENAI_API_KEY: blankToUndefined(process.env.OPENAI_API_KEY),
  OPENAI_MODEL: blankToUndefined(process.env.OPENAI_MODEL),
  POE_API_KEY: blankToUndefined(process.env.POE_API_KEY),
  POE_BOT: blankToUndefined(process.env.POE_BOT),
  POE_API_URL: blankToUndefined(process.env.POE_API_URL),
  REFERENCE_SOURCE_PDF_URL: blankToUndefined(process.env.REFERENCE_SOURCE_PDF_URL),
  REFERENCE_DRAFT_PDF_URL: blankToUndefined(process.env.REFERENCE_DRAFT_PDF_URL),
  BLOB_READ_WRITE_TOKEN: blankToUndefined(process.env.BLOB_READ_WRITE_TOKEN),
  WORDPRESS_TRANSLATION_API_KEY: blankToUndefined(process.env.WORDPRESS_TRANSLATION_API_KEY),
});
