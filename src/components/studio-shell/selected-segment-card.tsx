import type { ReactElement } from 'react';

import { Divider, IconButton, Paper, Stack, Tooltip, Typography } from '@mui/material';
import CheckCircleOutlineRoundedIcon from '@mui/icons-material/CheckCircleOutlineRounded';
import ContentCopyRoundedIcon from '@mui/icons-material/ContentCopyRounded';

import type { DocumentSegment } from '@/lib/domain';

const passCopy: Array<string | ((segment: DocumentSegment) => string)> = [
  'Paragraph structure is preserved and the source text is normalized before translation.',
  (segment: DocumentSegment) => segment.translationDraft ?? 'No translation draft yet.',
  (segment: DocumentSegment) => segment.voiceAdaptedDraft ?? 'No voice-adapted draft yet.',
  (segment: DocumentSegment) => segment.polishedDraft ?? 'No polished draft yet.',
  (segment: DocumentSegment) => segment.finalText ?? 'No final text yet.',
] as const;

type SelectedSegmentCardProps = {
  activePass: number;
  selectedSegment: DocumentSegment;
};

export function SelectedSegmentCard({
  activePass,
  selectedSegment,
}: SelectedSegmentCardProps): ReactElement {
  const passText = passCopy[activePass];

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
        <Typography variant="body1" color="text.secondary">
          {typeof passText === 'function' ? passText(selectedSegment) : passText}
        </Typography>
      </Stack>
    </Paper>
  );
}
