import type { ContentType, LanguageConfig } from '@/lib/domain';

import type { TranslationWorkspaceSeed } from './workspace';

const defaultTargetLanguage: LanguageConfig = {
  code: 'en',
  label: 'English',
  locale: 'en',
  translationNotes: [
    'Use international literary English by default.',
    'Preserve speculative-fiction terminology and tone.',
    'Keep dialogue natural without flattening character voice.',
  ],
  dialogueRules: ['Preserve punctuation conventions that fit the chosen English variant.'],
  punctuationRules: ['Keep paragraph breaks stable across all passes.'],
  marketQualityNotes: ['Aim for market-ready prose that still reveals translation decisions.'],
};

const defaultContentType: ContentType = 'novel_chapter';

export const initialWorkspaceSeed: TranslationWorkspaceSeed = {
  projectId: 'proj_new',
  title: 'Untitled project',
  contentType: defaultContentType,
  sourceLanguageCode: 'sv',
  segmentationStrategy: 'hybrid',
  targetLanguage: defaultTargetLanguage,
  sourceText: '',
  glossary: [],
};
