/* eslint-disable max-lines, max-lines-per-function -- this workspace orchestrator intentionally keeps the route-level persistence, history, and translation controls together */
'use client';

import { useEffect, useRef, useState, type ReactElement } from 'react';

import type { AlertColor } from '@mui/material';
import { Stack } from '@mui/material';

import { StudioShell } from '@/components/studio-shell';
import {
  buildDefaultStyleProfile,
  buildStudioShellProject,
  exportProjectJson,
  exportProjectMarkdown,
  exportProjectQaReportMarkdown,
  splitSourceText,
} from '@/lib/pipeline';
import type { DocumentSegment, GlossaryEntry, StyleProfile } from '@/lib/domain';
import {
  getDefaultModelId,
  type ModelProvider,
  type ProviderModelOptions,
} from '@/lib/model-options';
import type {
  SegmentationStrategy,
  StudioShellProject,
  TranslationWorkspaceSeed,
} from '@/lib/workspace';
import {
  contentTypeOptions,
  getTargetLanguageConfig,
  targetLanguageOptions,
} from '@/lib/workspace-options';
import {
  loadTranslationHistoryEntries,
  loadTranslationHistoryEntry,
  restoreTranslationHistoryEntry,
  saveTranslationHistoryEntry,
  type TranslationHistoryEntryInput,
  type TranslationHistoryMode,
  type TranslationHistorySummary,
} from '@/lib/translation-history';

import { TranslationHistoryPanel } from './translation-history-panel';
import { WorkspaceControls } from './workspace-controls';
import {
  buildFinalTranslationText,
  buildQaSummaryText,
  deriveImportedTitle,
  buildFallbackStatus,
  buildProviderStatus,
  formatRuntimeModelLabel,
  findLockedConflicts,
  hasUnresolvedQaFindings,
  mergeLockedSegments,
  updateProjectFromSegments,
  updateSegmentQa,
} from './translation-workspace-utils';

type TranslationWorkspaceProps = {
  providerAvailability: Record<ModelProvider, boolean>;
  initialProvider: ModelProvider;
  initialModel: string;
  initialSeed: TranslationWorkspaceSeed;
};

type TranslationWorkspaceResponse = {
  project: StudioShellProject;
  mode: TranslationHistoryMode;
  message?: string;
  warnings: string[];
};

type StatusNotice = {
  message: string;
  severity: AlertColor;
};

type PersistedWorkspaceState = {
  sourceText: string;
  segmentationStrategy: SegmentationStrategy;
  project: StudioShellProject;
  provider?: ModelProvider;
  model?: string;
};

const workspaceStorageKey = 'translator.workspace.v1';

function buildTranslationHistoryInput(args: {
  initialSeed: TranslationWorkspaceSeed;
  sourceText: string;
  segmentationStrategy: SegmentationStrategy;
  project: StudioShellProject;
  provider: ModelProvider;
  model: string;
  mode: TranslationHistoryMode;
  message?: string;
  warnings: string[];
}): TranslationHistoryEntryInput {
  const {
    initialSeed,
    sourceText,
    segmentationStrategy,
    project,
    provider,
    model,
    mode,
    message,
    warnings,
  } = args;

  return {
    sourceLanguageCode: initialSeed.sourceLanguageCode,
    sourceText,
    segmentationStrategy,
    project,
    provider,
    model,
    mode,
    message,
    warnings,
  };
}

type TranslationPipelineCompletionState = {
  nextProject: StudioShellProject;
  statusNotice: StatusNotice;
  warnings: string[];
  historyInput: TranslationHistoryEntryInput;
};

function buildSuccessfulPipelineCompletionState(args: {
  initialSeed: TranslationWorkspaceSeed;
  currentProject: StudioShellProject;
  sourceText: string;
  segmentationStrategy: SegmentationStrategy;
  provider: ModelProvider;
  resolvedModel: string;
  result: TranslationWorkspaceResponse;
}): TranslationPipelineCompletionState {
  const {
    initialSeed,
    currentProject,
    sourceText,
    segmentationStrategy,
    provider,
    resolvedModel,
    result,
  } = args;
  const lockedConflictCount = findLockedConflicts(currentProject, result.project);
  const canConfirmOverwrite = typeof window !== 'undefined' && typeof window.confirm === 'function';
  const shouldOverwriteLockedSegments =
    lockedConflictCount > 0 && canConfirmOverwrite
      ? window.confirm(
          `${lockedConflictCount} locked segment${lockedConflictCount > 1 ? 's have' : ' has'} new model output. Overwrite the locked final text?`,
        )
      : false;
  const nextProject =
    lockedConflictCount > 0 && !shouldOverwriteLockedSegments
      ? mergeLockedSegments(currentProject, result.project)
      : result.project;
  const baseStatus =
    result.mode === 'fallback'
      ? buildFallbackStatus(result.message)
      : result.message
        ? {
            message: result.message,
            severity: 'warning' as const,
          }
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

  return {
    nextProject,
    statusNotice: lockStatus ?? baseStatus,
    warnings: result.warnings ?? [],
    historyInput: buildTranslationHistoryInput({
      initialSeed,
      sourceText,
      segmentationStrategy,
      project: nextProject,
      provider,
      model: resolvedModel,
      mode: result.mode,
      message: result.message,
      warnings: result.warnings ?? [],
    }),
  };
}

function buildFallbackPipelineCompletionState(args: {
  initialSeed: TranslationWorkspaceSeed;
  currentProject: StudioShellProject;
  sourceText: string;
  segmentationStrategy: SegmentationStrategy;
  provider: ModelProvider;
  resolvedModel: string;
  error: unknown;
}): TranslationPipelineCompletionState {
  const {
    initialSeed,
    currentProject,
    sourceText,
    segmentationStrategy,
    provider,
    resolvedModel,
    error,
  } = args;
  const nextSeed = {
    ...initialSeed,
    title: currentProject.title,
    contentType: currentProject.contentType,
    targetLanguage: currentProject.targetLanguage,
    glossary: currentProject.glossary,
    styleProfile: currentProject.styleProfile,
    sourceText,
    segmentationStrategy,
    provider,
    model: resolvedModel,
  };
  const nextProject = buildStudioShellProject(nextSeed);
  const statusNotice =
    error instanceof Error
      ? buildFallbackStatus(`${error.message} Demo fallback only.`)
      : buildFallbackStatus();

  return {
    nextProject,
    statusNotice,
    warnings: [],
    historyInput: buildTranslationHistoryInput({
      initialSeed,
      sourceText,
      segmentationStrategy,
      project: nextProject,
      provider,
      model: resolvedModel,
      mode: 'fallback',
      message: statusNotice.message,
      warnings: [],
    }),
  };
}

type TranslationWorkspaceViewProps = {
  apiKeyConfigured: boolean;
  activeRuntimeModelLabel: string;
  selectedProvider: ModelProvider;
  selectedModel: string;
  providerOptions: Record<ModelProvider, ProviderModelOptions | null>;
  sourceText: string;
  contentTypeOptions: typeof contentTypeOptions;
  targetLanguageOptions: typeof targetLanguageOptions;
  segmentationStrategy: SegmentationStrategy;
  segmentPreviewCount: number;
  editableSegments: string[];
  project: StudioShellProject;
  isRunning: boolean;
  runElapsedSeconds: number;
  statusMessage?: string;
  statusSeverity?: AlertColor;
  pipelineWarnings: string[];
  historyEntries: TranslationHistorySummary[];
  historyReady: boolean;
  selectedRecoverySegmentIndex: number | null;
  onSourceTextChange: (value: string) => void;
  onContentTypeChange: (value: StudioShellProject['contentType']) => void;
  onTargetLanguageChange: (value: StudioShellProject['targetLanguage']) => void;
  onSegmentationStrategyChange: (value: SegmentationStrategy) => void;
  onProviderChange: (value: ModelProvider) => void;
  onModelChange: (value: string) => void;
  onEditableSegmentChange: (index: number, value: string) => void;
  onEditableSegmentAdd: () => void;
  onEditableSegmentRemove: (index: number) => void;
  onSplitSourceByLineBreaks: () => void;
  onImportText: (value: string, fileName: string) => void;
  onRunPipeline: () => void;
  onReviewSegment: (segmentIndex: number) => void;
  onOpenHistoryEntry: (entryId: string) => void;
  onExportMarkdown: () => void;
  onExportQaReport: () => void;
  onExportProjectJson: () => void;
  onCopyFinalText: () => void;
  onCopyQaSummary: () => void;
  onStyleProfileUpdate: (patch: Partial<StyleProfile>) => void;
  onQaFindingResolvedChange: (findingId: string, resolved: boolean) => void;
  onSegmentFinalTextChange: (segmentId: string, value: string) => void;
  onSegmentFinalTextLockChange: (segmentId: string, locked: boolean) => void;
  onGlossaryEntryAdd: () => void;
  onGlossaryEntryUpdate: (entryId: string, patch: Partial<GlossaryEntry>) => void;
  onGlossaryEntryRemove: (entryId: string) => void;
};

function buildImportedSeed(args: {
  initialSeed: TranslationWorkspaceSeed;
  currentProject: StudioShellProject;
  importedText: string;
  fileName: string;
  segmentationStrategy: SegmentationStrategy;
}): TranslationWorkspaceSeed {
  const { initialSeed, currentProject, importedText, fileName, segmentationStrategy } = args;

  return {
    ...initialSeed,
    contentType: currentProject.contentType,
    title: deriveImportedTitle(fileName, initialSeed.title),
    sourceText: importedText,
    segmentationStrategy,
    targetLanguage: currentProject.targetLanguage,
    glossary: currentProject.glossary,
    styleProfile: currentProject.styleProfile,
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

    const project = record.project as Partial<StudioShellProject>;
    const provider =
      record.provider === 'openai' || record.provider === 'poe' ? record.provider : undefined;
    const model =
      typeof record.model === 'string' && record.model.trim().length > 0 ? record.model : undefined;

    return {
      sourceText: record.sourceText,
      segmentationStrategy: resolveSegmentationStrategy(record.segmentationStrategy),
      project: {
        ...project,
        styleProfile: project.styleProfile ?? buildDefaultStyleProfile(),
      } as StudioShellProject,
      provider,
      model,
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
  selectedProvider,
  selectedModel,
  providerOptions,
  sourceText,
  segmentationStrategy,
  segmentPreviewCount,
  editableSegments,
  project,
  isRunning,
  runElapsedSeconds,
  statusMessage,
  statusSeverity,
  pipelineWarnings,
  historyEntries,
  historyReady,
  selectedRecoverySegmentIndex,
  onSourceTextChange,
  onContentTypeChange,
  onTargetLanguageChange,
  onSegmentationStrategyChange,
  onProviderChange,
  onModelChange,
  onEditableSegmentChange,
  onEditableSegmentAdd,
  onEditableSegmentRemove,
  onSplitSourceByLineBreaks,
  onImportText,
  onRunPipeline,
  onReviewSegment,
  onOpenHistoryEntry,
  onExportMarkdown,
  onExportQaReport,
  onExportProjectJson,
  onCopyFinalText,
  onCopyQaSummary,
  onStyleProfileUpdate,
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
        contentTypeOptions={contentTypeOptions}
        targetLanguageOptions={targetLanguageOptions}
        segmentationStrategy={segmentationStrategy}
        selectedProvider={selectedProvider}
        selectedModel={selectedModel}
        providerOptions={providerOptions}
        segmentPreviewCount={segmentPreviewCount}
        editableSegments={editableSegments}
        isRunning={isRunning}
        runElapsedSeconds={runElapsedSeconds}
        statusMessage={statusMessage}
        statusSeverity={statusSeverity}
        pipelineWarnings={pipelineWarnings}
        onSourceTextChange={onSourceTextChange}
        onContentTypeChange={onContentTypeChange}
        onTargetLanguageChange={onTargetLanguageChange}
        onSegmentationStrategyChange={onSegmentationStrategyChange}
        onProviderChange={onProviderChange}
        onModelChange={onModelChange}
        onEditableSegmentChange={onEditableSegmentChange}
        onEditableSegmentAdd={onEditableSegmentAdd}
        onEditableSegmentRemove={onEditableSegmentRemove}
        onSplitSourceByLineBreaks={onSplitSourceByLineBreaks}
        onImportText={onImportText}
        onRunPipeline={onRunPipeline}
        onCopyFinalText={onCopyFinalText}
        onReviewSegment={onReviewSegment}
      />
      {historyReady ? (
        <TranslationHistoryPanel entries={historyEntries} onOpenEntry={onOpenHistoryEntry} />
      ) : null}
      <StudioShell
        apiKeyConfigured={apiKeyConfigured}
        activeRuntimeModelLabel={activeRuntimeModelLabel}
        project={project}
        selectedRecoverySegmentIndex={selectedRecoverySegmentIndex}
        isRunning={isRunning}
        onRunPipeline={onRunPipeline}
        onExportMarkdown={onExportMarkdown}
        onExportQaReport={onExportQaReport}
        onExportProjectJson={onExportProjectJson}
        onCopyFinalText={onCopyFinalText}
        onCopyQaSummary={onCopyQaSummary}
        onStyleProfileUpdate={onStyleProfileUpdate}
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
  providerAvailability,
  initialProvider,
  initialModel,
  initialSeed,
}: TranslationWorkspaceProps): ReactElement {
  const defaultSegmentationStrategy = initialSeed.segmentationStrategy ?? 'paragraph';
  const [provider, setProvider] = useState<ModelProvider>(initialProvider);
  const [model, setModel] = useState(initialModel);
  const [sourceText, setSourceText] = useState(initialSeed.sourceText);
  const [segmentationStrategy, setSegmentationStrategy] = useState<SegmentationStrategy>(
    defaultSegmentationStrategy,
  );
  const [project, setProject] = useState<StudioShellProject>(
    buildStudioShellProject({
      ...initialSeed,
      segmentationStrategy: defaultSegmentationStrategy,
    }),
  );
  const [isRunning, setIsRunning] = useState(false);
  const [runStartedAt, setRunStartedAt] = useState<number | null>(null);
  const [now, setNow] = useState(() => Date.now());
  const [pipelineWarnings, setPipelineWarnings] = useState<string[]>([]);
  const [historyEntries, setHistoryEntries] = useState<TranslationHistorySummary[]>([]);
  const [historyReady, setHistoryReady] = useState(false);
  const [selectedRecoverySegmentIndex, setSelectedRecoverySegmentIndex] = useState<number | null>(
    null,
  );
  const [modelOptionsByProvider, setModelOptionsByProvider] = useState<
    Record<ModelProvider, ProviderModelOptions | null>
  >({
    openai: null,
    poe: null,
  });
  const [statusNotice, setStatusNotice] = useState<StatusNotice | undefined>(
    buildProviderStatus(initialProvider, providerAvailability[initialProvider]),
  );
  const hasRestoredPersistedWorkspaceRef = useRef(false);

  const currentProviderOptions = modelOptionsByProvider[provider];
  const currentProviderModelIds = currentProviderOptions?.models ?? [];
  const resolvedModel =
    currentProviderOptions === null
      ? model
      : currentProviderModelIds.some((option) => option.id === model)
        ? model
        : (currentProviderOptions?.defaultModelId ?? getDefaultModelId(provider));
  const providerApiKeyConfigured = providerAvailability[provider];
  const activeRuntimeModelLabel = formatRuntimeModelLabel(provider, resolvedModel);

  useEffect(() => {
    const restoreTimeoutId = window.setTimeout(() => {
      const persistedWorkspace = loadPersistedWorkspaceState();

      if (!persistedWorkspace) {
        hasRestoredPersistedWorkspaceRef.current = true;

        return;
      }

      setSourceText(persistedWorkspace.sourceText);
      setSegmentationStrategy(persistedWorkspace.segmentationStrategy);
      if (persistedWorkspace.provider) {
        setProvider(persistedWorkspace.provider);
      }
      if (persistedWorkspace.model) {
        setModel(persistedWorkspace.model);
      }
      setProject({
        ...persistedWorkspace.project,
        styleProfile: persistedWorkspace.project.styleProfile ?? buildDefaultStyleProfile(),
      });
      setStatusNotice({
        message: 'Restored the previous workspace session.',
        severity: 'info',
      });
      hasRestoredPersistedWorkspaceRef.current = true;
    }, 0);

    return () => {
      window.clearTimeout(restoreTimeoutId);
    };
  }, []);

  useEffect(() => {
    if (!hasRestoredPersistedWorkspaceRef.current) {
      return;
    }

    persistWorkspaceState({
      sourceText,
      segmentationStrategy,
      project,
      provider,
      model: resolvedModel,
    });
  }, [model, project, provider, resolvedModel, segmentationStrategy, sourceText]);

  useEffect(() => {
    // The history cache is local-only and should hydrate from the browser after mount.
    const restoreHistoryTimeoutId = window.setTimeout(() => {
      setHistoryEntries(loadTranslationHistoryEntries());
      setHistoryReady(true);
    }, 0);

    return () => {
      window.clearTimeout(restoreHistoryTimeoutId);
    };
  }, []);

  useEffect(() => {
    const controller = new AbortController();

    const loadModelOptions = async (): Promise<void> => {
      try {
        const response = await fetch('/api/model-options', {
          signal: controller.signal,
        });

        if (!response.ok) {
          throw new Error(`Model options request failed with status ${response.status}.`);
        }

        const payload = (await response.json()) as {
          providers?: Record<ModelProvider, ProviderModelOptions | undefined>;
        };

        if (!payload.providers) {
          return;
        }

        setModelOptionsByProvider({
          openai: payload.providers.openai ?? null,
          poe: payload.providers.poe ?? null,
        });
      } catch (error) {
        if (error instanceof DOMException && error.name === 'AbortError') {
          return;
        }
      }
    };

    void loadModelOptions();

    return () => {
      controller.abort();
    };
  }, []);

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
    setPipelineWarnings([]);
    setSelectedRecoverySegmentIndex(null);

    try {
      const response = await fetch('/api/translate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...initialSeed,
          title: project.title,
          contentType: project.contentType,
          targetLanguage: project.targetLanguage,
          glossary: project.glossary,
          styleProfile: project.styleProfile,
          sourceText,
          segmentationStrategy,
          provider,
          model: resolvedModel,
        }),
      });

      if (!response.ok) {
        throw new Error(`Pipeline request failed with status ${response.status}.`);
      }

      const result = (await response.json()) as TranslationWorkspaceResponse;
      const completionState = buildSuccessfulPipelineCompletionState({
        initialSeed,
        currentProject: project,
        sourceText,
        segmentationStrategy,
        provider,
        resolvedModel,
        result,
      });

      setProject(completionState.nextProject);
      setStatusNotice(completionState.statusNotice);
      setPipelineWarnings(completionState.warnings);

      try {
        const savedHistoryEntries = saveTranslationHistoryEntry(completionState.historyInput);

        setHistoryEntries(savedHistoryEntries);
      } catch {
        // Ignore history write failures so translation completion still succeeds.
      }
    } catch (error) {
      const completionState = buildFallbackPipelineCompletionState({
        initialSeed,
        currentProject: project,
        sourceText,
        segmentationStrategy,
        provider,
        resolvedModel,
        error,
      });

      setProject(completionState.nextProject);
      setStatusNotice(completionState.statusNotice);
      setPipelineWarnings(completionState.warnings);

      try {
        const savedHistoryEntries = saveTranslationHistoryEntry(completionState.historyInput);

        setHistoryEntries(savedHistoryEntries);
      } catch {
        // Ignore history write failures so translation fallback still completes.
      }
    } finally {
      setIsRunning(false);
      setRunStartedAt(null);
    }
  };

  const handleSourceTextChange = (value: string): void => {
    setPipelineWarnings([]);
    setSelectedRecoverySegmentIndex(null);
    setSourceText(value);
  };

  const handleContentTypeChange = (value: StudioShellProject['contentType']): void => {
    setPipelineWarnings([]);
    setSelectedRecoverySegmentIndex(null);
    setProject((currentProject) => ({
      ...currentProject,
      contentType: value,
    }));
  };

  const handleTargetLanguageChange = (value: StudioShellProject['targetLanguage']): void => {
    setPipelineWarnings([]);
    setSelectedRecoverySegmentIndex(null);
    setProject((currentProject) => ({
      ...currentProject,
      targetLanguage: getTargetLanguageConfig(value.code),
    }));
  };

  const handleSegmentationStrategyChange = (value: SegmentationStrategy): void => {
    setPipelineWarnings([]);
    setSelectedRecoverySegmentIndex(null);
    setSegmentationStrategy(value);
  };

  const handleProviderChange = (value: ModelProvider): void => {
    setPipelineWarnings([]);
    setSelectedRecoverySegmentIndex(null);
    setProvider(value);

    const nextOptions = modelOptionsByProvider[value];

    setModel(nextOptions?.defaultModelId ?? getDefaultModelId(value));
    setStatusNotice(buildProviderStatus(value, providerAvailability[value]));
  };

  const handleModelChange = (value: string): void => {
    setPipelineWarnings([]);
    setSelectedRecoverySegmentIndex(null);
    setModel(value);
  };

  const handleImportText = (importedText: string, fileName: string): void => {
    const nextSeed = buildImportedSeed({
      initialSeed,
      currentProject: project,
      importedText,
      fileName,
      segmentationStrategy,
    });

    setPipelineWarnings([]);
    setSelectedRecoverySegmentIndex(null);
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

    setPipelineWarnings([]);
    setSelectedRecoverySegmentIndex(null);
    setSourceText(joinSegmentsAsSourceText(nextSegments, segmentationStrategy));
  };

  const handleEditableSegmentAdd = (): void => {
    const nextSegments = [...editableSegments, '(new segment)'];

    setPipelineWarnings([]);
    setSelectedRecoverySegmentIndex(null);
    setSourceText(joinSegmentsAsSourceText(nextSegments, segmentationStrategy));
  };

  const handleEditableSegmentRemove = (index: number): void => {
    const nextSegments = editableSegments.filter((_, segmentIndex) => segmentIndex !== index);

    setPipelineWarnings([]);
    setSelectedRecoverySegmentIndex(null);
    setSourceText(joinSegmentsAsSourceText(nextSegments, segmentationStrategy));
  };

  const handleSplitSourceByLineBreaks = (): void => {
    const lineBreakSegments = splitBySingleLineBreaks(sourceText);

    setPipelineWarnings([]);
    setSelectedRecoverySegmentIndex(null);
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

  const handleStyleProfileUpdate = (patch: Partial<StyleProfile>): void => {
    setProject((currentProject) => ({
      ...currentProject,
      styleProfile: {
        ...currentProject.styleProfile,
        ...patch,
      },
    }));
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

  const handleOpenHistoryEntry = (entryId: string): void => {
    const entry = loadTranslationHistoryEntry(entryId);

    if (!entry) {
      setStatusNotice({
        message: 'That translation history entry is no longer available.',
        severity: 'warning',
      });

      return;
    }

    const restoredEntry = restoreTranslationHistoryEntry(entry);

    setSourceText(restoredEntry.sourceText);
    setSegmentationStrategy(restoredEntry.segmentationStrategy);
    setProject({
      ...restoredEntry.project,
      styleProfile: restoredEntry.project.styleProfile ?? buildDefaultStyleProfile(),
    });
    setProvider(restoredEntry.provider);
    setModel(restoredEntry.model);
    setPipelineWarnings(restoredEntry.warnings);
    setSelectedRecoverySegmentIndex(null);
    setStatusNotice({
      message: `Restored "${entry.title}" from translation history.`,
      severity: 'info',
    });
  };

  return (
    <TranslationWorkspaceView
      apiKeyConfigured={providerApiKeyConfigured}
      activeRuntimeModelLabel={activeRuntimeModelLabel}
      selectedProvider={provider}
      selectedModel={resolvedModel}
      providerOptions={modelOptionsByProvider}
      sourceText={sourceText}
      contentTypeOptions={contentTypeOptions}
      targetLanguageOptions={targetLanguageOptions}
      segmentationStrategy={segmentationStrategy}
      segmentPreviewCount={segmentPreviewCount}
      editableSegments={editableSegments}
      project={project}
      isRunning={isRunning}
      runElapsedSeconds={runElapsedSeconds}
      statusMessage={statusNotice?.message}
      statusSeverity={statusNotice?.severity}
      pipelineWarnings={pipelineWarnings}
      historyEntries={historyEntries}
      historyReady={historyReady}
      selectedRecoverySegmentIndex={selectedRecoverySegmentIndex}
      onSourceTextChange={handleSourceTextChange}
      onContentTypeChange={handleContentTypeChange}
      onTargetLanguageChange={handleTargetLanguageChange}
      onSegmentationStrategyChange={handleSegmentationStrategyChange}
      onProviderChange={handleProviderChange}
      onModelChange={handleModelChange}
      onEditableSegmentChange={handleEditableSegmentChange}
      onEditableSegmentAdd={handleEditableSegmentAdd}
      onEditableSegmentRemove={handleEditableSegmentRemove}
      onSplitSourceByLineBreaks={handleSplitSourceByLineBreaks}
      onImportText={handleImportText}
      onRunPipeline={triggerRunPipeline}
      onReviewSegment={(segmentIndex) => {
        setSelectedRecoverySegmentIndex(segmentIndex);
      }}
      onOpenHistoryEntry={handleOpenHistoryEntry}
      onExportMarkdown={handleExportMarkdown}
      onExportQaReport={handleExportQaReport}
      onExportProjectJson={handleExportProjectJson}
      onCopyFinalText={handleCopyFinalText}
      onCopyQaSummary={handleCopyQaSummary}
      onStyleProfileUpdate={handleStyleProfileUpdate}
      onQaFindingResolvedChange={handleQaFindingResolvedChange}
      onSegmentFinalTextChange={handleSegmentFinalTextChange}
      onSegmentFinalTextLockChange={handleSegmentFinalTextLockChange}
      onGlossaryEntryAdd={handleGlossaryEntryAdd}
      onGlossaryEntryUpdate={handleGlossaryEntryUpdate}
      onGlossaryEntryRemove={handleGlossaryEntryRemove}
    />
  );
}
