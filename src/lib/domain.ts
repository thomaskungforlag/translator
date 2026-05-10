import { z } from 'zod';

export const contentTypeValues = [
  'novel_chapter',
  'short_story',
  'blurb',
  'website_copy',
  'newsletter',
  'social_post',
] as const;

export const languageCodeValues = ['sv', 'en', 'en-GB', 'en-US'] as const;

export const segmentStatusValues = ['pending', 'translated', 'reviewed', 'approved'] as const;

export const qafindingSeverityValues = ['info', 'warning', 'critical'] as const;

export const qafindingCategoryValues = [
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
] as const;

export type ContentType = (typeof contentTypeValues)[number];
export type LanguageCode = (typeof languageCodeValues)[number];
export type SegmentStatus = (typeof segmentStatusValues)[number];
export type QAFindingSeverity = (typeof qafindingSeverityValues)[number];
export type QAFindingCategory = (typeof qafindingCategoryValues)[number];

export type Project = {
  id: string;
  title: string;
  sourceLanguage: LanguageCode;
  targetLanguage: LanguageCode;
  contentType: ContentType;
  createdAt: string;
  updatedAt: string;
  styleProfileId?: string;
  glossaryId?: string;
};

export type QAFinding = {
  id: string;
  severity: QAFindingSeverity;
  category: QAFindingCategory;
  sourceExcerpt?: string;
  targetExcerpt?: string;
  issue: string;
  suggestion?: string;
  resolved: boolean;
};

export type DocumentSegment = {
  id: string;
  projectId: string;
  index: number;
  sourceText: string;
  sourceAnalysis: string;
  sourceNotes?: string;
  translationDraft?: string;
  voiceAdaptedDraft?: string;
  literaryNaturalnessDraft?: string;
  polishedDraft?: string;
  professionalLiteraryCopyeditDraft?: string;
  finalText?: string;
  finalTextLocked?: boolean;
  qaFindings: QAFinding[];
  status: SegmentStatus;
};

export type StyleSample = {
  id: string;
  sourceLanguage: LanguageCode;
  sourceText: string;
  translatedText?: string;
  isPriority: boolean;
};

export type StyleProfile = {
  id: string;
  name: string;
  description: string;
  voicePrinciples: string[];
  preferredTone: string[];
  avoidPatterns: string[];
  sentenceRhythmNotes: string[];
  genreNotes: string[];
  sampleTexts: StyleSample[];
};

export type GlossaryEntry = {
  id: string;
  sourceTerm: string;
  targetTerm: string;
  category: 'character' | 'place' | 'technology' | 'worldbuilding' | 'phrase' | 'other';
  notes?: string;
  locked: boolean;
};

export type LanguageConfig = {
  code: LanguageCode;
  label: string;
  locale: string;
  translationNotes: string[];
  dialogueRules: string[];
  punctuationRules: string[];
  marketQualityNotes: string[];
};

export const projectSchema = z.object({
  id: z.string().min(1),
  title: z.string().min(1),
  sourceLanguage: z.enum(languageCodeValues),
  targetLanguage: z.enum(languageCodeValues),
  contentType: z.enum(contentTypeValues),
  createdAt: z.string().min(1),
  updatedAt: z.string().min(1),
  styleProfileId: z.string().min(1).optional(),
  glossaryId: z.string().min(1).optional(),
});

export const qafindingSchema = z.object({
  id: z.string().min(1),
  severity: z.enum(qafindingSeverityValues),
  category: z.enum(qafindingCategoryValues),
  sourceExcerpt: z.string().optional(),
  targetExcerpt: z.string().optional(),
  issue: z.string().min(1),
  suggestion: z.string().optional(),
  resolved: z.boolean(),
});

export const documentSegmentSchema = z.object({
  id: z.string().min(1),
  projectId: z.string().min(1),
  index: z.number().int().nonnegative(),
  sourceText: z.string().min(1),
  sourceAnalysis: z.string().min(1),
  sourceNotes: z.string().optional(),
  translationDraft: z.string().optional(),
  voiceAdaptedDraft: z.string().optional(),
  literaryNaturalnessDraft: z.string().optional(),
  polishedDraft: z.string().optional(),
  professionalLiteraryCopyeditDraft: z.string().optional(),
  finalText: z.string().optional(),
  finalTextLocked: z.boolean().optional(),
  qaFindings: z.array(qafindingSchema),
  status: z.enum(segmentStatusValues),
});
