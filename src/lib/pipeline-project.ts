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

function hasUnresolvedFindings(findings: QAFinding[]): boolean {
  return findings.some((finding) => !finding.resolved);
}

function hasUnresolvedCategoryFindings(
  findings: QAFinding[],
  categories: ReadonlyArray<QAFinding['category']>,
): boolean {
  return findings.some((finding) => !finding.resolved && categories.includes(finding.category));
}

function hasFinalText(finalText: string | undefined): boolean {
  return (finalText ?? '').trim().length > 0;
}

function buildPipelineStages(segments: SegmentDraft[]) {
  const hasSegments = segments.length > 0;
  const hasFaithfulDraft = segments.every((segment) => segment.translationDraft.length > 0);
  const hasVoiceDraft = segments.every((segment) => segment.voiceAdaptedDraft.length > 0);
  const hasNaturalnessDraft = segments.every(
    (segment) => segment.literaryNaturalnessDraft.length > 0,
  );
  const hasPolishedDraft = segments.every((segment) => segment.polishedDraft.length > 0);
  const hasProfessionalCopyeditDraft = segments.every(
    (segment) => segment.professionalLiteraryCopyeditDraft.length > 0,
  );
  const hasTenseAspectFindings = segments.some((segment) =>
    hasUnresolvedCategoryFindings(segment.qaFindings, ['tense_aspect_drift']),
  );
  const hasImageFindings = segments.some((segment) =>
    hasUnresolvedCategoryFindings(segment.qaFindings, ['image_drift', 'motion_image_drift']),
  );
  const hasGrammarFlowFindings = segments.some((segment) =>
    hasUnresolvedCategoryFindings(segment.qaFindings, ['grammar_flow', 'punctuation_flow']),
  );
  const hasEmotionalIntensityFindings = segments.some((segment) =>
    hasUnresolvedCategoryFindings(segment.qaFindings, ['emotional_intensity_drift']),
  );
  const hasStiffnessFindings = segments.some((segment) =>
    hasUnresolvedCategoryFindings(segment.qaFindings, [
      'translation_stiffness',
      'family_term_naturalness',
      'style_drift',
      'tone_shift',
      'market_quality',
      'character_voice',
    ]),
  );
  const hasCulturalTextureFindings = segments.some((segment) =>
    hasUnresolvedCategoryFindings(segment.qaFindings, ['cultural_texture_drift']),
  );
  const pipelineStages: StudioShellProject['pipelineStages'] = [
    { label: 'Faithful translation', status: stageStatus(hasSegments && hasFaithfulDraft, false) },
    { label: 'Voice adaptation', status: stageStatus(hasSegments && hasVoiceDraft, false) },
    {
      label: 'Literary naturalness',
      status: stageStatus(hasSegments && hasNaturalnessDraft, false),
    },
    {
      label: 'Tense/aspect/perspective QA',
      status: stageStatus(hasSegments, hasTenseAspectFindings),
    },
    { label: 'Image drift QA', status: stageStatus(hasSegments, hasImageFindings) },
    { label: 'Grammar flow QA', status: stageStatus(hasSegments, hasGrammarFlowFindings) },
    {
      label: 'Emotional intensity QA',
      status: stageStatus(hasSegments, hasEmotionalIntensityFindings),
    },
    { label: 'Translation stiffness QA', status: stageStatus(hasSegments, hasStiffnessFindings) },
    { label: 'Cultural texture QA', status: stageStatus(hasSegments, hasCulturalTextureFindings) },
    { label: 'Final polish', status: stageStatus(hasSegments && hasPolishedDraft, false) },
    {
      label: 'Professional literary copyedit',
      status: stageStatus(hasSegments && hasProfessionalCopyeditDraft, false),
    },
  ];

  return pipelineStages;
}

function buildProjectProgress(segments: SegmentDraft[]): number {
  if (segments.length === 0) {
    return 0;
  }

  const completedSegments = segments.filter((segment) => hasFinalText(segment.finalText)).length;

  return Math.round((completedSegments / segments.length) * 100);
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
    literaryNaturalnessDraft: draft.literaryNaturalnessDraft,
    polishedDraft: draft.polishedDraft,
    professionalLiteraryCopyeditDraft: draft.professionalLiteraryCopyeditDraft,
    finalText: draft.finalText,
    finalTextLocked: false,
    qaFindings: draft.qaFindings,
    status: hasUnresolvedFindings(draft.qaFindings) ? 'reviewed' : 'approved',
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
    `Naturalness draft: ${segment.literaryNaturalnessDraft ?? 'N/A'}`,
    '',
    `Polished draft: ${segment.polishedDraft ?? 'N/A'}`,
    '',
    `Professional copyedit draft: ${segment.professionalLiteraryCopyeditDraft ?? 'N/A'}`,
    '',
    `Final text: ${segment.finalText ?? 'N/A'}`,
    '',
    'QA findings:',
    findingBlock,
  ].join('\n');
}

export function buildStudioShellProject(
  seed: TranslationWorkspaceSeed,
  drafts: SegmentDraft[] = createSegmentDrafts(seed.sourceText, seed.segmentationStrategy),
): StudioShellProject {
  const sourceSegments = splitSourceText(seed.sourceText, seed.segmentationStrategy);

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
