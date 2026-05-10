'use client';

import { useEffect, useState, type ReactElement } from 'react';

import type { AlertColor } from '@mui/material';
import { Stack } from '@mui/material';

import { StudioShell } from '@/components/studio-shell';
import {
  buildSegmentQaFindings,
  buildStudioShellProject,
  exportProjectJson,
  exportProjectMarkdown,
  exportProjectQaReportMarkdown,
  splitSourceText,
} from '@/lib/pipeline';
import type { DocumentSegment, GlossaryEntry } from '@/lib/domain';
import type {
  SegmentationStrategy,
  StudioShellProject,
  TranslationWorkspaceSeed,
} from '@/lib/workspace';

import { WorkspaceControls } from './workspace-controls';

type TranslationWorkspaceProps = {
  apiKeyConfigured: boolean;
  activeRuntimeModelLabel: string;
  initialSeed: TranslationWorkspaceSeed;
};

type TranslationWorkspaceResponse = {
  project: StudioShellProject;
  mode: 'openai' | 'poe' | 'fallback';
  message?: string;
};

type StatusNotice = {
  message: string;
  severity: AlertColor;
};

type PersistedWorkspaceState = {
  sourceText: string;
  segmentationStrategy: SegmentationStrategy;
  project: StudioShellProject;
};

const workspaceStorageKey = 'translator.workspace.v1';

type TranslationWorkspaceViewProps = {
  apiKeyConfigured: boolean;
  activeRuntimeModelLabel: string;
  sourceText: string;
  segmentationStrategy: SegmentationStrategy;
  segmentPreviewCount: number;
  editableSegments: string[];
  project: StudioShellProject;
  isRunning: boolean;
  runElapsedSeconds: number;
  statusMessage?: string;
  statusSeverity?: AlertColor;
  onSourceTextChange: (value: string) => void;
  onSegmentationStrategyChange: (value: SegmentationStrategy) => void;
  onEditableSegmentChange: (index: number, value: string) => void;
  onEditableSegmentAdd: () => void;
  onEditableSegmentRemove: (index: number) => void;
  onSplitSourceByLineBreaks: () => void;
  onImportText: (value: string, fileName: string) => void;
  onRunPipeline: () => void;
  onExportMarkdown: () => void;
  onExportQaReport: () => void;
  onExportProjectJson: () => void;
  onCopyFinalText: () => void;
  onCopyQaSummary: () => void;
  onQaFindingResolvedChange: (findingId: string, resolved: boolean) => void;
  onSegmentFinalTextChange: (segmentId: string, value: string) => void;
  onSegmentFinalTextLockChange: (segmentId: string, locked: boolean) => void;
  onGlossaryEntryAdd: () => void;
  onGlossaryEntryUpdate: (entryId: string, patch: Partial<GlossaryEntry>) => void;
  onGlossaryEntryRemove: (entryId: string) => void;
};

function buildFinalTranslationText(project: StudioShellProject): string {
  return project.segments
    .map((segment) => segment.finalText?.trim())
    .filter((text): text is string => Boolean(text))
    .join('\n\n');
}

function buildQaSummaryText(project: StudioShellProject): string {
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

function hasUnresolvedQaFindings(findings: DocumentSegment['qaFindings']): boolean {
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

function updateProjectFromSegments(
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

function updateSegmentQa(segment: DocumentSegment, finalText: string): DocumentSegment {
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

function mergeLockedSegments(
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

function findLockedConflicts(
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

function deriveImportedTitle(fileName: string, fallbackTitle: string): string {
  const baseName = fileName
    .replace(/\.[^.]+$/, '')
    .replace(/[-_]+/g, ' ')
    .trim();

  return baseName.length > 0 ? baseName : fallbackTitle;
}

function buildInitialStatus(apiKeyConfigured: boolean): StatusNotice {
  return apiKeyConfigured
    ? { message: 'Ready to call the configured model provider.', severity: 'info' }
    : {
        message:
          'Provider key missing. Demo fallback only; do not treat output as production translation.',
        severity: 'warning',
      };
}

function buildFallbackStatus(message?: string): StatusNotice {
  return {
    message:
      message ??
      'The configured model provider is unavailable. Showing demo fallback drafts only; review before using.',
    severity: 'warning',
  };
}

function buildImportedSeed(
  initialSeed: TranslationWorkspaceSeed,
  importedText: string,
  fileName: string,
  segmentationStrategy: SegmentationStrategy,
): TranslationWorkspaceSeed {
  return {
    ...initialSeed,
    title: deriveImportedTitle(fileName, initialSeed.title),
    sourceText: importedText,
    segmentationStrategy,
  };
}

function resolveSegmentationStrategy(value: unknown): SegmentationStrategy {
  if (value === 'paragraph' || value === 'scene_markers' || value === 'hybrid') {
    return value;
  }

  return 'paragraph';
}

function joinSegmentsAsSourceText(
  segments: string[],
  segmentationStrategy: SegmentationStrategy,
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

function splitBySingleLineBreaks(sourceText: string): string[] {
  return sourceText
    .replace(/\r\n?/g, '\n')
    .split(/\n+/)
    .map((line) => line.trim())
    .filter((line) => line.length > 0);
}

function canUseLocalStorage(): boolean {
  return typeof window !== 'undefined' && typeof window.localStorage !== 'undefined';
}

function loadPersistedWorkspaceState(): PersistedWorkspaceState | null {
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

function persistWorkspaceState(state: PersistedWorkspaceState): void {
  if (!canUseLocalStorage()) {
    return;
  }

  try {
    window.localStorage.setItem(workspaceStorageKey, JSON.stringify(state));
  } catch {
    // Ignore quota and serialization errors to avoid blocking editing.
  }
}

function sanitizeFileBaseName(title: string): string {
  return title.replace(/\s+/g, '-').toLowerCase();
}

function downloadTextFile(content: string, fileName: string, mimeType: string): void {
  const blob = new Blob([content], { type: `${mimeType};charset=utf-8` });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');

  anchor.href = url;
  anchor.download = fileName;
  anchor.click();
  URL.revokeObjectURL(url);
}

function TranslationWorkspaceView({
  apiKeyConfigured,
  activeRuntimeModelLabel,
  sourceText,
  segmentationStrategy,
  segmentPreviewCount,
  editableSegments,
  project,
  isRunning,
  runElapsedSeconds,
  statusMessage,
  statusSeverity,
  onSourceTextChange,
  onSegmentationStrategyChange,
  onEditableSegmentChange,
  onEditableSegmentAdd,
  onEditableSegmentRemove,
  onSplitSourceByLineBreaks,
  onImportText,
  onRunPipeline,
  onExportMarkdown,
  onExportQaReport,
  onExportProjectJson,
  onCopyFinalText,
  onCopyQaSummary,
  onQaFindingResolvedChange,
  onSegmentFinalTextChange,
  onSegmentFinalTextLockChange,
  onGlossaryEntryAdd,
  onGlossaryEntryUpdate,
  onGlossaryEntryRemove,
}: TranslationWorkspaceViewProps): ReactElement {
  return (
    <Stack spacing={3}>
      <WorkspaceControls
        sourceText={sourceText}
        contentType={project.contentType}
        targetLanguage={project.targetLanguage}
        segmentationStrategy={segmentationStrategy}
        segmentPreviewCount={segmentPreviewCount}
        editableSegments={editableSegments}
        isRunning={isRunning}
        runElapsedSeconds={runElapsedSeconds}
        statusMessage={statusMessage}
        statusSeverity={statusSeverity}
        onSourceTextChange={onSourceTextChange}
        onSegmentationStrategyChange={onSegmentationStrategyChange}
        onEditableSegmentChange={onEditableSegmentChange}
        onEditableSegmentAdd={onEditableSegmentAdd}
        onEditableSegmentRemove={onEditableSegmentRemove}
        onSplitSourceByLineBreaks={onSplitSourceByLineBreaks}
        onImportText={onImportText}
        onRunPipeline={onRunPipeline}
      />
      <StudioShell
        apiKeyConfigured={apiKeyConfigured}
        activeRuntimeModelLabel={activeRuntimeModelLabel}
        project={project}
        isRunning={isRunning}
        onRunPipeline={onRunPipeline}
        onExportMarkdown={onExportMarkdown}
        onExportQaReport={onExportQaReport}
        onExportProjectJson={onExportProjectJson}
        onCopyFinalText={onCopyFinalText}
        onCopyQaSummary={onCopyQaSummary}
        onQaFindingResolvedChange={onQaFindingResolvedChange}
        onSegmentFinalTextChange={onSegmentFinalTextChange}
        onSegmentFinalTextLockChange={onSegmentFinalTextLockChange}
        onGlossaryEntryAdd={onGlossaryEntryAdd}
        onGlossaryEntryUpdate={onGlossaryEntryUpdate}
        onGlossaryEntryRemove={onGlossaryEntryRemove}
      />
    </Stack>
  );
}

function createGlossaryEntryId(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }

  return `gl-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

export function TranslationWorkspace({
  apiKeyConfigured,
  activeRuntimeModelLabel,
  initialSeed,
}: TranslationWorkspaceProps): ReactElement {
  const persistedWorkspace = loadPersistedWorkspaceState();
  const defaultSegmentationStrategy =
    persistedWorkspace?.segmentationStrategy ?? initialSeed.segmentationStrategy ?? 'paragraph';
  const [sourceText, setSourceText] = useState(
    persistedWorkspace?.sourceText ?? initialSeed.sourceText,
  );
  const [segmentationStrategy, setSegmentationStrategy] = useState<SegmentationStrategy>(
    defaultSegmentationStrategy,
  );
  const [project, setProject] = useState<StudioShellProject>(
    persistedWorkspace?.project ??
      buildStudioShellProject({
        ...initialSeed,
        segmentationStrategy: defaultSegmentationStrategy,
      }),
  );
  const [isRunning, setIsRunning] = useState(false);
  const [runStartedAt, setRunStartedAt] = useState<number | null>(null);
  const [now, setNow] = useState(() => Date.now());
  const [statusNotice, setStatusNotice] = useState<StatusNotice | undefined>(
    persistedWorkspace
      ? {
          message: 'Restored the previous workspace session.',
          severity: 'info',
        }
      : buildInitialStatus(apiKeyConfigured),
  );

  useEffect(() => {
    persistWorkspaceState({ sourceText, segmentationStrategy, project });
  }, [project, segmentationStrategy, sourceText]);

  useEffect(() => {
    if (runStartedAt === null) {
      return undefined;
    }

    const intervalId = window.setInterval(() => {
      setNow(Date.now());
    }, 250);

    return () => {
      window.clearInterval(intervalId);
    };
  }, [runStartedAt]);

  const runElapsedSeconds = runStartedAt === null ? 0 : Math.floor((now - runStartedAt) / 1000);

  const handleRunPipeline = async (): Promise<void> => {
    setIsRunning(true);
    setRunStartedAt(Date.now());
    setStatusNotice(undefined);

    try {
      const response = await fetch('/api/translate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...initialSeed,
          title: project.title,
          sourceText,
          segmentationStrategy,
        }),
      });

      if (!response.ok) {
        throw new Error(`Pipeline request failed with status ${response.status}.`);
      }

      const result = (await response.json()) as TranslationWorkspaceResponse;
      const lockedConflictCount = findLockedConflicts(project, result.project);
      const canConfirmOverwrite =
        typeof window !== 'undefined' && typeof window.confirm === 'function';
      const shouldOverwriteLockedSegments =
        lockedConflictCount > 0 && canConfirmOverwrite
          ? window.confirm(
              `${lockedConflictCount} locked segment${lockedConflictCount > 1 ? 's have' : ' has'} new model output. Overwrite the locked final text?`,
            )
          : false;
      const nextProject =
        lockedConflictCount > 0 && !shouldOverwriteLockedSegments
          ? mergeLockedSegments(project, result.project)
          : result.project;
      const baseStatus =
        result.mode === 'fallback'
          ? buildFallbackStatus(result.message)
          : {
              message:
                result.mode === 'poe'
                  ? 'Translation completed with Poe.'
                  : 'Translation completed with OpenAI.',
              severity: 'success' as const,
            };
      const lockStatus =
        lockedConflictCount > 0 && !shouldOverwriteLockedSegments
          ? {
              message: `${lockedConflictCount} locked segment${lockedConflictCount > 1 ? 's were' : ' was'} preserved during re-run.`,
              severity: 'info' as const,
            }
          : undefined;

      setProject(nextProject);
      setStatusNotice(lockStatus ?? baseStatus);
    } catch (error) {
      setProject(
        buildStudioShellProject({
          ...initialSeed,
          title: project.title,
          sourceText,
          segmentationStrategy,
        }),
      );
      setStatusNotice(
        error instanceof Error
          ? buildFallbackStatus(`${error.message} Demo fallback only.`)
          : buildFallbackStatus(),
      );
    } finally {
      setIsRunning(false);
      setRunStartedAt(null);
    }
  };

  const handleImportText = (importedText: string, fileName: string): void => {
    const nextSeed = buildImportedSeed(initialSeed, importedText, fileName, segmentationStrategy);

    setSourceText(importedText);
    setProject(buildStudioShellProject(nextSeed));
    setStatusNotice({
      message: `Imported ${fileName}. Re-run the pipeline to refresh the translation passes.`,
      severity: 'info',
    });
  };

  const triggerRunPipeline = (): void => {
    void handleRunPipeline();
  };

  const editableSegments = splitSourceText(sourceText, segmentationStrategy);
  const segmentPreviewCount = editableSegments.length;

  const handleEditableSegmentChange = (index: number, value: string): void => {
    const nextSegments = editableSegments.map((segment, segmentIndex) =>
      segmentIndex === index ? value : segment,
    );

    setSourceText(joinSegmentsAsSourceText(nextSegments, segmentationStrategy));
  };

  const handleEditableSegmentAdd = (): void => {
    const nextSegments = [...editableSegments, '(new segment)'];

    setSourceText(joinSegmentsAsSourceText(nextSegments, segmentationStrategy));
  };

  const handleEditableSegmentRemove = (index: number): void => {
    const nextSegments = editableSegments.filter((_, segmentIndex) => segmentIndex !== index);

    setSourceText(joinSegmentsAsSourceText(nextSegments, segmentationStrategy));
  };

  const handleSplitSourceByLineBreaks = (): void => {
    const lineBreakSegments = splitBySingleLineBreaks(sourceText);

    setSourceText(joinSegmentsAsSourceText(lineBreakSegments, segmentationStrategy));
    setStatusNotice({
      message: `Split source into ${lineBreakSegments.length} segment${lineBreakSegments.length === 1 ? '' : 's'} by line breaks.`,
      severity: 'info',
    });
  };

  const handleExportMarkdown = (): void => {
    downloadTextFile(
      exportProjectMarkdown(project),
      `${sanitizeFileBaseName(project.title)}.md`,
      'text/markdown',
    );
  };

  const handleExportQaReport = (): void => {
    downloadTextFile(
      exportProjectQaReportMarkdown(project),
      `${sanitizeFileBaseName(project.title)}.qa-report.md`,
      'text/markdown',
    );
  };

  const handleExportProjectJson = (): void => {
    downloadTextFile(
      exportProjectJson(project),
      `${sanitizeFileBaseName(project.title)}.json`,
      'application/json',
    );
  };

  const copyToClipboard = async (text: string, onSuccessMessage: string): Promise<void> => {
    if (!text.trim()) {
      setStatusNotice({
        message: 'Nothing to copy yet. Run the pipeline first.',
        severity: 'warning',
      });

      return;
    }

    if (!navigator.clipboard) {
      setStatusNotice({
        message: 'Clipboard API is unavailable in this browser context.',
        severity: 'warning',
      });

      return;
    }

    try {
      await navigator.clipboard.writeText(text);
      setStatusNotice({
        message: onSuccessMessage,
        severity: 'success',
      });
    } catch {
      setStatusNotice({
        message: 'Failed to copy to clipboard.',
        severity: 'warning',
      });
    }
  };

  const handleCopyFinalText = (): void => {
    const finalText = buildFinalTranslationText(project);

    void copyToClipboard(finalText, 'Final translation copied to clipboard.');
  };

  const handleCopyQaSummary = (): void => {
    const qaSummary = buildQaSummaryText(project);

    void copyToClipboard(qaSummary, 'QA summary copied to clipboard.');
  };

  const handleSegmentFinalTextChange = (segmentId: string, value: string): void => {
    setProject((currentProject) => {
      const segments = currentProject.segments.map((segment) =>
        segment.id === segmentId ? updateSegmentQa(segment, value) : segment,
      );

      return updateProjectFromSegments(currentProject, segments);
    });
  };

  const handleSegmentFinalTextLockChange = (segmentId: string, locked: boolean): void => {
    setProject((currentProject) => {
      const segments = currentProject.segments.map((segment) =>
        segment.id === segmentId ? { ...segment, finalTextLocked: locked } : segment,
      );

      return {
        ...currentProject,
        segments,
      };
    });
  };

  const handleQaFindingResolvedChange = (findingId: string, resolved: boolean): void => {
    setProject((currentProject) => {
      const segments = currentProject.segments.map((segment) => {
        if (!segment.qaFindings.some((finding) => finding.id === findingId)) {
          return segment;
        }

        const qaFindings = segment.qaFindings.map((finding) =>
          finding.id === findingId ? { ...finding, resolved } : finding,
        );
        const nextStatus: DocumentSegment['status'] = hasUnresolvedQaFindings(qaFindings)
          ? 'reviewed'
          : 'approved';

        return {
          ...segment,
          qaFindings,
          status: nextStatus,
        };
      });

      return updateProjectFromSegments(currentProject, segments);
    });
  };

  const handleGlossaryEntryAdd = (): void => {
    setProject((currentProject) => ({
      ...currentProject,
      glossary: [
        ...currentProject.glossary,
        {
          id: createGlossaryEntryId(),
          sourceTerm: '',
          targetTerm: '',
          category: 'other',
          locked: false,
        },
      ],
    }));
  };

  const handleGlossaryEntryUpdate = (entryId: string, patch: Partial<GlossaryEntry>): void => {
    setProject((currentProject) => ({
      ...currentProject,
      glossary: currentProject.glossary.map((entry) =>
        entry.id === entryId ? { ...entry, ...patch } : entry,
      ),
    }));
  };

  const handleGlossaryEntryRemove = (entryId: string): void => {
    setProject((currentProject) => ({
      ...currentProject,
      glossary: currentProject.glossary.filter((entry) => entry.id !== entryId),
    }));
  };

  return (
    <TranslationWorkspaceView
      apiKeyConfigured={apiKeyConfigured}
      activeRuntimeModelLabel={activeRuntimeModelLabel}
      sourceText={sourceText}
      segmentationStrategy={segmentationStrategy}
      segmentPreviewCount={segmentPreviewCount}
      editableSegments={editableSegments}
      project={project}
      isRunning={isRunning}
      runElapsedSeconds={runElapsedSeconds}
      statusMessage={statusNotice?.message}
      statusSeverity={statusNotice?.severity}
      onSourceTextChange={setSourceText}
      onSegmentationStrategyChange={setSegmentationStrategy}
      onEditableSegmentChange={handleEditableSegmentChange}
      onEditableSegmentAdd={handleEditableSegmentAdd}
      onEditableSegmentRemove={handleEditableSegmentRemove}
      onSplitSourceByLineBreaks={handleSplitSourceByLineBreaks}
      onImportText={handleImportText}
      onRunPipeline={triggerRunPipeline}
      onExportMarkdown={handleExportMarkdown}
      onExportQaReport={handleExportQaReport}
      onExportProjectJson={handleExportProjectJson}
      onCopyFinalText={handleCopyFinalText}
      onCopyQaSummary={handleCopyQaSummary}
      onQaFindingResolvedChange={handleQaFindingResolvedChange}
      onSegmentFinalTextChange={handleSegmentFinalTextChange}
      onSegmentFinalTextLockChange={handleSegmentFinalTextLockChange}
      onGlossaryEntryAdd={handleGlossaryEntryAdd}
      onGlossaryEntryUpdate={handleGlossaryEntryUpdate}
      onGlossaryEntryRemove={handleGlossaryEntryRemove}
    />
  );
}
