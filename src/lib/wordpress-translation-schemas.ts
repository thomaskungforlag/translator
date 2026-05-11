import { z } from 'zod';

import { languageCodeValues, qafindingSchema } from './domain';

export const wordPressContentUnitStatusValues = ['translate', 'preserve'] as const;

const contentUnitMetadataSchema = z.record(z.string(), z.unknown());

export const wordPressContentUnitSchema = z.object({
  key: z.string().min(1),
  blockType: z.string().min(1),
  path: z.string().min(1),
  sourceText: z.string().min(1),
  status: z.enum(wordPressContentUnitStatusValues).default('translate'),
  metadata: contentUnitMetadataSchema.optional(),
});

export const wordPressTranslatePageRequestSchema = z.object({
  sourcePostId: z.number().int().positive(),
  sourceLanguageCode: z.enum(languageCodeValues),
  targetLanguageCode: z.enum(languageCodeValues),
  targetVariantLabel: z.string().min(1).optional(),
  title: z.string().min(1),
  contentType: z.literal('website_copy'),
  contentPayload: z.array(wordPressContentUnitSchema).min(1),
  pageContext: z
    .object({
      slug: z.string().min(1).optional(),
      templateName: z.string().min(1).optional(),
      path: z.string().min(1).optional(),
      existingTargetPostId: z.number().int().positive().optional(),
    })
    .optional(),
});

export const wordPressTranslationWarningSchema = z.object({
  code: z.enum(['unsupported_block', 'preserved_content', 'markup_preservation', 'degraded_mode']),
  message: z.string().min(1),
  unitKey: z.string().min(1).optional(),
  blockType: z.string().min(1).optional(),
});

export const wordPressContentUnitResultSchema = wordPressContentUnitSchema.extend({
  translatedText: z.string().min(1),
});

export const wordPressSegmentReportSchema = z.object({
  unitKey: z.string().min(1),
  blockType: z.string().min(1),
  path: z.string().min(1),
  sourceAnalysis: z.string().min(1),
  translationDraft: z.string().min(1),
  voiceAdaptedDraft: z.string().min(1),
  literaryNaturalnessDraft: z.string().min(1),
  polishedDraft: z.string().min(1),
  professionalLiteraryCopyeditDraft: z.string().min(1),
  finalText: z.string().min(1),
  qaFindings: z.array(qafindingSchema),
});

export const wordPressStyleProfileSummarySchema = z.object({
  name: z.string().min(1),
  description: z.string().min(1),
  referenceTitle: z.string().min(1),
  lockedTerms: z.array(z.string()),
  translationMemoryPolicy: z.string().min(1),
});

export const wordPressTranslatePageResponseSchema = z.object({
  mode: z.enum(['openai', 'poe', 'fallback']),
  title: z.string().min(1),
  translatedContentPayload: z.array(wordPressContentUnitResultSchema),
  qaFindings: z.array(qafindingSchema),
  segmentReports: z.array(wordPressSegmentReportSchema),
  warnings: z.array(wordPressTranslationWarningSchema),
  styleProfileSummary: wordPressStyleProfileSummarySchema,
  message: z.string().min(1).optional(),
});

export type WordPressTranslatePageRequest = z.infer<typeof wordPressTranslatePageRequestSchema>;
export type WordPressTranslatePageResponse = z.infer<typeof wordPressTranslatePageResponseSchema>;
export type WordPressContentUnit = z.infer<typeof wordPressContentUnitSchema>;
export type WordPressContentUnitResult = z.infer<typeof wordPressContentUnitResultSchema>;
export type WordPressTranslationWarning = z.infer<typeof wordPressTranslationWarningSchema>;
