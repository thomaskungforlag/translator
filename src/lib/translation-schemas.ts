import { z } from 'zod';

import { languageCodeValues } from './domain';
import { segmentationStrategyValues } from './workspace';

const styleSampleSchema = z.object({
  id: z.string().min(1),
  sourceLanguage: z.enum(languageCodeValues),
  sourceText: z.string().min(1),
  translatedText: z.string().optional(),
  isPriority: z.boolean(),
});

const styleProfileSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  description: z.string().min(1),
  voicePrinciples: z.array(z.string()),
  preferredTone: z.array(z.string()),
  avoidPatterns: z.array(z.string()),
  sentenceRhythmNotes: z.array(z.string()),
  genreNotes: z.array(z.string()),
  sampleTexts: z.array(styleSampleSchema),
});

export const translationWorkspaceRequestSchema = z.object({
  projectId: z.string().min(1),
  title: z.string().min(1),
  contentType: z.enum([
    'novel_chapter',
    'short_story',
    'blurb',
    'website_copy',
    'newsletter',
    'social_post',
  ]),
  sourceLanguageCode: z.enum(languageCodeValues),
  segmentationStrategy: z.enum(segmentationStrategyValues).default('paragraph'),
  targetLanguage: z.object({
    code: z.enum(languageCodeValues),
    label: z.string().min(1),
    locale: z.string().min(1),
    translationNotes: z.array(z.string()),
    dialogueRules: z.array(z.string()),
    punctuationRules: z.array(z.string()),
    marketQualityNotes: z.array(z.string()),
  }),
  styleProfile: styleProfileSchema,
  sourceText: z.string().min(1),
  glossary: z.array(
    z.object({
      id: z.string().min(1),
      sourceTerm: z.string().min(1),
      targetTerm: z.string().min(1),
      category: z.enum(['character', 'place', 'technology', 'worldbuilding', 'phrase', 'other']),
      notes: z.string().optional(),
      locked: z.boolean(),
    }),
  ),
  provider: z.enum(['openai', 'poe']).optional(),
  model: z.string().min(1).optional(),
});

export const stageSegmentSchema = z.object({
  index: z.number().int().nonnegative(),
  text: z.string().min(1),
});

export const stageResponseSchema = z.object({
  segments: z.array(stageSegmentSchema).min(1),
});

export const qaFindingSchema = z.object({
  segmentIndex: z.number().int().nonnegative(),
  severity: z.enum(['info', 'warning', 'critical']),
  category: z.enum([
    'omission',
    'mistranslation',
    'grammar',
    'spelling',
    'grammar_flow',
    'style_drift',
    'tone_shift',
    'translation_stiffness',
    'tense_aspect_drift',
    'motion_image_drift',
    'image_drift',
    'emotional_intensity_drift',
    'punctuation_flow',
    'family_term_naturalness',
    'cultural_texture_drift',
    'terminology',
    'character_voice',
    'market_quality',
    'formatting',
  ]),
  sourceExcerpt: z.string().optional(),
  targetExcerpt: z.string().optional(),
  issue: z.string().min(1),
  suggestion: z.string().optional(),
});

export const qaResponseSchema = z.object({
  findings: z.array(qaFindingSchema),
});
