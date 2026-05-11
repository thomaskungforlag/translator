import type { ContentType, GlossaryEntry, LanguageConfig } from '@/lib/domain';

import { buildDefaultStyleProfile } from './reference-material';
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
    sourceTerm: 'Auroraporten',
    targetTerm: 'Aurora Gate',
    category: 'worldbuilding',
    notes: 'Locked placeholder term for the public demo corpus.',
    locked: true,
  },
  {
    id: 'gl_2',
    sourceTerm: 'Södra kajen',
    targetTerm: 'South Quay',
    category: 'place',
    locked: true,
  },
  {
    id: 'gl_3',
    sourceTerm: 'dimbank',
    targetTerm: 'fog bank',
    category: 'phrase',
    locked: false,
  },
];

export const demoSourceText = [
  'Morgonljuset låg kallt över kajen.',
  'Hon väntade vid räcket tills dimman lättade.',
  'Långt ute blinkade Auroraporten en gång.',
].join('\n\n');

export const demoWorkspaceSeed: TranslationWorkspaceSeed = {
  projectId: 'proj_001',
  title: 'Sample Project - Harbor Signal',
  contentType: demoContentType,
  sourceLanguageCode: 'sv',
  segmentationStrategy: 'paragraph',
  targetLanguage: demoTargetLanguage,
  styleProfile: buildDefaultStyleProfile(),
  sourceText: demoSourceText,
  glossary: demoGlossary,
};
