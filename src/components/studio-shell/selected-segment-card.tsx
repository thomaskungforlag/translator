import type { ReactElement } from 'react';

import {
  Divider,
  FormControlLabel,
  IconButton,
  Paper,
  Stack,
  Switch,
  TextField,
  Tooltip,
  Typography,
} from '@mui/material';
import CheckCircleOutlineRoundedIcon from '@mui/icons-material/CheckCircleOutlineRounded';
import ContentCopyRoundedIcon from '@mui/icons-material/ContentCopyRounded';

import type { DocumentSegment } from '@/lib/domain';

function formatSegmentQaFindings(segment: DocumentSegment): string {
  if (segment.qaFindings.length === 0) {
    return 'No QA findings for this segment.';
  }

  return segment.qaFindings
    .map((finding) => {
      const suggestion = finding.suggestion ? ` Suggestion: ${finding.suggestion}` : '';

      return `[${finding.severity}] ${finding.category}: ${finding.issue}${suggestion}`;
    })
    .join(' ');
}

const passCopy: Array<string | ((segment: DocumentSegment) => string)> = [
  (segment: DocumentSegment) => segment.translationDraft ?? 'No translation draft yet.',
  (segment: DocumentSegment) => segment.voiceAdaptedDraft ?? 'No voice-adapted draft yet.',
  (segment: DocumentSegment) =>
    segment.literaryNaturalnessDraft ?? 'No literary naturalness draft yet.',
  (segment: DocumentSegment) => formatSegmentQaFindings(segment),
  (segment: DocumentSegment) => segment.polishedDraft ?? 'No polished draft yet.',
  (segment: DocumentSegment) => segment.finalText ?? 'No final text yet.',
] as const;

type SelectedSegmentCardProps = {
  activePass: number;
  selectedSegment: DocumentSegment;
  onFinalTextChange?: (value: string) => void;
  onFinalTextLockChange?: (locked: boolean) => void;
};

export function SelectedSegmentCard({
  activePass,
  selectedSegment,
  onFinalTextChange,
  onFinalTextLockChange,
}: SelectedSegmentCardProps): ReactElement {
  const passText = passCopy[activePass];
  const isFinalPass = activePass === 5;

  return (
    <Paper variant="outlined" sx={{ p: 2.25, minWidth: 0 }}>
      <Stack spacing={1.5}>
        <Stack direction="row" sx={{ justifyContent: 'space-between', alignItems: 'center' }}>
          <Typography variant="subtitle2" color="text.secondary">
            Selected segment
          </Typography>
          <Stack direction="row" spacing={1}>
            <Tooltip title="Copy source">
              <IconButton size="small">
                <ContentCopyRoundedIcon fontSize="small" />
              </IconButton>
            </Tooltip>
            <Tooltip title="Mark approved">
              <IconButton size="small" color="success">
                <CheckCircleOutlineRoundedIcon fontSize="small" />
              </IconButton>
            </Tooltip>
          </Stack>
        </Stack>

        <Typography variant="h5" component="p" data-testid="selected-segment-text">
          {selectedSegment.sourceText}
        </Typography>
        <Divider />
        {isFinalPass ? (
          <Stack spacing={1.25}>
            <TextField
              label="Final text"
              value={selectedSegment.finalText ?? ''}
              onChange={(event) => {
                onFinalTextChange?.(event.target.value);
              }}
              multiline
              minRows={4}
              fullWidth
            />
            <FormControlLabel
              control={
                <Switch
                  checked={Boolean(selectedSegment.finalTextLocked)}
                  onChange={(_, checked) => {
                    onFinalTextLockChange?.(checked);
                  }}
                />
              }
              label="Lock this final text on re-run"
            />
          </Stack>
        ) : (
          <Typography variant="body1" color="text.secondary">
            {typeof passText === 'function' ? passText(selectedSegment) : passText}
          </Typography>
        )}
      </Stack>
    </Paper>
  );
}
