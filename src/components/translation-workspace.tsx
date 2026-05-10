'use client';

import { useState, useTransition, type ReactElement } from 'react';

import { Stack } from '@mui/material';

import { StudioShell } from '@/components/studio-shell';
import type { StudioShellProject } from '@/lib/workspace';
import { buildStudioShellProject, exportProjectMarkdown } from '@/lib/pipeline';

import { WorkspaceControls } from './workspace-controls';

import type { TranslationWorkspaceSeed } from '@/lib/workspace';

type TranslationWorkspaceProps = {
  apiKeyConfigured: boolean;
  initialSeed: TranslationWorkspaceSeed;
};

export function TranslationWorkspace({
  apiKeyConfigured,
  initialSeed,
}: TranslationWorkspaceProps): ReactElement {
  const [isPending, startTransition] = useTransition();
  const [sourceText, setSourceText] = useState(initialSeed.sourceText);
  const [project, setProject] = useState<StudioShellProject>(() =>
    buildStudioShellProject(initialSeed),
  );

  const handleRunPipeline = (): void => {
    startTransition(() => {
      const nextProject = buildStudioShellProject({ ...initialSeed, sourceText });
      setProject(nextProject);
    });
  };

  const handleExportMarkdown = (): void => {
    const markdown = exportProjectMarkdown(project);
    const blob = new Blob([markdown], { type: 'text/markdown;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');

    anchor.href = url;
    anchor.download = `${project.title.replace(/\s+/g, '-').toLowerCase()}.md`;
    anchor.click();
    URL.revokeObjectURL(url);
  };

  return (
    <Stack spacing={3}>
      <WorkspaceControls
        sourceText={sourceText}
        contentType={initialSeed.contentType}
        targetLanguage={initialSeed.targetLanguage}
        isRunning={isPending}
        onSourceTextChange={setSourceText}
        onRunPipeline={handleRunPipeline}
      />
      <StudioShell
        apiKeyConfigured={apiKeyConfigured}
        project={project}
        isRunning={isPending}
        onRunPipeline={handleRunPipeline}
        onExportMarkdown={handleExportMarkdown}
      />
    </Stack>
  );
}
