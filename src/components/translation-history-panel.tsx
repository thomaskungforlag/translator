'use client';

import { type ReactElement } from 'react';

import { Alert, Box, Button, Chip, Divider, Paper, Stack, Typography } from '@mui/material';

import type { TranslationHistorySummary } from '@/lib/translation-history';

type TranslationHistoryPanelProps = {
  entries: TranslationHistorySummary[];
  onOpenEntry: (entryId: string) => void;
};

function formatHistoryTimestamp(value: string): string {
  return new Date(value).toLocaleString(undefined, {
    dateStyle: 'medium',
    timeStyle: 'short',
  });
}

function TranslationHistoryEntryRow({
  entry,
  onOpenEntry,
}: {
  entry: TranslationHistorySummary;
  onOpenEntry: (entryId: string) => void;
}): ReactElement {
  return (
    <Paper variant="outlined" sx={{ p: 1.5 }}>
      <Stack spacing={1.25}>
        <Stack
          direction={{ xs: 'column', sm: 'row' }}
          spacing={1}
          sx={{ justifyContent: 'space-between', alignItems: { xs: 'flex-start', sm: 'center' } }}
        >
          <Box>
            <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>
              {entry.title}
            </Typography>
            <Typography variant="caption" color="text.secondary">
              {entry.targetLanguageLabel} • {entry.contentType} •{' '}
              {formatHistoryTimestamp(entry.createdAt)}
            </Typography>
          </Box>
          <Stack direction="row" spacing={1} sx={{ flexWrap: 'wrap' }}>
            <Chip size="small" label={`${entry.provider} • ${entry.model}`} />
            {entry.warningCount > 0 ? (
              <Chip
                size="small"
                color="warning"
                variant="outlined"
                label={`${entry.warningCount} warning${entry.warningCount === 1 ? '' : 's'}`}
              />
            ) : (
              <Chip size="small" variant="outlined" label="No warnings" />
            )}
            <Button size="small" variant="contained" onClick={() => onOpenEntry(entry.id)}>
              Open
            </Button>
          </Stack>
        </Stack>
        <Typography variant="body2" color="text.secondary">
          {entry.preview}
        </Typography>
      </Stack>
    </Paper>
  );
}

export function TranslationHistoryPanel({
  entries,
  onOpenEntry,
}: TranslationHistoryPanelProps): ReactElement {
  return (
    <Paper sx={{ p: 2.5 }}>
      <Stack spacing={2}>
        <Box>
          <Typography variant="overline" color="text.secondary">
            Recent translations
          </Typography>
          <Typography variant="h6">Reopen a completed run</Typography>
          <Typography variant="body2" color="text.secondary">
            Saved locally in this browser so you can revisit prior translation work without
            rerunning the pipeline.
          </Typography>
        </Box>

        <Divider />

        {entries.length === 0 ? (
          <Alert severity="info">
            No saved translations yet. Run a translation to add one here.
          </Alert>
        ) : (
          <Stack spacing={1.5}>
            {entries.map((entry) => (
              <TranslationHistoryEntryRow key={entry.id} entry={entry} onOpenEntry={onOpenEntry} />
            ))}
          </Stack>
        )}
      </Stack>
    </Paper>
  );
}
