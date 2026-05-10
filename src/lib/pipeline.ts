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

function splitSourceText(sourceText: string): string[] {
  return sourceText
    .split(/\n\s*\n/g)
    .map((segment) => segment.trim())
    .filter(Boolean);
}

function getDemoDrafts(sourceText: string): {
  faithful: string;
  voice: string;
  polish: string;
} {
  const demoDraft = DEMO_TRANSLATIONS.find((draft) => draft.source === sourceText);

  if (demoDraft) {
    return demoDraft;
  }

  const normalized = sourceText.replace(/\s+/g, ' ').replace(/^\s+|\s+$/g, '');

  return {
    faithful: normalized,
    voice: normalized,
    polish: normalized,
  };
}

function buildSegment(index: number, projectId: string, sourceText: string): DocumentSegment {
  const drafts = getDemoDrafts(sourceText);
  const finalText = drafts.polish;

  return {
    id: `seg_${index + 1}`,
    projectId,
    index,
    sourceText,
    translationDraft: drafts.faithful,
    voiceAdaptedDraft: drafts.voice,
    polishedDraft: drafts.polish,
    finalText,
    qaFindings: [],
    status: 'approved',
  };
}

function buildQaFindings(segments: DocumentSegment[], glossary: GlossaryEntry[]): QAFinding[] {
  const findings: QAFinding[] = [];

  for (const entry of glossary) {
    if (!entry.locked) {
      continue;
    }

    const sourceHit = segments.some((segment) => segment.sourceText.includes(entry.sourceTerm));
    const targetHit = segments.some((segment) => segment.finalText?.includes(entry.targetTerm));

    if (sourceHit && !targetHit) {
      findings.push({
        id: `qa-${entry.id}`,
        severity: 'critical',
        category: 'terminology',
        issue: `Locked glossary term ${entry.sourceTerm} must remain capitalized as ${entry.targetTerm}.`,
        suggestion: `Lock the term in the glossary and re-check final output.`,
        resolved: false,
      });
    }
  }

  if (segments.some((segment) => segment.translationDraft === segment.sourceText)) {
    findings.push({
      id: 'qa-fallback-translation',
      severity: 'warning',
      category: 'style_drift',
      issue: 'One or more segments still match the source text after the faithful pass.',
      suggestion: 'Replace the fallback translation with a language-specific draft.',
      resolved: false,
    });
  }

  return findings;
}

function buildPipelineStages(qaFindings: QAFinding[]): PipelineStage[] {
  const qaApproved = qaFindings.length === 0;

  return PIPELINE_LABELS.map((label, index) => ({
    label,
    status: index < 4 ? 'approved' : qaApproved ? 'approved' : 'running',
  }));
}

export function buildStudioShellProject(seed: TranslationWorkspaceSeed): StudioShellProject {
  const sourceSegments = splitSourceText(seed.sourceText);
  const segments = sourceSegments.map((segmentText, index) =>
    buildSegment(index, seed.projectId, segmentText),
  );
  const qaFindings = buildQaFindings(segments, seed.glossary);
  const pipelineStages = buildPipelineStages(qaFindings);
  const progress = qaFindings.length === 0 ? 100 : 80;

  return {
    title: seed.title,
    contentType: seed.contentType,
    targetLanguage: seed.targetLanguage,
    progress,
    segments: segments.map((segment) => ({
      ...segment,
      qaFindings: qaFindings.filter((finding) => finding.category === 'terminology'),
    })),
    glossary: seed.glossary,
    qaFindings,
    pipelineStages,
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
