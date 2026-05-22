import type { AlertColor } from '@mui/material';

import type { DocumentSegment } from '@/lib/domain';
import { buildSegmentQaFindings, exportProjectMarkdown } from '@/lib/pipeline';
import type { StudioShellProject, TranslationWorkspaceSeed } from '@/lib/workspace';

export type StatusNotice = {
  message: string;
  severity: AlertColor;
};

export type PersistedWorkspaceState = {
  sourceText: string;
  segmentationStrategy: import('@/lib/workspace').SegmentationStrategy;
  project: StudioShellProject;
};

const workspaceStorageKey = 'translator.workspace.v1';

export function buildFinalTranslationText(project: StudioShellProject): string {
  return project.segments
    .map((segment) => segment.finalText?.trim())
    .filter((text): text is string => Boolean(text))
    .join('\n\n');
}

export function buildQaSummaryText(project: StudioShellProject): string {
  const findings = project.qaFindings.filter((finding) => !finding.resolved);

  if (findings.length === 0) {
    return 'No unresolved QA findings.';
  }

  return findings
    .map((finding) => {
      const suggestion = finding.suggestion ? ` Suggestion: ${finding.suggestion}` : '';

      return `- [${finding.severity}] ${finding.category}: ${finding.issue}${suggestion}`;
    })
    .join('\n');
}

export function hasUnresolvedQaFindings(findings: DocumentSegment['qaFindings']): boolean {
  return findings.some((finding) => !finding.resolved);
}

function hasUnresolvedQaCategories(
  findings: DocumentSegment['qaFindings'],
  categories: ReadonlyArray<DocumentSegment['qaFindings'][number]['category']>,
): boolean {
  return findings.some((finding) => !finding.resolved && categories.includes(finding.category));
}

function hasFinalText(finalText: string | undefined): boolean {
  return (finalText ?? '').trim().length > 0;
}

function stageStatus(hasValues: boolean, hasIssues: boolean): DocumentSegment['status'] {
  if (!hasValues) {
    return 'pending';
  }

  return hasIssues ? 'reviewed' : 'approved';
}

export function updateProjectFromSegments(
  project: StudioShellProject,
  segments: DocumentSegment[],
): StudioShellProject {
  const qaFindings = segments.flatMap((segment) => segment.qaFindings);
  const completedSegments = segments.filter((segment) => hasFinalText(segment.finalText)).length;
  const progress =
    segments.length === 0 ? 0 : Math.round((completedSegments / segments.length) * 100);
  const hasQaFindings = segments.some((segment) => hasUnresolvedQaFindings(segment.qaFindings));
  const hasFaithfulDraft = segments.every(
    (segment) => (segment.translationDraft ?? '').trim().length > 0,
  );
  const hasVoiceDraft = segments.every(
    (segment) => (segment.voiceAdaptedDraft ?? '').trim().length > 0,
  );
  const hasNaturalnessDraft = segments.every(
    (segment) => (segment.literaryNaturalnessDraft ?? '').trim().length > 0,
  );
  const hasPolishedDraft = segments.every(
    (segment) => (segment.polishedDraft ?? '').trim().length > 0,
  );
  const hasProfessionalCopyeditDraft = segments.every(
    (segment) => (segment.professionalLiteraryCopyeditDraft ?? '').trim().length > 0,
  );
  const hasTenseAspectFindings = segments.some((segment) =>
    hasUnresolvedQaCategories(segment.qaFindings, ['tense_aspect_drift']),
  );
  const hasImageFindings = segments.some((segment) =>
    hasUnresolvedQaCategories(segment.qaFindings, ['image_drift', 'motion_image_drift']),
  );
  const hasGrammarFlowFindings = segments.some((segment) =>
    hasUnresolvedQaCategories(segment.qaFindings, ['grammar_flow', 'punctuation_flow']),
  );
  const hasEmotionalIntensityFindings = segments.some((segment) =>
    hasUnresolvedQaCategories(segment.qaFindings, ['emotional_intensity_drift']),
  );
  const hasStiffnessFindings = segments.some((segment) =>
    hasUnresolvedQaCategories(segment.qaFindings, [
      'translation_stiffness',
      'family_term_naturalness',
      'style_drift',
      'tone_shift',
      'market_quality',
      'character_voice',
    ]),
  );
  const hasCulturalTextureFindings = segments.some((segment) =>
    hasUnresolvedQaCategories(segment.qaFindings, ['cultural_texture_drift']),
  );

  return {
    ...project,
    segments,
    qaFindings,
    progress,
    pipelineStages: project.pipelineStages.map((stage) => {
      if (stage.label === 'Faithful translation') {
        return { ...stage, status: stageStatus(segments.length > 0 && hasFaithfulDraft, false) };
      }

      if (stage.label === 'Voice adaptation') {
        return { ...stage, status: stageStatus(segments.length > 0 && hasVoiceDraft, false) };
      }

      if (stage.label === 'Literary naturalness') {
        return { ...stage, status: stageStatus(segments.length > 0 && hasNaturalnessDraft, false) };
      }

      if (stage.label === 'Tense/aspect/perspective QA') {
        return { ...stage, status: stageStatus(segments.length > 0, hasTenseAspectFindings) };
      }

      if (stage.label === 'Image drift QA') {
        return { ...stage, status: stageStatus(segments.length > 0, hasImageFindings) };
      }

      if (stage.label === 'Grammar flow QA') {
        return { ...stage, status: stageStatus(segments.length > 0, hasGrammarFlowFindings) };
      }

      if (stage.label === 'Emotional intensity QA') {
        return {
          ...stage,
          status: stageStatus(segments.length > 0, hasEmotionalIntensityFindings),
        };
      }

      if (stage.label === 'Translation stiffness QA') {
        return { ...stage, status: stageStatus(segments.length > 0, hasStiffnessFindings) };
      }

      if (stage.label === 'Cultural texture QA') {
        return { ...stage, status: stageStatus(segments.length > 0, hasCulturalTextureFindings) };
      }

      if (stage.label === 'Final polish') {
        return { ...stage, status: stageStatus(segments.length > 0 && hasPolishedDraft, false) };
      }

      if (stage.label === 'Professional literary copyedit') {
        return {
          ...stage,
          status: stageStatus(segments.length > 0 && hasProfessionalCopyeditDraft, false),
        };
      }

      if (stage.label === 'QA') {
        return { ...stage, status: stageStatus(segments.length > 0, hasQaFindings) };
      }

      return stage;
    }),
  };
}

export function updateSegmentQa(segment: DocumentSegment, finalText: string): DocumentSegment {
  const qaFindings = buildSegmentQaFindings(segment.sourceText, finalText, segment.index);

  return {
    ...segment,
    finalText,
    qaFindings,
    status: hasUnresolvedQaFindings(qaFindings) ? 'reviewed' : 'approved',
  };
}

function getMatchingSegment(
  currentProject: StudioShellProject,
  nextSegment: DocumentSegment,
): DocumentSegment | undefined {
  return currentProject.segments.find(
    (segment) =>
      segment.index === nextSegment.index && segment.sourceText === nextSegment.sourceText,
  );
}

export function mergeLockedSegments(
  currentProject: StudioShellProject,
  nextProject: StudioShellProject,
): StudioShellProject {
  const mergedSegments = nextProject.segments.map((nextSegment) => {
    const currentSegment = getMatchingSegment(currentProject, nextSegment);

    if (!currentSegment?.finalTextLocked) {
      return nextSegment;
    }

    const lockedFinalText = currentSegment.finalText ?? '';

    return {
      ...updateSegmentQa(nextSegment, lockedFinalText),
      finalTextLocked: true,
    };
  });

  return updateProjectFromSegments(nextProject, mergedSegments);
}

export function findLockedConflicts(
  currentProject: StudioShellProject,
  nextProject: StudioShellProject,
): number {
  return nextProject.segments.reduce((count, nextSegment) => {
    const currentSegment = getMatchingSegment(currentProject, nextSegment);

    if (!currentSegment?.finalTextLocked) {
      return count;
    }

    const lockedFinalText = currentSegment.finalText ?? '';
    const nextFinalText = nextSegment.finalText ?? '';

    return lockedFinalText !== nextFinalText ? count + 1 : count;
  }, 0);
}

export function deriveImportedTitle(fileName: string, fallbackTitle: string): string {
  const baseName = fileName
    .replace(/\.[^.]+$/, '')
    .replace(/[-_]+/g, ' ')
    .trim();

  return baseName.length > 0 ? baseName : fallbackTitle;
}

export function buildInitialStatus(apiKeyConfigured: boolean): StatusNotice {
  return apiKeyConfigured
    ? { message: 'Ready to call the configured model provider.', severity: 'info' }
    : {
        message:
          'Provider key missing. Demo fallback only; do not treat output as production translation.',
        severity: 'warning',
      };
}

export function buildFallbackStatus(message?: string): StatusNotice {
  return {
    message:
      message ??
      'The configured model provider is unavailable. Showing demo fallback drafts only; review before using.',
    severity: 'warning',
  };
}

export function buildProviderStatus(
  provider: import('@/lib/model-options').ModelProvider,
  apiKeyConfigured: boolean,
): StatusNotice {
  if (apiKeyConfigured) {
    return {
      message: `${provider === 'poe' ? 'Poe' : 'OpenAI'} is ready for translation runs.`,
      severity: 'info',
    };
  }

  return {
    message:
      provider === 'poe'
        ? 'Poe API key missing. Demo fallback only; do not treat output as production translation.'
        : 'OpenAI API key missing. Demo fallback only; do not treat output as production translation.',
    severity: 'warning',
  };
}

export function formatRuntimeModelLabel(
  provider: import('@/lib/model-options').ModelProvider,
  model: string,
): string {
  return `${provider === 'poe' ? 'Poe' : 'OpenAI'} • ${model}`;
}

export function buildImportedSeed(
  initialSeed: TranslationWorkspaceSeed,
  importedText: string,
  fileName: string,
  segmentationStrategy: import('@/lib/workspace').SegmentationStrategy,
): TranslationWorkspaceSeed {
  return {
    ...initialSeed,
    title: deriveImportedTitle(fileName, initialSeed.title),
    sourceText: importedText,
    segmentationStrategy,
  };
}

export function resolveSegmentationStrategy(
  value: unknown,
): import('@/lib/workspace').SegmentationStrategy {
  if (value === 'paragraph' || value === 'scene_markers' || value === 'hybrid') {
    return value;
  }

  return 'paragraph';
}

export function joinSegmentsAsSourceText(
  segments: string[],
  segmentationStrategy: import('@/lib/workspace').SegmentationStrategy,
): string {
  const normalized = segments
    .map((segment) => segment.trim())
    .filter((segment) => segment.length > 0);

  if (normalized.length === 0) {
    return '';
  }

  const separator = segmentationStrategy === 'paragraph' ? '\n\n' : '\n\n***\n\n';

  return normalized.join(separator);
}

export function splitBySingleLineBreaks(sourceText: string): string[] {
  return sourceText
    .replace(/\r\n?/g, '\n')
    .split(/\n+/)
    .map((line) => line.trim())
    .filter((line) => line.length > 0);
}

function canUseLocalStorage(): boolean {
  return typeof window !== 'undefined' && typeof window.localStorage !== 'undefined';
}

export function loadPersistedWorkspaceState(): PersistedWorkspaceState | null {
  if (!canUseLocalStorage()) {
    return null;
  }

  try {
    const raw = window.localStorage.getItem(workspaceStorageKey);

    if (!raw) {
      return null;
    }

    const parsed = JSON.parse(raw) as unknown;

    if (!parsed || typeof parsed !== 'object') {
      return null;
    }

    const record = parsed as Record<string, unknown>;

    if (
      typeof record.sourceText !== 'string' ||
      !record.project ||
      typeof record.project !== 'object'
    ) {
      return null;
    }

    return {
      sourceText: record.sourceText,
      segmentationStrategy: resolveSegmentationStrategy(record.segmentationStrategy),
      project: record.project as StudioShellProject,
    };
  } catch {
    return null;
  }
}

export function persistWorkspaceState(state: PersistedWorkspaceState): void {
  if (!canUseLocalStorage()) {
    return;
  }

  try {
    window.localStorage.setItem(workspaceStorageKey, JSON.stringify(state));
  } catch {
    // Ignore quota and serialization errors to avoid blocking editing.
  }
}

export function downloadMarkdown(project: StudioShellProject): void {
  const markdown = exportProjectMarkdown(project);
  const blob = new Blob([markdown], { type: 'text/markdown;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');

  anchor.href = url;
  anchor.download = `${project.title.replace(/\s+/g, '-').toLowerCase()}.md`;
  anchor.click();
  URL.revokeObjectURL(url);
}

export function createGlossaryEntryId(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }

  return `gl-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}
