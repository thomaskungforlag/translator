import type { ReactElement } from 'react';

import AutoAwesomeRoundedIcon from '@mui/icons-material/AutoAwesomeRounded';
import BookOutlinedIcon from '@mui/icons-material/BookOutlined';
import WarningAmberRoundedIcon from '@mui/icons-material/WarningAmberRounded';
import { Chip, Paper, Stack, Typography } from '@mui/material';

export function StageNotesCard(): ReactElement {
  return (
    <Paper variant="outlined" sx={{ p: 2.25 }}>
      <Stack spacing={1.5}>
        <Typography variant="subtitle2" color="text.secondary">
          Stage notes
        </Typography>
        <Stack direction="row" spacing={1} sx={{ flexWrap: 'wrap' }}>
          <Chip icon={<AutoAwesomeRoundedIcon />} label="Voice preserved" />
          <Chip icon={<BookOutlinedIcon />} label="Glossary locked" />
          <Chip icon={<WarningAmberRoundedIcon />} label="QA gated" color="warning" />
        </Stack>
        <Typography variant="body2" color="text.secondary">
          The workflow keeps each pass inspectable so Thomas can compare faithful translation, voice
          adaptation, literary naturalness, QA findings, final polish, and final approved text
          without losing earlier drafts.
        </Typography>
      </Stack>
    </Paper>
  );
}
