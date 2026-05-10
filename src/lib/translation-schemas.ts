import { z } from 'zod';

import { languageCodeValues } from './domain';
import { segmentationStrategyValues } from './workspace';

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
