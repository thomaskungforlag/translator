import type { GlossaryEntry } from '@/lib/domain';

import { buildDefaultStyleProfile } from './reference-material';
import { defaultContentType, getTargetLanguageConfig } from './workspace-options';
import type { TranslationWorkspaceSeed } from './workspace';

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
  contentType: defaultContentType,
  sourceLanguageCode: 'sv',
  segmentationStrategy: 'paragraph',
  targetLanguage: getTargetLanguageConfig('en'),
  styleProfile: buildDefaultStyleProfile(),
  sourceText: demoSourceText,
  glossary: demoGlossary,
};
