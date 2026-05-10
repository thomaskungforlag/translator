import type { ReactElement } from 'react';

import { StudioShell } from '@/components/studio-shell';
import { env } from '@/lib/env';
import type {
  ContentType,
  DocumentSegment,
  GlossaryEntry,
  LanguageConfig,
  Project,
  QAFinding,
} from '@/lib/domain';

const targetLanguage: LanguageConfig = {
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

const projectContentType: ContentType = 'novel_chapter';

const project: Project = {
  id: 'proj_001',
  title: 'Chapter 03 - The Signal in the Ice',
  sourceLanguage: 'sv',
  targetLanguage: 'en',
  contentType: projectContentType,
  createdAt: '2026-05-10T08:00:00.000Z',
  updatedAt: '2026-05-10T08:15:00.000Z',
  styleProfileId: 'style_thomas_kung_default',
  glossaryId: 'glossary_series_core',
};

const glossary: GlossaryEntry[] = [
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

const segments: DocumentSegment[] = [
  {
    id: 'seg_1',
    projectId: project.id,
    index: 0,
    sourceText: 'Det hade börjat snöa när hon såg ljuset igen.',
    sourceNotes: 'Scene opener with a memory of the earlier signal.',
    translationDraft: 'It had started to snow when she saw the light again.',
    voiceAdaptedDraft: 'Snow had begun to fall when she saw the light again.',
    polishedDraft: 'Snow had started to fall when she saw the light again.',
    finalText: 'Snow had started to fall when she saw the light again.',
    qaFindings: [],
    status: 'approved',
  },
  {
    id: 'seg_2',
    projectId: project.id,
    index: 1,
    sourceText: 'Han visste att det var för sent att ringa tillbaka.',
    translationDraft: 'He knew it was too late to call back.',
    voiceAdaptedDraft: 'He knew it was already too late to call back.',
    polishedDraft: 'He knew it was too late to call back.',
    finalText: 'He knew it was too late to call back.',
    qaFindings: [],
    status: 'reviewed',
  },
  {
    id: 'seg_3',
    projectId: project.id,
    index: 2,
    sourceText: 'Någonstans längre bort svarade Skuggskeppet i mörkret.',
    translationDraft: 'Somewhere farther away, the Shadow Ship answered in the dark.',
    voiceAdaptedDraft: 'Farther out, the Shadow Ship answered in the dark.',
    polishedDraft: 'Farther out, the Shadow Ship answered in the dark.',
    finalText: 'Farther out, the Shadow Ship answered in the dark.',
    qaFindings: [],
    status: 'translated',
  },
];

const qaFindings: QAFinding[] = [
  {
    id: 'qa_1',
    severity: 'warning',
    category: 'style_drift',
    issue:
      'The voice pass is currently preserving meaning, but the rhythm still feels slightly literal.',
    suggestion: 'Re-run voice adaptation on segment 3 after glossary confirmation.',
    resolved: false,
  },
  {
    id: 'qa_2',
    severity: 'critical',
    category: 'terminology',
    issue: 'Locked glossary term Skuggskeppet must remain capitalized as The Shadow Ship.',
    suggestion: 'Lock the term in the glossary and re-check final output.',
    resolved: false,
  },
];

const pipelineStages = [
  { label: 'Source analysis', status: 'approved' as const },
  { label: 'Faithful translation', status: 'approved' as const },
  { label: 'Voice adaptation', status: 'running' as const },
  { label: 'Literary polish', status: 'idle' as const },
  { label: 'QA review', status: 'idle' as const },
];

export default function HomePage(): ReactElement {
  return (
    <StudioShell
      apiKeyConfigured={Boolean(env.OPENAI_API_KEY)}
      project={{
        title: project.title,
        contentType: project.contentType,
        targetLanguage,
        progress: 58,
        segments,
        glossary,
        qaFindings,
        pipelineStages,
      }}
    />
  );
}
