import { useState, type ReactElement } from 'react';

import {
  Box,
  Chip,
  Paper,
  Stack,
  Tab,
  Tabs,
  Typography,
  useMediaQuery,
  useTheme,
} from '@mui/material';

import type { DocumentSegment } from '@/lib/domain';

import { StageNotesCard } from './stage-notes-card';
import { SegmentFocusSurface } from './segment-focus-surface';
import { SegmentList } from './segment-list';
import { SelectedSegmentCard } from './selected-segment-card';
import { countWords, segmentPassLabels, type SegmentPassIndex } from './segment-display-utils';

type SegmentReviewPanelProps = {
  segments: DocumentSegment[];
  selectedSegmentIndex?: number | null;
  onSegmentFinalTextChange?: (segmentId: string, value: string) => void;
  onSegmentFinalTextLockChange?: (segmentId: string, locked: boolean) => void;
};

export function SegmentReviewPanel({
  segments,
  selectedSegmentIndex,
  onSegmentFinalTextChange,
  onSegmentFinalTextLockChange,
}: SegmentReviewPanelProps): ReactElement {
  const theme = useTheme();
  const isDesktop = useMediaQuery(theme.breakpoints.up('lg'), { noSsr: true });
  const [activePass, setActivePass] = useState<SegmentPassIndex>(0);
  const [selectedSegmentId, setSelectedSegmentId] = useState(segments[0]?.id ?? '');
  const [isFocusModeOpen, setIsFocusModeOpen] = useState(false);

  const selectedSegmentFromWarning =
    selectedSegmentIndex === null || selectedSegmentIndex === undefined
      ? undefined
      : segments[selectedSegmentIndex];
  const resolvedSelectedSegmentId =
    selectedSegmentFromWarning?.id ?? selectedSegmentId ?? segments[0]?.id ?? '';
  const selectedSegment =
    segments.find((segment) => segment.id === resolvedSelectedSegmentId) ?? segments[0];
  const selectedSegmentIdForList = selectedSegment?.id ?? '';
  const totalWords = segments.reduce((count, segment) => count + countWords(segment.sourceText), 0);

  if (!selectedSegment) {
    return (
      <Paper sx={{ p: 2.5 }}>
        <Typography variant="body2" color="text.secondary">
          No segments available.
        </Typography>
      </Paper>
    );
  }

  return (
    <Paper
      sx={{
        p: 2.5,
        height: { lg: 'min(82vh, 980px)' },
        minHeight: 0,
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
      }}
    >
      <Stack spacing={2} sx={{ minHeight: 0, flex: 1 }}>
        <Stack
          direction={{ xs: 'column', md: 'row' }}
          spacing={2}
          sx={{ justifyContent: 'space-between', alignItems: { xs: 'flex-start', md: 'center' } }}
        >
          <Box sx={{ minWidth: 0 }}>
            <Typography variant="overline" color="text.secondary">
              Segment review
            </Typography>
            <Typography variant="h6">Bounded inspector for large scenes</Typography>
            <Stack direction="row" spacing={1} sx={{ mt: 1, flexWrap: 'wrap' }}>
              <Chip size="small" label={`${segments.length} segments`} variant="outlined" />
              <Chip size="small" label={`${totalWords} words`} variant="outlined" />
              <Chip size="small" label={segmentPassLabels[activePass]} color="primary" />
            </Stack>
          </Box>

          <Tabs
            value={activePass}
            onChange={(_, nextValue: number) => {
              setActivePass(nextValue as SegmentPassIndex);
            }}
            variant="scrollable"
            scrollButtons="auto"
            sx={{
              position: 'sticky',
              top: 0,
              zIndex: 1,
              bgcolor: 'background.paper',
              borderRadius: 999,
              px: 0.5,
            }}
          >
            {segmentPassLabels.map((label, index) => (
              <Tab key={label} label={label} value={index} />
            ))}
          </Tabs>
        </Stack>

        <Box
          sx={{
            width: '100%',
            display: 'grid',
            gap: 2,
            flex: 1,
            minHeight: 0,
            gridTemplateColumns: { xs: '1fr', lg: 'minmax(0, 340px) minmax(0, 1fr)' },
          }}
        >
          <SegmentList
            segments={segments}
            selectedSegmentId={selectedSegmentIdForList}
            onSelectSegment={(segmentId) => {
              setSelectedSegmentId(segmentId);
            }}
          />

          <Box
            sx={{
              display: 'grid',
              gap: 2,
              gridTemplateRows: { lg: 'minmax(0, 1fr) auto' },
              minWidth: 0,
              minHeight: 0,
            }}
          >
            <SelectedSegmentCard
              activePass={activePass}
              selectedSegment={selectedSegment}
              onFinalTextChange={(value) => {
                onSegmentFinalTextChange?.(selectedSegment.id, value);
              }}
              onFinalTextLockChange={(locked) => {
                onSegmentFinalTextLockChange?.(selectedSegment.id, locked);
              }}
              onOpenFocusMode={() => {
                setIsFocusModeOpen(true);
              }}
            />
            <StageNotesCard />
          </Box>
        </Box>
      </Stack>

      <SegmentFocusSurface
        open={isFocusModeOpen}
        isDesktop={isDesktop}
        activePass={activePass}
        segment={selectedSegment}
        onClose={() => {
          setIsFocusModeOpen(false);
        }}
        onActivePassChange={setActivePass}
        onFinalTextChange={(value) => {
          onSegmentFinalTextChange?.(selectedSegment.id, value);
        }}
        onFinalTextLockChange={(locked) => {
          onSegmentFinalTextLockChange?.(selectedSegment.id, locked);
        }}
      />
    </Paper>
  );
}
