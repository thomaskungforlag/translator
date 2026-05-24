import type { ReactElement } from 'react';

import CloseRoundedIcon from '@mui/icons-material/CloseRounded';
import {
  Box,
  FormControlLabel,
  Dialog,
  DialogContent,
  DialogTitle,
  Drawer,
  IconButton,
  Paper,
  Stack,
  Tab,
  Tabs,
  TextField,
  Switch,
  Typography,
} from '@mui/material';

import type { DocumentSegment } from '@/lib/domain';

import { WorkspaceAccordion } from './workspace-accordion';
import {
  getSegmentPassLabel,
  getSegmentPassText,
  type SegmentPassIndex,
  segmentPassLabels,
  countWords,
} from './segment-display-utils';

type SegmentFocusSurfaceProps = {
  open: boolean;
  isDesktop: boolean;
  activePass: SegmentPassIndex;
  segment: DocumentSegment;
  isRunning?: boolean;
  onClose: () => void;
  onActivePassChange: (nextPass: SegmentPassIndex) => void;
  onFinalTextChange?: (value: string) => void;
  onFinalTextLockChange?: (locked: boolean) => void;
};

function buildQaFindingSummary(segment: DocumentSegment): string {
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

function FocusSurfaceContent({
  activePass,
  segment,
  isRunning = false,
  onClose,
  onActivePassChange,
  onFinalTextChange,
  onFinalTextLockChange,
  surfaceTestId,
}: Omit<SegmentFocusSurfaceProps, 'open' | 'isDesktop'> & {
  surfaceTestId: string;
}): ReactElement {
  const isFinalPass = activePass === 6;
  const passText = getSegmentPassText(segment, activePass);
  const passLabel = getSegmentPassLabel(activePass);
  const wordCount = countWords(segment.sourceText);

  return (
    <Box
      data-testid={surfaceTestId}
      sx={{
        height: '100%',
        minHeight: 0,
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      <DialogTitle sx={{ pb: 1.5 }}>
        <Stack
          direction="row"
          spacing={1}
          sx={{ alignItems: 'flex-start', justifyContent: 'space-between' }}
        >
          <Box sx={{ minWidth: 0 }}>
            <Typography variant="overline" color="text.secondary">
              Focus mode
            </Typography>
            <Typography variant="h5" component="h2">
              Segment {segment.index + 1}
            </Typography>
            <Typography variant="caption" color="text.secondary">
              {wordCount} words · {segment.status} · {passLabel}
            </Typography>
          </Box>
          <IconButton aria-label="Close focus mode" onClick={onClose}>
            <CloseRoundedIcon />
          </IconButton>
        </Stack>
      </DialogTitle>

      <DialogContent
        dividers
        sx={{
          flex: 1,
          minHeight: 0,
          display: 'flex',
          flexDirection: 'column',
          gap: 2,
          overflowY: 'auto',
          pb: 2.5,
        }}
      >
        <Tabs
          value={activePass}
          onChange={(_, nextValue: number) => {
            onActivePassChange(nextValue as SegmentPassIndex);
          }}
          variant="scrollable"
          scrollButtons="auto"
          sx={{
            position: 'sticky',
            top: 0,
            zIndex: 2,
            bgcolor: 'background.paper',
            pb: 0.5,
          }}
        >
          {segmentPassLabels.map((label, index) => (
            <Tab key={label} label={label} value={index} />
          ))}
        </Tabs>

        <Box
          sx={{
            display: 'grid',
            gap: 2,
            gridTemplateColumns: { xs: '1fr', lg: 'minmax(0, 1.1fr) minmax(0, 0.9fr)' },
            alignItems: 'start',
            minHeight: 0,
          }}
        >
          <Stack spacing={2} sx={{ minWidth: 0 }}>
            <Paper variant="outlined" sx={{ p: 2, minWidth: 0 }}>
              <Stack spacing={1}>
                <Typography variant="subtitle2" color="text.secondary">
                  Source and analysis
                </Typography>
                <Box
                  sx={{
                    maxHeight: { xs: 220, lg: 'min(32vh, 320px)' },
                    overflowY: 'auto',
                    pr: 0.5,
                  }}
                >
                  <Typography variant="body1" sx={{ whiteSpace: 'pre-wrap' }}>
                    {segment.sourceText}
                  </Typography>
                  <Typography
                    variant="body2"
                    color="text.secondary"
                    sx={{ mt: 1.5, whiteSpace: 'pre-wrap' }}
                  >
                    {segment.sourceAnalysis}
                  </Typography>
                </Box>
              </Stack>
            </Paper>

            <WorkspaceAccordion
              title="QA findings"
              caption="Open issues for this segment"
              badge={segment.qaFindings.length > 0 ? null : undefined}
              defaultExpanded={segment.qaFindings.length > 0}
            >
              <Typography variant="body2" color="text.secondary" sx={{ whiteSpace: 'pre-wrap' }}>
                {buildQaFindingSummary(segment)}
              </Typography>
            </WorkspaceAccordion>
          </Stack>

          <Paper
            variant="outlined"
            sx={{ p: 2, minWidth: 0, display: 'flex', flexDirection: 'column' }}
          >
            <Stack spacing={1.25} sx={{ minHeight: 0 }}>
              <Typography variant="subtitle2" color="text.secondary">
                {isFinalPass ? 'Final approved text' : passLabel}
              </Typography>
              {isFinalPass ? (
                <Stack spacing={1.25}>
                  <TextField
                    label="Final text"
                    value={segment.finalText ?? ''}
                    disabled={isRunning}
                    onChange={(event) => {
                      onFinalTextChange?.(event.target.value);
                    }}
                    multiline
                    minRows={10}
                    maxRows={18}
                    fullWidth
                  />
                  <FormControlLabel
                    control={
                      <Switch
                        checked={Boolean(segment.finalTextLocked)}
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
                  sx={{
                    maxHeight: { xs: 260, lg: 'min(40vh, 420px)' },
                    overflowY: 'auto',
                    pr: 0.5,
                  }}
                >
                  <Typography
                    variant="body1"
                    color="text.secondary"
                    sx={{ whiteSpace: 'pre-wrap' }}
                  >
                    {passText}
                  </Typography>
                </Box>
              )}
            </Stack>
          </Paper>
        </Box>
      </DialogContent>
    </Box>
  );
}

export function SegmentFocusSurface({
  open,
  isDesktop,
  activePass,
  segment,
  isRunning,
  onClose,
  onActivePassChange,
  onFinalTextChange,
  onFinalTextLockChange,
}: SegmentFocusSurfaceProps): ReactElement {
  if (isDesktop) {
    return (
      <Drawer
        anchor="right"
        open={open}
        onClose={onClose}
        slotProps={{
          paper: {
            sx: {
              width: { xs: '100vw', md: 'min(88vw, 980px)' },
              maxWidth: 980,
              backgroundImage: 'none',
            },
          },
        }}
      >
        <FocusSurfaceContent
          activePass={activePass}
          segment={segment}
          isRunning={isRunning}
          onClose={onClose}
          onActivePassChange={onActivePassChange}
          onFinalTextChange={onFinalTextChange}
          onFinalTextLockChange={onFinalTextLockChange}
          surfaceTestId="segment-focus-drawer"
        />
      </Drawer>
    );
  }

  return (
    <Dialog fullScreen open={open} onClose={onClose}>
      <FocusSurfaceContent
        activePass={activePass}
        segment={segment}
        isRunning={isRunning}
        onClose={onClose}
        onActivePassChange={onActivePassChange}
        onFinalTextChange={onFinalTextChange}
        onFinalTextLockChange={onFinalTextLockChange}
        surfaceTestId="segment-focus-dialog"
      />
    </Dialog>
  );
}
