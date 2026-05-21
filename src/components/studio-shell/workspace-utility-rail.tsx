import type { ReactElement } from 'react';

import { Box, Stack } from '@mui/material';

import type { QAFinding } from '@/lib/domain';

import { QAFindingsPanel } from './qa-findings-panel';
import { QuickActionsPanel } from './quick-actions-panel';
import { WorkspaceAccordion } from './workspace-accordion';

type WorkspaceUtilityRailProps = {
  findings: QAFinding[];
  onResolvedChange?: (findingId: string, resolved: boolean) => void;
  onRunPipeline?: () => void;
  onExportMarkdown?: () => void;
  onExportQaReport?: () => void;
  onExportProjectJson?: () => void;
  onCopyFinalText?: () => void;
  onCopyQaSummary?: () => void;
  isRunning?: boolean;
};

export function WorkspaceUtilityRail({
  findings,
  onResolvedChange,
  onRunPipeline,
  onExportMarkdown,
  onExportQaReport,
  onExportProjectJson,
  onCopyFinalText,
  onCopyQaSummary,
  isRunning = false,
}: WorkspaceUtilityRailProps): ReactElement {
  return (
    <Box sx={{ minWidth: 0 }}>
      <Stack spacing={2}>
        <WorkspaceAccordion
          title="QA findings"
          caption="Open issues and review items"
          defaultExpanded={findings.length > 0}
        >
          <QAFindingsPanel findings={findings} onResolvedChange={onResolvedChange} />
        </WorkspaceAccordion>

        <WorkspaceAccordion
          title="Quick actions"
          caption="Run, export, and copy outputs"
          defaultExpanded
        >
          <QuickActionsPanel
            onRunPipeline={onRunPipeline}
            onExportMarkdown={onExportMarkdown}
            onExportQaReport={onExportQaReport}
            onExportProjectJson={onExportProjectJson}
            onCopyFinalText={onCopyFinalText}
            onCopyQaSummary={onCopyQaSummary}
            isRunning={isRunning}
          />
        </WorkspaceAccordion>
      </Stack>
    </Box>
  );
}
