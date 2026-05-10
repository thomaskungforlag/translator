'use client';

import { useState, type ReactElement } from 'react';

import type { AlertColor } from '@mui/material';
import { Stack } from '@mui/material';

import { StudioShell } from '@/components/studio-shell';
import { buildStudioShellProject, exportProjectMarkdown } from '@/lib/pipeline';
import type { StudioShellProject, TranslationWorkspaceSeed } from '@/lib/workspace';

import { WorkspaceControls } from './workspace-controls';

type TranslationWorkspaceProps = {
  apiKeyConfigured: boolean;
  initialSeed: TranslationWorkspaceSeed;
};

type TranslationWorkspaceResponse = {
  project: StudioShellProject;
  mode: 'openai' | 'fallback';
  message?: string;
};

type StatusNotice = {
  message: string;
  severity: AlertColor;
};

type TranslationWorkspaceViewProps = {
  apiKeyConfigured: boolean;
  sourceText: string;
  project: StudioShellProject;
  isRunning: boolean;
  statusMessage?: string;
  statusSeverity?: AlertColor;
  onSourceTextChange: (value: string) => void;
  onImportText: (value: string, fileName: string) => void;
  onRunPipeline: () => void;
  onExportMarkdown: () => void;
};

function deriveImportedTitle(fileName: string, fallbackTitle: string): string {
  const baseName = fileName
    .replace(/\.[^.]+$/, '')
    .replace(/[-_]+/g, ' ')
    .trim();

  return baseName.length > 0 ? baseName : fallbackTitle;
}

function buildInitialStatus(apiKeyConfigured: boolean): StatusNotice {
  return apiKeyConfigured
    ? { message: 'Ready to call OpenAI.', severity: 'info' }
    : {
        message:
          'OpenAI key missing. Demo fallback only; do not treat output as production translation.',
        severity: 'warning',
      };
}

function buildFallbackStatus(message?: string): StatusNotice {
  return {
    message:
      message ?? 'OpenAI is unavailable. Showing demo fallback drafts only; review before using.',
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
  sourceText,
  project,
  isRunning,
  statusMessage,
  statusSeverity,
  onSourceTextChange,
  onImportText,
  onRunPipeline,
  onExportMarkdown,
}: TranslationWorkspaceViewProps): ReactElement {
  return (
    <Stack spacing={3}>
      <WorkspaceControls
        sourceText={sourceText}
        contentType={project.contentType}
        targetLanguage={project.targetLanguage}
        isRunning={isRunning}
        statusMessage={statusMessage}
        statusSeverity={statusSeverity}
        onSourceTextChange={onSourceTextChange}
        onImportText={onImportText}
        onRunPipeline={onRunPipeline}
      />
      <StudioShell
        apiKeyConfigured={apiKeyConfigured}
        project={project}
        isRunning={isRunning}
        onRunPipeline={onRunPipeline}
        onExportMarkdown={onExportMarkdown}
      />
    </Stack>
  );
}

export function TranslationWorkspace({
  apiKeyConfigured,
  initialSeed,
}: TranslationWorkspaceProps): ReactElement {
  const [sourceText, setSourceText] = useState(initialSeed.sourceText);
  const [project, setProject] = useState<StudioShellProject>(() =>
    buildStudioShellProject(initialSeed),
  );
  const [isRunning, setIsRunning] = useState(false);
  const [statusNotice, setStatusNotice] = useState<StatusNotice | undefined>(
    buildInitialStatus(apiKeyConfigured),
  );

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
      setProject(result.project);
      setStatusNotice(
        result.mode === 'openai'
          ? { message: 'Translation completed with OpenAI.', severity: 'success' }
          : buildFallbackStatus(result.message),
      );
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

  return (
    <TranslationWorkspaceView
      apiKeyConfigured={apiKeyConfigured}
      sourceText={sourceText}
      project={project}
      isRunning={isRunning}
      statusMessage={statusNotice?.message}
      statusSeverity={statusNotice?.severity}
      onSourceTextChange={setSourceText}
      onImportText={handleImportText}
      onRunPipeline={triggerRunPipeline}
      onExportMarkdown={handleExportMarkdown}
    />
  );
}
