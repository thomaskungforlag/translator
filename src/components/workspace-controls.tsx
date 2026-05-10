import { type ChangeEvent, type ReactElement } from 'react';

import type { AlertColor } from '@mui/material';
import {
  Alert,
  Button,
  IconButton,
  LinearProgress,
  MenuItem,
  Paper,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import DeleteOutlineRoundedIcon from '@mui/icons-material/DeleteOutlineRounded';
import AddRoundedIcon from '@mui/icons-material/AddRounded';

import type { ContentType, LanguageConfig } from '@/lib/domain';
import type { SegmentationStrategy } from '@/lib/workspace';

type WorkspaceControlsProps = {
  sourceText: string;
  contentType: ContentType;
  targetLanguage: LanguageConfig;
  segmentationStrategy: SegmentationStrategy;
  segmentPreviewCount: number;
  editableSegments: string[];
  isRunning: boolean;
  runElapsedSeconds: number;
  statusMessage?: string;
  statusSeverity?: AlertColor;
  onSourceTextChange: (value: string) => void;
  onSegmentationStrategyChange: (value: SegmentationStrategy) => void;
  onEditableSegmentChange: (index: number, value: string) => void;
  onEditableSegmentAdd: () => void;
  onEditableSegmentRemove: (index: number) => void;
  onSplitSourceByLineBreaks: () => void;
  onImportText: (value: string, fileName: string) => void;
  onRunPipeline: () => void;
};

export function WorkspaceControls({
  sourceText,
  contentType,
  targetLanguage,
  segmentationStrategy,
  segmentPreviewCount,
  editableSegments,
  isRunning,
  runElapsedSeconds,
  statusMessage,
  statusSeverity = 'info',
  onSourceTextChange,
  onSegmentationStrategyChange,
  onEditableSegmentChange,
  onEditableSegmentAdd,
  onEditableSegmentRemove,
  onSplitSourceByLineBreaks,
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
          <TextField
            select
            fullWidth
            label="Segmentation"
            value={segmentationStrategy}
            onChange={(event) => {
              onSegmentationStrategyChange(event.target.value as SegmentationStrategy);
            }}
          >
            <MenuItem value="paragraph">Paragraph</MenuItem>
            <MenuItem value="scene_markers">Scene markers</MenuItem>
            <MenuItem value="hybrid">Hybrid</MenuItem>
          </TextField>
        </Stack>
        <Typography variant="caption" color="text.secondary">
          Segment preview: {segmentPreviewCount}{' '}
          {segmentPreviewCount === 1 ? 'segment' : 'segments'}
        </Typography>
        <Stack spacing={1}>
          <Stack
            direction={{ xs: 'column', sm: 'row' }}
            spacing={1}
            sx={{ justifyContent: 'space-between', alignItems: { xs: 'flex-start', sm: 'center' } }}
          >
            <Typography variant="body2" sx={{ fontWeight: 650 }}>
              Scene-by-scene editor (before pipeline)
            </Typography>
            <Stack direction="row" spacing={1}>
              <Button
                size="small"
                variant="outlined"
                onClick={onSplitSourceByLineBreaks}
                disabled={!sourceText.trim()}
              >
                Split by line breaks
              </Button>
              <Button
                size="small"
                variant="outlined"
                startIcon={<AddRoundedIcon />}
                onClick={onEditableSegmentAdd}
              >
                Add segment
              </Button>
            </Stack>
          </Stack>

          {editableSegments.length === 0 ? (
            <Typography variant="caption" color="text.secondary">
              Add a segment or paste source text to prepare scenes before running the pipeline.
            </Typography>
          ) : null}

          {editableSegments.map((segment, index) => (
            <Stack
              key={`editable-segment-${index + 1}`}
              direction="row"
              spacing={1}
              sx={{ alignItems: 'flex-start' }}
            >
              <TextField
                fullWidth
                multiline
                minRows={2}
                label={`Segment ${index + 1}`}
                value={segment}
                onChange={(event) => {
                  onEditableSegmentChange(index, event.target.value);
                }}
              />
              <IconButton
                aria-label={`Remove segment ${index + 1}`}
                color="error"
                onClick={() => {
                  onEditableSegmentRemove(index);
                }}
                sx={{ mt: 1 }}
              >
                <DeleteOutlineRoundedIcon fontSize="small" />
              </IconButton>
            </Stack>
          ))}
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
        {isRunning ? (
          <Stack spacing={1}>
            <Typography variant="caption" color="text.secondary">
              Pipeline running with the active provider model ({runElapsedSeconds}s elapsed)
            </Typography>
            <LinearProgress aria-label="Pipeline in progress" />
          </Stack>
        ) : null}
        {statusMessage ? <Alert severity={statusSeverity}>{statusMessage}</Alert> : null}
      </Stack>
    </Paper>
  );
}
