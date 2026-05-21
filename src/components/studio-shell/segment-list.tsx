import { useEffect, useRef, type ReactElement } from 'react';

import {
  Box,
  Chip,
  List,
  ListItemButton,
  ListItemText,
  Paper,
  Stack,
  Typography,
} from '@mui/material';

import type { DocumentSegment } from '@/lib/domain';
import { buildSegmentPreview, countWords } from './segment-display-utils';

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
  const buttonRefs = useRef<Record<string, HTMLDivElement | null>>({});

  useEffect(() => {
    buttonRefs.current[selectedSegmentId]?.scrollIntoView?.({
      block: 'nearest',
    });
  }, [selectedSegmentId]);

  return (
    <Paper
      variant="outlined"
      sx={{
        p: 2,
        height: '100%',
        minHeight: 0,
        minWidth: 0,
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
      }}
    >
      <Stack spacing={0.75} sx={{ flex: '0 0 auto' }}>
        <Typography variant="subtitle2" color="text.secondary">
          Segments
        </Typography>
      </Stack>
      <Box
        data-testid="segment-list-scroll"
        sx={{ mt: 1.5, minHeight: 0, overflowY: 'auto', pr: 0.5 }}
      >
        <List disablePadding>
          {segments.map((segment) => {
            const isSelected = segment.id === selectedSegmentId;
            const wordCount = countWords(segment.sourceText);

            return (
              <ListItemButton
                key={segment.id}
                selected={isSelected}
                ref={(node) => {
                  buttonRefs.current[segment.id] = node;
                }}
                onClick={() => {
                  onSelectSegment(segment.id);
                }}
                data-testid={`segment-select-${segment.index + 1}`}
                sx={{
                  mb: 1,
                  alignItems: 'flex-start',
                  borderRadius: 3,
                  border: '1px solid',
                  borderColor: isSelected ? 'primary.main' : 'divider',
                  bgcolor: isSelected ? 'action.selected' : 'background.paper',
                  '&.Mui-selected': {
                    bgcolor: 'action.selected',
                  },
                }}
              >
                <ListItemText
                  primary={
                    <Stack
                      direction="row"
                      spacing={1}
                      sx={{ alignItems: 'center', justifyContent: 'space-between', width: '100%' }}
                    >
                      <Typography variant="body2" sx={{ fontWeight: 700 }}>
                        Segment {segment.index + 1}
                      </Typography>
                      <Stack direction="row" spacing={0.75} sx={{ flexWrap: 'wrap' }}>
                        <Chip size="small" label={segment.status} variant="outlined" />
                        <Chip size="small" label={`${wordCount} words`} variant="outlined" />
                      </Stack>
                    </Stack>
                  }
                  secondary={
                    <Typography
                      variant="caption"
                      color="text.secondary"
                      sx={{
                        display: '-webkit-box',
                        WebkitBoxOrient: 'vertical',
                        WebkitLineClamp: 2,
                        overflow: 'hidden',
                        textAlign: 'left',
                        mt: 0.75,
                      }}
                    >
                      {buildSegmentPreview(segment.sourceText)}
                    </Typography>
                  }
                  sx={{ my: 0 }}
                />
              </ListItemButton>
            );
          })}
        </List>
      </Box>
    </Paper>
  );
}
