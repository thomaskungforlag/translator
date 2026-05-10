import type { ReactElement } from 'react';

import { Button, Chip, Paper, Stack, Typography } from '@mui/material';

import type { DocumentSegment } from '@/lib/domain';

type SegmentListProps = {
  segments: DocumentSegment[];
  selectedSegmentId: string;
  onSelectSegment: (segmentId: string) => void;
};

export function SegmentList({
  segments,
  selectedSegmentId,
  onSelectSegment,
}: SegmentListProps): ReactElement {
  return (
    <Paper variant="outlined" sx={{ p: 2, height: '100%', minWidth: 0 }}>
      <Stack spacing={1.5}>
        <Typography variant="subtitle2" color="text.secondary">
          Segments
        </Typography>
        {segments.map((segment) => {
          const isSelected = segment.id === selectedSegmentId;

          return (
            <Button
              key={segment.id}
              variant={isSelected ? 'contained' : 'text'}
              onClick={() => {
                onSelectSegment(segment.id);
              }}
              data-testid={`segment-select-${segment.index + 1}`}
              sx={{ justifyContent: 'flex-start', borderRadius: 3, px: 1.5, py: 1.25 }}
            >
              <Stack spacing={0.25} sx={{ alignItems: 'flex-start', width: '100%' }}>
                <Stack direction="row" spacing={1} sx={{ alignItems: 'center', width: '100%' }}>
                  <Typography variant="body2" sx={{ fontWeight: 650 }}>
                    Segment {segment.index + 1}
                  </Typography>
                  <Chip size="small" label={segment.status} variant="outlined" />
                </Stack>
                <Typography
                  variant="caption"
                  color="inherit"
                  sx={{ opacity: 0.8, textAlign: 'left' }}
                >
                  {segment.sourceText}
                </Typography>
              </Stack>
            </Button>
          );
        })}
      </Stack>
    </Paper>
  );
}
