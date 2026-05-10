'use client';

import { useEffect, useState, type ReactElement } from 'react';

import type { AlertColor } from '@mui/material';
import { Stack } from '@mui/material';

import { StudioShell } from '@/components/studio-shell';
import {
  buildSegmentQaFindings,
  buildStudioShellProject,
  exportProjectMarkdown,
} from '@/lib/pipeline';
import type { DocumentSegment } from '@/lib/domain';
import type { StudioShellProject, TranslationWorkspaceSeed } from '@/lib/workspace';

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

type TranslationWorkspaceViewProps = {
  apiKeyConfigured: boolean;
  activeRuntimeModelLabel: string;
  sourceText: string;
  project: StudioShellProject;
  isRunning: boolean;
  runElapsedSeconds: number;
  statusMessage?: string;
  statusSeverity?: AlertColor;
  onSourceTextChange: (value: string) => void;
  onImportText: (value: string, fileName: string) => void;
  onRunPipeline: () => void;
  onExportMarkdown: () => void;
  onCopyFinalText: () => void;
  onCopyQaSummary: () => void;
  onQaFindingResolvedChange: (findingId: string, resolved: boolean) => void;
  onSegmentFinalTextChange: (segmentId: string, value: string) => void;
  onSegmentFinalTextLockChange: (segmentId: string, locked: boolean) => void;
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

  return {
    ...project,
    segments,
    qaFindings,
    progress,
    pipelineStages: project.pipelineStages.map((stage) =>
      stage.label === 'QA'
        ? { ...stage, status: stageStatus(segments.length > 0, hasQaFindings) }
        : stage,
    ),
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
): TranslationWorkspaceSeed {
  return {
    ...initialSeed,
    title: deriveImportedTitle(fileName, initialSeed.title),
    sourceText: importedText,
  };
}

function downloadMarkdown(project: StudioShellProject): void {
  const markdown = exportProjectMarkdown(project);
  const blob = new Blob([markdown], { type: 'text/markdown;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');

  anchor.href = url;
  anchor.download = `${project.title.replace(/\s+/g, '-').toLowerCase()}.md`;
  anchor.click();
  URL.revokeObjectURL(url);
}

function TranslationWorkspaceView({
  apiKeyConfigured,
  activeRuntimeModelLabel,
  sourceText,
  project,
  isRunning,
  runElapsedSeconds,
  statusMessage,
  statusSeverity,
  onSourceTextChange,
  onImportText,
  onRunPipeline,
  onExportMarkdown,
  onCopyFinalText,
  onCopyQaSummary,
  onQaFindingResolvedChange,
  onSegmentFinalTextChange,
  onSegmentFinalTextLockChange,
}: TranslationWorkspaceViewProps): ReactElement {
  return (
    <Stack spacing={3}>
      <WorkspaceControls
        sourceText={sourceText}
        contentType={project.contentType}
        targetLanguage={project.targetLanguage}
        isRunning={isRunning}
        runElapsedSeconds={runElapsedSeconds}
        statusMessage={statusMessage}
        statusSeverity={statusSeverity}
        onSourceTextChange={onSourceTextChange}
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
        onCopyFinalText={onCopyFinalText}
        onCopyQaSummary={onCopyQaSummary}
        onQaFindingResolvedChange={onQaFindingResolvedChange}
        onSegmentFinalTextChange={onSegmentFinalTextChange}
        onSegmentFinalTextLockChange={onSegmentFinalTextLockChange}
      />
    </Stack>
  );
}

export function TranslationWorkspace({
  apiKeyConfigured,
  activeRuntimeModelLabel,
  initialSeed,
}: TranslationWorkspaceProps): ReactElement {
  const [sourceText, setSourceText] = useState(initialSeed.sourceText);
  const [project, setProject] = useState<StudioShellProject>(() =>
    buildStudioShellProject(initialSeed),
  );
  const [isRunning, setIsRunning] = useState(false);
  const [runElapsedSeconds, setRunElapsedSeconds] = useState(0);
  const [statusNotice, setStatusNotice] = useState<StatusNotice | undefined>(
    buildInitialStatus(apiKeyConfigured),
  );

  useEffect(() => {
    if (!isRunning) {
      setRunElapsedSeconds(0);

      return;
    }

    const startedAt = Date.now();
    const intervalId = window.setInterval(() => {
      setRunElapsedSeconds(Math.floor((Date.now() - startedAt) / 1000));
    }, 250);

    return () => {
      window.clearInterval(intervalId);
    };
  }, [isRunning]);

  const handleRunPipeline = async (): Promise<void> => {
    setIsRunning(true);
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
      setProject(buildStudioShellProject({ ...initialSeed, title: project.title, sourceText }));
      setStatusNotice(
        error instanceof Error
          ? buildFallbackStatus(`${error.message} Demo fallback only.`)
          : buildFallbackStatus(),
      );
    } finally {
      setIsRunning(false);
    }
  };

  const handleImportText = (importedText: string, fileName: string): void => {
    const nextSeed = buildImportedSeed(initialSeed, importedText, fileName);

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

  const handleExportMarkdown = (): void => {
    downloadMarkdown(project);
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

  return (
    <TranslationWorkspaceView
      apiKeyConfigured={apiKeyConfigured}
      activeRuntimeModelLabel={activeRuntimeModelLabel}
      sourceText={sourceText}
      project={project}
      isRunning={isRunning}
      runElapsedSeconds={runElapsedSeconds}
      statusMessage={statusNotice?.message}
      statusSeverity={statusNotice?.severity}
      onSourceTextChange={setSourceText}
      onImportText={handleImportText}
      onRunPipeline={triggerRunPipeline}
      onExportMarkdown={handleExportMarkdown}
      onCopyFinalText={handleCopyFinalText}
      onCopyQaSummary={handleCopyQaSummary}
      onQaFindingResolvedChange={handleQaFindingResolvedChange}
      onSegmentFinalTextChange={handleSegmentFinalTextChange}
      onSegmentFinalTextLockChange={handleSegmentFinalTextLockChange}
    />
  );
}
