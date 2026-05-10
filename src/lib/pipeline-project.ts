import type { QAFinding, SegmentStatus } from '@/lib/domain';

import type { StudioShellProject, TranslationWorkspaceSeed } from './workspace';
import { splitSourceText, type SegmentDraft } from './pipeline-core';
import { createSegmentDrafts } from './pipeline-core';

function stageStatus(hasValues: boolean, hasIssues: boolean): SegmentStatus {
  if (!hasValues) {
    return 'pending';
  }

  return hasIssues ? 'reviewed' : 'approved';
}

function buildPipelineStages(segments: SegmentDraft[]) {
  const hasSegments = segments.length > 0;
  const hasSourceAnalysis = segments.every((segment) => segment.sourceAnalysis.length > 0);
  const hasFaithfulDraft = segments.every((segment) => segment.translationDraft.length > 0);
  const hasVoiceDraft = segments.every((segment) => segment.voiceAdaptedDraft.length > 0);
  const hasPolishedDraft = segments.every((segment) => segment.polishedDraft.length > 0);
  const hasQaFindings = segments.some((segment) => segment.qaFindings.length > 0);

  return [
    { label: 'Source prep', status: stageStatus(hasSegments && hasSourceAnalysis, false) },
    { label: 'Faithful', status: stageStatus(hasSegments && hasFaithfulDraft, false) },
    { label: 'Voice', status: stageStatus(hasSegments && hasVoiceDraft, false) },
    { label: 'Polish', status: stageStatus(hasSegments && hasPolishedDraft, false) },
    { label: 'QA', status: stageStatus(hasSegments, hasQaFindings) },
  ] as const;
}

function buildProjectProgress(segments: SegmentDraft[]): number {
  if (segments.length === 0) {
    return 0;
  }

  const approvedSegments = segments.filter((segment) => segment.qaFindings.length === 0).length;

  return Math.round((approvedSegments / segments.length) * 100);
}

function buildProjectQaFindings(segments: SegmentDraft[]): QAFinding[] {
  return segments.flatMap((segment) => segment.qaFindings);
}

function buildDocumentSegment(projectId: string, index: number, draft: SegmentDraft) {
  return {
    id: `${projectId}-seg-${index + 1}`,
    projectId,
    index,
    sourceText: draft.sourceText,
    sourceAnalysis: draft.sourceAnalysis,
    sourceNotes: undefined,
    translationDraft: draft.translationDraft,
    voiceAdaptedDraft: draft.voiceAdaptedDraft,
    polishedDraft: draft.polishedDraft,
    finalText: draft.finalText,
    qaFindings: draft.qaFindings,
    status: draft.qaFindings.length > 0 ? 'reviewed' : 'approved',
  } as const;
}

function formatFinding(finding: QAFinding): string {
  const suggestion = finding.suggestion ? ` Suggestion: ${finding.suggestion}` : '';

  return `- [${finding.severity}] ${finding.category}: ${finding.issue}${suggestion}`;
}

function formatSegmentMarkdown(segment: StudioShellProject['segments'][number]): string {
  const findingBlock =
    segment.qaFindings.length > 0
      ? segment.qaFindings.map(formatFinding).join('\n')
      : '- No QA findings.';

  return [
    `### Segment ${segment.index + 1}`,
    '',
    `Source: ${segment.sourceText}`,
    '',
    `Source analysis: ${segment.sourceAnalysis}`,
    '',
    `Faithful draft: ${segment.translationDraft ?? 'N/A'}`,
    '',
    `Voice draft: ${segment.voiceAdaptedDraft ?? 'N/A'}`,
    '',
    `Polished draft: ${segment.polishedDraft ?? 'N/A'}`,
    '',
    `Final text: ${segment.finalText ?? 'N/A'}`,
    '',
    'QA findings:',
    findingBlock,
  ].join('\n');
}

export function buildStudioShellProject(
  seed: TranslationWorkspaceSeed,
  drafts: SegmentDraft[] = createSegmentDrafts(seed.sourceText),
): StudioShellProject {
  const sourceSegments = splitSourceText(seed.sourceText);

  if (sourceSegments.length !== drafts.length) {
    throw new Error('Segment draft count does not match the source text.');
  }

  const segments = drafts.map((draft, index) => buildDocumentSegment(seed.projectId, index, draft));

  return {
    title: seed.title,
    contentType: seed.contentType,
    targetLanguage: seed.targetLanguage,
    progress: buildProjectProgress(drafts),
    segments,
    glossary: seed.glossary,
    qaFindings: buildProjectQaFindings(drafts),
    pipelineStages: buildPipelineStages(drafts),
  };
}

export function exportProjectMarkdown(project: StudioShellProject): string {
  const segmentBlocks = project.segments.map(formatSegmentMarkdown).join('\n\n');
  const glossaryBlock =
    project.glossary.length > 0
      ? project.glossary
          .map(
            (entry) =>
              `- ${entry.sourceTerm} -> ${entry.targetTerm}${entry.locked ? ' (locked)' : ''}`,
          )
          .join('\n')
      : '- No glossary entries.';

  const qaSummary =
    project.qaFindings.length > 0
      ? project.qaFindings.map(formatFinding).join('\n')
      : '- No project-level QA findings.';

  return [
    `# ${project.title}`,
    '',
    `- Content type: ${project.contentType}`,
    `- Target language: ${project.targetLanguage.label}`,
    `- Progress: ${project.progress}%`,
    '',
    '## Glossary',
    glossaryBlock,
    '',
    '## Segments',
    segmentBlocks,
    '',
    '## Project QA',
    qaSummary,
  ].join('\n');
}
