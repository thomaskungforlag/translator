import type { ReactElement } from 'react';

import DownloadRoundedIcon from '@mui/icons-material/DownloadRounded';
import EditRoundedIcon from '@mui/icons-material/EditRounded';
import PlayArrowRoundedIcon from '@mui/icons-material/PlayArrowRounded';
import { Button, Paper, Stack, Typography } from '@mui/material';

export function QuickActionsPanel(): ReactElement {
  return (
    <Paper sx={{ p: 2.5 }}>
      <Typography variant="overline" color="text.secondary">
        Quick actions
      </Typography>
      <Stack spacing={1.5} sx={{ mt: 1.5 }}>
        <Button variant="contained" fullWidth startIcon={<PlayArrowRoundedIcon />}>
          Translate selected segment
        </Button>
        <Button variant="outlined" fullWidth startIcon={<EditRoundedIcon />}>
          Edit final text
        </Button>
        <Button variant="outlined" fullWidth startIcon={<DownloadRoundedIcon />}>
          Export QA report
        </Button>
      </Stack>
    </Paper>
  );
}
