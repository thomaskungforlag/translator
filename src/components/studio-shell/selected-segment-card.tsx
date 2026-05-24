import type { ReactElement } from 'react';

import {
  Box,
  Chip,
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
import OpenInFullRoundedIcon from '@mui/icons-material/OpenInFullRounded';

import type { DocumentSegment } from '@/lib/domain';
import {
  countWords,
  getSegmentPassLabel,
  getSegmentPassText,
  type SegmentPassIndex,
} from './segment-display-utils';

type SelectedSegmentCardProps = {
  activePass: SegmentPassIndex;
  selectedSegment: DocumentSegment;
  isRunning?: boolean;
  onFinalTextChange?: (value: string) => void;
  onFinalTextLockChange?: (locked: boolean) => void;
  onOpenFocusMode?: () => void;
};

export function SelectedSegmentCard({
  activePass,
  selectedSegment,
  isRunning = false,
  onFinalTextChange,
  onFinalTextLockChange,
  onOpenFocusMode,
}: SelectedSegmentCardProps): ReactElement {
  const passText = getSegmentPassText(selectedSegment, activePass);
  const passLabel = getSegmentPassLabel(activePass);
  const isFinalPass = activePass === 6;
  const wordCount = countWords(selectedSegment.sourceText);

  const passContent = isFinalPass ? (
    <Stack spacing={1.25}>
      <TextField
        label="Final text"
        value={selectedSegment.finalText ?? ''}
        disabled={isRunning}
        onChange={(event) => {
          onFinalTextChange?.(event.target.value);
        }}
        multiline
        minRows={6}
        maxRows={16}
        fullWidth
      />
      <FormControlLabel
        control={
          <Switch
            checked={Boolean(selectedSegment.finalTextLocked)}
            disabled={isRunning}
            onChange={(_, checked) => {
              onFinalTextLockChange?.(checked);
            }}
          />
        }
        label="Lock this final text on re-run"
      />
    </Stack>
  ) : (
    <Box
      data-testid="selected-segment-pass-scroll"
      sx={{
        maxHeight: { xs: 220, lg: 'min(34vh, 360px)' },
        overflowY: 'auto',
        pr: 0.5,
      }}
    >
      <Typography variant="body1" color="text.secondary" sx={{ whiteSpace: 'pre-wrap' }}>
        {passText}
      </Typography>
    </Box>
  );

  return (
    <Paper
      variant="outlined"
      sx={{
        p: 2.25,
        minWidth: 0,
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
      }}
    >
      <Stack spacing={1.5} sx={{ minHeight: 0 }}>
        <Stack direction="row" sx={{ justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <Stack spacing={0.5} sx={{ minWidth: 0 }}>
            <Typography variant="subtitle2" color="text.secondary">
              Selected segment
            </Typography>
            <Stack direction="row" spacing={1} sx={{ flexWrap: 'wrap' }}>
              <Chip size="small" label={`Segment ${selectedSegment.index + 1}`} />
              <Chip size="small" label={passLabel} variant="outlined" />
              <Chip size="small" label={`${wordCount} words`} variant="outlined" />
            </Stack>
          </Stack>

          <Stack direction="row" spacing={0.5}>
            <Tooltip title="Open focus mode">
              <IconButton size="small" aria-label="Open focus mode" onClick={onOpenFocusMode}>
                <OpenInFullRoundedIcon fontSize="small" />
              </IconButton>
            </Tooltip>
            <Tooltip title="Copy source">
              <IconButton size="small" aria-label="Copy source">
                <ContentCopyRoundedIcon fontSize="small" />
              </IconButton>
            </Tooltip>
            <Tooltip title="Mark approved">
              <IconButton size="small" aria-label="Mark approved" color="success">
                <CheckCircleOutlineRoundedIcon fontSize="small" />
              </IconButton>
            </Tooltip>
          </Stack>
        </Stack>

        <Stack spacing={0.75}>
          <Typography variant="caption" color="text.secondary">
            Source text
          </Typography>
          <Box
            data-testid="selected-segment-source-scroll"
            sx={{
              maxHeight: { xs: 160, lg: 'min(20vh, 220px)' },
              overflowY: 'auto',
              pr: 0.5,
            }}
          >
            <Typography variant="h6" component="p" data-testid="selected-segment-text">
              {selectedSegment.sourceText}
            </Typography>
          </Box>
        </Stack>

        <Divider />

        <Stack spacing={0.75} sx={{ minHeight: 0, flex: 1 }}>
          <Typography variant="caption" color="text.secondary">
            {isFinalPass ? 'Final approved text' : passLabel}
          </Typography>
          {passContent}
        </Stack>
      </Stack>
    </Paper>
  );
}
