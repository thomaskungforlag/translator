import type { ReactElement } from 'react';

import DownloadRoundedIcon from '@mui/icons-material/DownloadRounded';
import PlayArrowRoundedIcon from '@mui/icons-material/PlayArrowRounded';
import { Button, Paper, Stack, Typography } from '@mui/material';

type QuickActionsPanelProps = {
  onRunPipeline?: () => void;
  onExportMarkdown?: () => void;
  isRunning?: boolean;
};

export function QuickActionsPanel({
  onRunPipeline,
  onExportMarkdown,
  isRunning = false,
}: QuickActionsPanelProps): ReactElement {
  return (
    <Paper sx={{ p: 2.5 }}>
      <Typography variant="overline" color="text.secondary">
        Quick actions
      </Typography>
      <Stack spacing={1.5} sx={{ mt: 1.5 }}>
        <Button
          variant="contained"
          fullWidth
          startIcon={<PlayArrowRoundedIcon />}
          onClick={onRunPipeline}
          disabled={isRunning}
        >
          Run pipeline
        </Button>
        <Button
          variant="outlined"
          fullWidth
          startIcon={<DownloadRoundedIcon />}
          onClick={onExportMarkdown}
        >
          Export Markdown
        </Button>
      </Stack>
    </Paper>
  );
}
