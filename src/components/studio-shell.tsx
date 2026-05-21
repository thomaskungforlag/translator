'use client';

import { useEffect, useRef, useState, type ReactElement } from 'react';

import { Box, Stack, useMediaQuery, useTheme } from '@mui/material';

import type { StudioShellProps } from '@/components/studio-shell/types';

import { StudioHero } from './studio-shell/studio-hero';
import { SegmentReviewPanel } from './studio-shell/segment-review-panel';
import { WorkspacePanelsDrawer } from './studio-shell/workspace-panels-drawer';
import { WorkspaceUtilityRail } from './studio-shell/workspace-utility-rail';

export function StudioShell({
  apiKeyConfigured,
  activeRuntimeModelLabel,
  project,
  selectedRecoverySegmentIndex,
  onRunPipeline,
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
  isRunning = false,
}: StudioShellProps): ReactElement {
  const shellRef = useRef<HTMLDivElement>(null);
  const theme = useTheme();
  const isDesktop = useMediaQuery(theme.breakpoints.up('lg'), { noSsr: true });
  const [isWorkspaceDrawerOpen, setIsWorkspaceDrawerOpen] = useState(false);

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
      <Box
        sx={{
          display: 'grid',
          gap: 3,
          alignItems: 'start',
          gridTemplateColumns: { xs: '1fr', lg: 'minmax(0, 320px) minmax(0, 1fr)' },
          minHeight: 0,
        }}
      >
        {isDesktop ? (
          <WorkspacePanelsDrawer
            project={project}
            open
            variant="permanent"
            onStyleProfileUpdate={onStyleProfileUpdate}
            onGlossaryEntryAdd={onGlossaryEntryAdd}
            onGlossaryEntryUpdate={onGlossaryEntryUpdate}
            onGlossaryEntryRemove={onGlossaryEntryRemove}
          />
        ) : null}

        <Box sx={{ minWidth: 0 }}>
          <Stack spacing={3} sx={{ minHeight: 0 }}>
            <StudioHero
              apiKeyConfigured={apiKeyConfigured}
              activeRuntimeModelLabel={activeRuntimeModelLabel}
              onRunPipeline={onRunPipeline}
              onOpenWorkspacePanels={() => {
                setIsWorkspaceDrawerOpen(true);
              }}
              onExportMarkdown={onExportMarkdown}
              onExportQaReport={onExportQaReport}
              onExportProjectJson={onExportProjectJson}
              onCopyFinalText={onCopyFinalText}
              isRunning={isRunning}
              showWorkspacePanelsButton={!isDesktop}
            />

            <Box
              sx={{
                width: '100%',
                display: 'grid',
                gap: 3,
                gridTemplateColumns: { xs: '1fr', xl: 'minmax(0, 1fr) 340px' },
                minHeight: 0,
              }}
            >
              <Box sx={{ minWidth: 0 }}>
                <SegmentReviewPanel
                  segments={project.segments}
                  selectedSegmentIndex={selectedRecoverySegmentIndex}
                  onSegmentFinalTextChange={onSegmentFinalTextChange}
                  onSegmentFinalTextLockChange={onSegmentFinalTextLockChange}
                />
              </Box>

              <WorkspaceUtilityRail
                findings={project.qaFindings}
                onResolvedChange={onQaFindingResolvedChange}
                onRunPipeline={onRunPipeline}
                onExportMarkdown={onExportMarkdown}
                onExportQaReport={onExportQaReport}
                onExportProjectJson={onExportProjectJson}
                onCopyFinalText={onCopyFinalText}
                onCopyQaSummary={onCopyQaSummary}
                isRunning={isRunning}
              />
            </Box>
          </Stack>
        </Box>
      </Box>

      {!isDesktop ? (
        <WorkspacePanelsDrawer
          project={project}
          open={isWorkspaceDrawerOpen}
          variant="temporary"
          onClose={() => {
            setIsWorkspaceDrawerOpen(false);
          }}
          onStyleProfileUpdate={onStyleProfileUpdate}
          onGlossaryEntryAdd={onGlossaryEntryAdd}
          onGlossaryEntryUpdate={onGlossaryEntryUpdate}
          onGlossaryEntryRemove={onGlossaryEntryRemove}
        />
      ) : null}
    </Box>
  );
}
