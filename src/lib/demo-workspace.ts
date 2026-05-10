import type { ContentType, GlossaryEntry, LanguageConfig } from '@/lib/domain';

import type { TranslationWorkspaceSeed } from './workspace';

export const demoTargetLanguage: LanguageConfig = {
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

export const demoContentType: ContentType = 'novel_chapter';

export const demoGlossary: GlossaryEntry[] = [
  {
    id: 'gl_1',
    sourceTerm: 'Skuggskeppet',
    targetTerm: 'The Shadow Ship',
    category: 'worldbuilding',
    notes: 'Locked series term.',
    locked: true,
  },
  {
    id: 'gl_2',
    sourceTerm: 'Norrhamn',
    targetTerm: 'North Harbor',
    category: 'place',
    locked: true,
  },
  {
    id: 'gl_3',
    sourceTerm: 'vågkam',
    targetTerm: 'wave crest',
    category: 'phrase',
    locked: false,
  },
];

export const demoSourceText = [
  'Det hade börjat snöa när hon såg ljuset igen.',
  'Han visste att det var för sent att ringa tillbaka.',
  'Någonstans längre bort svarade Skuggskeppet i mörkret.',
].join('\n\n');

export const demoWorkspaceSeed: TranslationWorkspaceSeed = {
  projectId: 'proj_001',
  title: 'Chapter 03 - The Signal in the Ice',
  contentType: demoContentType,
  sourceLanguageCode: 'sv',
  targetLanguage: demoTargetLanguage,
  sourceText: demoSourceText,
  glossary: demoGlossary,
};
