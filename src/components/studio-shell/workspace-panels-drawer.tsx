import type { ReactElement } from 'react';

import { Box, Drawer, Stack, Typography, type DrawerProps } from '@mui/material';

import type { StudioShellProject } from '@/lib/workspace';

import { GlossaryPanel } from './glossary-panel';
import { PipelineStagesPanel } from './pipeline-stages-panel';
import { ProjectOverview } from './project-overview';
import { StyleProfilePanel } from './style-profile-panel';
import { WorkspaceAccordion } from './workspace-accordion';

type WorkspacePanelsDrawerProps = {
  project: StudioShellProject;
  open: boolean;
  variant: DrawerProps['variant'];
  isRunning?: boolean;
  onClose?: () => void;
  onStyleProfileUpdate?: (patch: Partial<StudioShellProject['styleProfile']>) => void;
  onGlossaryEntryAdd?: () => void;
  onGlossaryEntryUpdate?: (
    entryId: string,
    patch: Partial<StudioShellProject['glossary'][number]>,
  ) => void;
  onGlossaryEntryRemove?: (entryId: string) => void;
  onGlossaryExport?: () => void;
  onGlossaryImport?: (value: string, fileName: string) => void;
};

export function WorkspacePanelsDrawer({
  project,
  open,
  variant,
  isRunning = false,
  onClose,
  onStyleProfileUpdate,
  onGlossaryEntryAdd,
  onGlossaryEntryUpdate,
  onGlossaryEntryRemove,
  onGlossaryExport,
  onGlossaryImport,
}: WorkspacePanelsDrawerProps): ReactElement {
  const panelContent = (
    <Box
      data-testid="workspace-panels-drawer"
      sx={{
        p: 2.5,
        flex: 1,
        minHeight: 0,
        overflowY: 'auto',
      }}
    >
      <Stack spacing={2}>
        <Box>
          <Typography variant="overline" color="text.secondary">
            Workspace panels
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Project, style, glossary, and pipeline controls stay in a compact drawer.
          </Typography>
        </Box>

        <ProjectOverview project={project} />

        <WorkspaceAccordion
          title="Style profile"
          caption="Voice, rhythm, and avoidance rules"
          defaultExpanded
        >
          <StyleProfilePanel
            profile={project.styleProfile}
            isRunning={isRunning}
            onUpdateProfile={onStyleProfileUpdate}
          />
        </WorkspaceAccordion>

        <WorkspaceAccordion title="Pipeline stages" caption="Current pass status and readiness">
          <PipelineStagesPanel stages={project.pipelineStages} />
        </WorkspaceAccordion>

        <WorkspaceAccordion title="Glossary" caption="Locked terms and recurring entities">
          <GlossaryPanel
            entries={project.glossary}
            isRunning={isRunning}
            onAddEntry={onGlossaryEntryAdd}
            onUpdateEntry={onGlossaryEntryUpdate}
            onRemoveEntry={onGlossaryEntryRemove}
            onExportGlossary={onGlossaryExport}
            onImportGlossary={onGlossaryImport}
          />
        </WorkspaceAccordion>
      </Stack>
    </Box>
  );

  if (variant === 'permanent') {
    return (
      <Box
        component="aside"
        sx={{
          width: 320,
          flex: '0 0 320px',
          minWidth: 320,
          display: 'flex',
          flexDirection: 'column',
          position: 'sticky',
          top: 24,
          alignSelf: 'flex-start',
          height: 'calc(100vh - 48px)',
          maxHeight: 'calc(100vh - 48px)',
          overflow: 'hidden',
          borderRadius: 4,
          border: '1px solid',
          borderColor: 'divider',
          backgroundColor: 'background.paper',
          backdropFilter: 'blur(18px)',
        }}
      >
        {panelContent}
      </Box>
    );
  }

  return (
    <Drawer
      variant={variant}
      open={open}
      onClose={onClose}
      sx={{
        flexShrink: 0,
        width: 320,
        display: { xs: variant === 'temporary' ? 'block' : 'none', lg: 'block' },
        '& .MuiDrawer-paper': {
          width: 320,
          boxSizing: 'border-box',
          display: 'flex',
          flexDirection: 'column',
          height: '100%',
          backgroundImage: 'none',
          borderRight: '1px solid',
          borderColor: 'divider',
          backdropFilter: 'blur(18px)',
        },
      }}
    >
      {panelContent}
    </Drawer>
  );
}
