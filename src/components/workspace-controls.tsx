import type { ReactElement } from 'react';

import { Button, MenuItem, Paper, Stack, TextField, Typography } from '@mui/material';

import type { ContentType, LanguageConfig } from '@/lib/domain';

type WorkspaceControlsProps = {
  sourceText: string;
  contentType: ContentType;
  targetLanguage: LanguageConfig;
  isRunning: boolean;
  onSourceTextChange: (value: string) => void;
  onRunPipeline: () => void;
};

export function WorkspaceControls({
  sourceText,
  contentType,
  targetLanguage,
  isRunning,
  onSourceTextChange,
  onRunPipeline,
}: WorkspaceControlsProps): ReactElement {
  return (
    <Paper sx={{ p: 2.5 }}>
      <Stack spacing={2}>
        <Typography variant="overline" color="text.secondary">
          Source workspace
        </Typography>
        <Stack direction={{ xs: 'column', md: 'row' }} spacing={2}>
          <TextField select fullWidth label="Content type" value={contentType} disabled>
            <MenuItem value={contentType}>{contentType}</MenuItem>
          </TextField>
          <TextField select fullWidth label="Target language" value={targetLanguage.label} disabled>
            <MenuItem value={targetLanguage.label}>{targetLanguage.label}</MenuItem>
          </TextField>
        </Stack>
        <TextField
          label="Source text"
          value={sourceText}
          onChange={(event) => {
            onSourceTextChange(event.target.value);
          }}
          multiline
          minRows={6}
          fullWidth
        />
        <Button variant="contained" onClick={onRunPipeline} disabled={isRunning}>
          {isRunning ? 'Running pipeline…' : 'Run pipeline'}
        </Button>
      </Stack>
    </Paper>
  );
}
