import { useState, type ReactElement } from 'react';

import { Box, Paper, Stack, Tab, Tabs, Typography } from '@mui/material';

import type { DocumentSegment } from '@/lib/domain';

import { SegmentList } from './segment-list';
import { SelectedSegmentCard } from './selected-segment-card';
import { StageNotesCard } from './stage-notes-card';

const passLabels = ['Source prep', 'Faithful', 'Voice', 'Polish', 'QA'] as const;

type SegmentReviewPanelProps = {
  segments: DocumentSegment[];
  onSegmentFinalTextChange?: (segmentId: string, value: string) => void;
  onSegmentFinalTextLockChange?: (segmentId: string, locked: boolean) => void;
};

export function SegmentReviewPanel({
  segments,
  onSegmentFinalTextChange,
  onSegmentFinalTextLockChange,
}: SegmentReviewPanelProps): ReactElement {
  const [activePass, setActivePass] = useState(0);
  const [selectedSegmentId, setSelectedSegmentId] = useState(segments[0]?.id ?? '');

  const selectedSegment =
    segments.find((segment) => segment.id === selectedSegmentId) ?? segments[0];

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
    <Paper sx={{ p: 2.5 }}>
      <Stack spacing={2}>
        <Stack
          direction={{ xs: 'column', md: 'row' }}
          spacing={2}
          sx={{ justifyContent: 'space-between', alignItems: { xs: 'flex-start', md: 'center' } }}
        >
          <Box>
            <Typography variant="overline" color="text.secondary">
              Segment review
            </Typography>
            <Typography variant="h6">Source, draft, and final output side by side</Typography>
          </Box>
          <Tabs
            value={activePass}
            onChange={(_, nextValue: number) => {
              setActivePass(nextValue);
            }}
            variant="scrollable"
            scrollButtons="auto"
          >
            {passLabels.map((label, index) => (
              <Tab key={label} label={label} value={index} />
            ))}
          </Tabs>
        </Stack>

        <Box
          sx={{
            width: '100%',
            display: 'grid',
            gap: 2,
            gridTemplateColumns: { xs: '1fr', md: 'minmax(0, 0.35fr) minmax(0, 0.65fr)' },
          }}
        >
          <SegmentList
            segments={segments}
            selectedSegmentId={selectedSegment.id}
            onSelectSegment={setSelectedSegmentId}
          />

          <Stack spacing={2} sx={{ minWidth: 0 }}>
            <SelectedSegmentCard
              activePass={activePass}
              selectedSegment={selectedSegment}
              onFinalTextChange={(value) => {
                onSegmentFinalTextChange?.(selectedSegment.id, value);
              }}
              onFinalTextLockChange={(locked) => {
                onSegmentFinalTextLockChange?.(selectedSegment.id, locked);
              }}
            />
            <StageNotesCard />
          </Stack>
        </Box>
      </Stack>
    </Paper>
  );
}
