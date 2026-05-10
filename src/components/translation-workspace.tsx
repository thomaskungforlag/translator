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

  const triggerRunPipeline = (): void => {
    void handleRunPipeline();
  };

  const handleExportMarkdown = (): void => {
    downloadMarkdown(project);
  };

  return (
    <Stack spacing={3}>
      <WorkspaceControls
        sourceText={sourceText}
        contentType={initialSeed.contentType}
        targetLanguage={initialSeed.targetLanguage}
        isRunning={isRunning}
        statusMessage={statusMessage}
        onSourceTextChange={setSourceText}
        onRunPipeline={triggerRunPipeline}
      />
      <StudioShell
        apiKeyConfigured={apiKeyConfigured}
        project={project}
        isRunning={isRunning}
        onRunPipeline={triggerRunPipeline}
        onExportMarkdown={handleExportMarkdown}
      />
    </Stack>
  );
}
