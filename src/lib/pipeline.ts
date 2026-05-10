import type { DocumentSegment, GlossaryEntry, QAFinding } from '@/lib/domain';

import type { PipelineStage, StudioShellProject, TranslationWorkspaceSeed } from './workspace';

const PIPELINE_LABELS = [
  'Source analysis',
  'Faithful translation',
  'Voice adaptation',
  'Literary polish',
  'QA review',
] as const;

const DEMO_TRANSLATIONS = [
  {
    source: 'Det hade börjat snöa när hon såg ljuset igen.',
    faithful: 'It had started to snow when she saw the light again.',
    voice: 'Snow had begun to fall when she saw the light again.',
    polish: 'Snow had started to fall when she saw the light again.',
  },
  {
    source: 'Han visste att det var för sent att ringa tillbaka.',
    faithful: 'He knew it was too late to call back.',
    voice: 'He knew it was already too late to call back.',
    polish: 'He knew it was too late to call back.',
  },
  {
    source: 'Någonstans längre bort svarade Skuggskeppet i mörkret.',
    faithful: 'Somewhere farther away, The Shadow Ship answered in the dark.',
    voice: 'Farther out, The Shadow Ship answered in the dark.',
    polish: 'Farther out, The Shadow Ship answered in the dark.',
  },
] as const;

export type SegmentDraft = {
  sourceText: string;
  translationDraft: string;
  voiceAdaptedDraft: string;
  polishedDraft: string;
  finalText: string;
};

export function splitSourceText(sourceText: string): string[] {
  return sourceText
    .split(/\n\s*\n/g)
    .map((segment) => segment.trim())
    .filter(Boolean);
}

function getDemoDrafts(sourceText: string): Omit<SegmentDraft, 'sourceText'> {
  const demoDraft = DEMO_TRANSLATIONS.find((draft) => draft.source === sourceText);

  if (demoDraft) {
    return {
      translationDraft: demoDraft.faithful,
      voiceAdaptedDraft: demoDraft.voice,
      polishedDraft: demoDraft.polish,
      finalText: demoDraft.polish,
    };
  }

  const normalized = sourceText.replace(/\s+/g, ' ').trim();

  return {
    translationDraft: normalized,
    voiceAdaptedDraft: normalized,
    polishedDraft: normalized,
    finalText: normalized,
  };
}

export function createDemoSegmentDrafts(sourceText: string): SegmentDraft[] {
  return splitSourceText(sourceText).map((segmentText) => ({
    sourceText: segmentText,
    ...getDemoDrafts(segmentText),
  }));
}

function createSegmentFromDraft(
  seed: TranslationWorkspaceSeed,
  draft: SegmentDraft,
  index: number,
  glossary: GlossaryEntry[],
): DocumentSegment {
  const segmentQaFindings = getSegmentQaFindings(draft, glossary);

  return {
    id: `seg_${index + 1}`,
    projectId: seed.projectId,
    index,
    sourceText: draft.sourceText,
    translationDraft: draft.translationDraft,
    voiceAdaptedDraft: draft.voiceAdaptedDraft,
    polishedDraft: draft.polishedDraft,
    finalText: draft.finalText,
    qaFindings: segmentQaFindings,
    status: segmentQaFindings.length === 0 ? 'approved' : 'reviewed',
  };
}

function getSegmentQaFindings(draft: SegmentDraft, glossary: GlossaryEntry[]): QAFinding[] {
  const findings: QAFinding[] = [];

  for (const entry of glossary) {
    if (!entry.locked) {
      continue;
    }

    const sourceHit = draft.sourceText.includes(entry.sourceTerm);
    const targetHit = draft.finalText.includes(entry.targetTerm);

    if (sourceHit && !targetHit) {
      findings.push({
        id: `qa-${entry.id}`,
        severity: 'critical',
        category: 'terminology',
        issue: `Locked glossary term ${entry.sourceTerm} must remain capitalized as ${entry.targetTerm}.`,
        suggestion: 'Lock the term in the glossary and re-check final output.',
        resolved: false,
      });
    }
  }

  return findings;
}

function buildProjectQaFindings(segments: DocumentSegment[]): QAFinding[] {
  return segments.flatMap((segment) => segment.qaFindings);
}

function buildPipelineStages(qaFindings: QAFinding[]): PipelineStage[] {
  const qaApproved = qaFindings.length === 0;

  return PIPELINE_LABELS.map((label, index) => ({
    label,
    status: index < 4 ? 'approved' : qaApproved ? 'approved' : 'running',
  }));
}

function buildProjectProgress(qaFindings: QAFinding[]): number {
  return qaFindings.length === 0 ? 100 : 80;
}

export function buildStudioShellProject(
  seed: TranslationWorkspaceSeed,
  drafts: SegmentDraft[] = createDemoSegmentDrafts(seed.sourceText),
): StudioShellProject {
  const segments = drafts.map((draft, index) =>
    createSegmentFromDraft(seed, draft, index, seed.glossary),
  );
  const qaFindings = buildProjectQaFindings(segments);

  return {
    title: seed.title,
    contentType: seed.contentType,
    targetLanguage: seed.targetLanguage,
    progress: buildProjectProgress(qaFindings),
    segments,
    glossary: seed.glossary,
    qaFindings,
    pipelineStages: buildPipelineStages(qaFindings),
  };
}

export function exportProjectMarkdown(project: StudioShellProject): string {
  const sectionLines = project.segments.flatMap((segment) => [
    `### Segment ${segment.index + 1}`,
    '',
    `Source: ${segment.sourceText}`,
    `Faithful: ${segment.translationDraft ?? ''}`,
    `Voice: ${segment.voiceAdaptedDraft ?? ''}`,
    `Polish: ${segment.polishedDraft ?? ''}`,
    `Final: ${segment.finalText ?? ''}`,
    '',
  ]);

  const qaLines =
    project.qaFindings.length === 0
      ? ['No QA findings.']
      : project.qaFindings.flatMap((finding) => [
          `- [${finding.severity}] ${finding.issue}`,
          finding.suggestion ? `  - Suggestion: ${finding.suggestion}` : '',
        ]);

  return [
    `# ${project.title}`,
    '',
    `Target language: ${project.targetLanguage.label}`,
    `Content type: ${project.contentType}`,
    '',
    '## QA Findings',
    ...qaLines,
    '',
    '## Segments',
    ...sectionLines,
  ].join('\n');
}
