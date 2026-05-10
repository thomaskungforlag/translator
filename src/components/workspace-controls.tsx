import { type ChangeEvent, type ReactElement } from 'react';

import { Alert, Button, MenuItem, Paper, Stack, TextField, Typography } from '@mui/material';

import type { ContentType, LanguageConfig } from '@/lib/domain';

type WorkspaceControlsProps = {
  sourceText: string;
  contentType: ContentType;
  targetLanguage: LanguageConfig;
  isRunning: boolean;
  statusMessage?: string;
  onSourceTextChange: (value: string) => void;
  onImportText: (value: string, fileName: string) => void;
  onRunPipeline: () => void;
};

export function WorkspaceControls({
  sourceText,
  contentType,
  targetLanguage,
  isRunning,
  statusMessage,
  onSourceTextChange,
  onImportText,
  onRunPipeline,
}: WorkspaceControlsProps): ReactElement {
  const handleImportChange = async (event: ChangeEvent<HTMLInputElement>): Promise<void> => {
    const input = event.currentTarget;
    const file = input.files?.[0];

    if (!file) {
      return;
    }

    const importedText = await file.text();
    onImportText(importedText, file.name);
    input.value = '';
  };

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
        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5}>
          <Button variant="outlined" component="label">
            Import text/Markdown
            <input
              hidden
              type="file"
              accept=".txt,.md,text/plain,text/markdown"
              onChange={(event) => {
                void handleImportChange(event);
              }}
            />
          </Button>
          <Button variant="contained" onClick={onRunPipeline} disabled={isRunning}>
            {isRunning ? 'Running pipeline…' : 'Run pipeline'}
          </Button>
        </Stack>
        {statusMessage ? <Alert severity="info">{statusMessage}</Alert> : null}
      </Stack>
    </Paper>
  );
}
