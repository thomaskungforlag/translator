'use client';

import { useState, type ReactElement } from 'react';

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

type TranslationWorkspaceViewProps = {
  apiKeyConfigured: boolean;
  sourceText: string;
  project: StudioShellProject;
  isRunning: boolean;
  statusMessage?: string;
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
  const [statusMessage, setStatusMessage] = useState<string | undefined>(
    apiKeyConfigured ? 'Ready to call OpenAI.' : 'OpenAI key missing. Using local fallback.',
  );

  const handleRunPipeline = async (): Promise<void> => {
    setIsRunning(true);
    setStatusMessage(undefined);

    try {
      const response = await fetch('/api/translate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...initialSeed,
          sourceText,
        }),
      });

      if (!response.ok) {
        throw new Error(`Pipeline request failed with status ${response.status}.`);
      }

      const result = (await response.json()) as TranslationWorkspaceResponse;
      setProject(result.project);
      setStatusMessage(
        result.mode === 'openai'
          ? 'Translation completed with OpenAI.'
          : (result.message ?? 'Using local fallback drafts.'),
      );
    } catch (error) {
      setProject(buildStudioShellProject({ ...initialSeed, sourceText }));
      setStatusMessage(
        error instanceof Error
          ? error.message
          : 'Translation pipeline failed. Using fallback drafts.',
      );
    } finally {
      setIsRunning(false);
    }
  };

  const handleImportText = (importedText: string, fileName: string): void => {
    const title = deriveImportedTitle(fileName, initialSeed.title);
    const nextSeed = {
      ...initialSeed,
      title,
      sourceText: importedText,
    };

    setSourceText(importedText);
    setProject(buildStudioShellProject(nextSeed));
    setStatusMessage(
      `Imported ${fileName}. Re-run the pipeline to refresh the translation passes.`,
    );
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
      statusMessage={statusMessage}
      onSourceTextChange={setSourceText}
      onImportText={handleImportText}
      onRunPipeline={triggerRunPipeline}
      onExportMarkdown={handleExportMarkdown}
    />
  );
}
