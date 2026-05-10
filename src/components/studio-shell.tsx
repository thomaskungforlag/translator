'use client';

import { useEffect, useRef, type ReactElement } from 'react';

import { Box, Stack } from '@mui/material';

import type { StudioShellProps } from '@/components/studio-shell/types';

import { GlossaryPanel } from './studio-shell/glossary-panel';
import { PipelineStagesPanel } from './studio-shell/pipeline-stages-panel';
import { ProjectOverview } from './studio-shell/project-overview';
import { QAFindingsPanel } from './studio-shell/qa-findings-panel';
import { QuickActionsPanel } from './studio-shell/quick-actions-panel';
import { SegmentReviewPanel } from './studio-shell/segment-review-panel';
import { StudioHero } from './studio-shell/studio-hero';

export function StudioShell({
  apiKeyConfigured,
  project,
  onRunPipeline,
  onExportMarkdown,
  onSegmentFinalTextChange,
  onSegmentFinalTextLockChange,
  isRunning = false,
}: StudioShellProps): ReactElement {
  const shellRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    shellRef.current?.setAttribute('data-hydrated', 'true');
  }, []);

  return (
    <Box
      ref={shellRef}
      data-testid="studio-shell-ready"
      data-hydrated="false"
      sx={{
        minHeight: '100vh',
        width: '100%',
        px: { xs: 2, md: 3 },
        py: { xs: 2, md: 3 },
        overflowX: 'clip',
      }}
    >
      <Stack spacing={3}>
        <StudioHero
          apiKeyConfigured={apiKeyConfigured}
          onRunPipeline={onRunPipeline}
          onExportMarkdown={onExportMarkdown}
          isRunning={isRunning}
        />

        <Box
          sx={{
            width: '100%',
            display: 'grid',
            gap: 3,
            gridTemplateColumns: {
              xs: '1fr',
              xl: 'minmax(0, 320px) minmax(0, 1fr) minmax(0, 320px)',
            },
          }}
        >
          <Box sx={{ minWidth: 0 }}>
            <Stack spacing={3}>
              <ProjectOverview project={project} />
              <PipelineStagesPanel stages={project.pipelineStages} />
              <GlossaryPanel entries={project.glossary} />
            </Stack>
          </Box>

          <Box sx={{ minWidth: 0 }}>
            <SegmentReviewPanel
              segments={project.segments}
              onSegmentFinalTextChange={onSegmentFinalTextChange}
              onSegmentFinalTextLockChange={onSegmentFinalTextLockChange}
            />
          </Box>

          <Box sx={{ minWidth: 0 }}>
            <Stack spacing={3}>
              <QAFindingsPanel findings={project.qaFindings} />
              <QuickActionsPanel
                onRunPipeline={onRunPipeline}
                onExportMarkdown={onExportMarkdown}
                isRunning={isRunning}
              />
            </Stack>
          </Box>
        </Box>
      </Stack>
    </Box>
  );
}
