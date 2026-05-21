import { type ChangeEvent, type MouseEvent, useRef, useState, type ReactElement } from 'react';

import type { AlertColor } from '@mui/material';
import {
  Alert,
  Chip,
  Button,
  Divider,
  Box,
  IconButton,
  LinearProgress,
  Menu,
  MenuItem,
  Paper,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import DeleteOutlineRoundedIcon from '@mui/icons-material/DeleteOutlineRounded';
import AddRoundedIcon from '@mui/icons-material/AddRounded';
import MoreHorizRoundedIcon from '@mui/icons-material/MoreHorizRounded';

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
  pipelineWarnings: string[];
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
  pipelineWarnings,
  onSourceTextChange,
  onSegmentationStrategyChange,
  onEditableSegmentChange,
  onEditableSegmentAdd,
  onEditableSegmentRemove,
  onSplitSourceByLineBreaks,
  onImportText,
  onRunPipeline,
}: WorkspaceControlsProps): ReactElement {
  const importInputRef = useRef<HTMLInputElement>(null);
  const [sceneActionsAnchorEl, setSceneActionsAnchorEl] = useState<HTMLElement | null>(null);

  const handleSceneActionsClick = (event: MouseEvent<HTMLButtonElement>): void => {
    setSceneActionsAnchorEl(event.currentTarget);
  };

  const handleSceneActionsClose = (): void => {
    setSceneActionsAnchorEl(null);
  };

  const handleImportClick = (): void => {
    importInputRef.current?.click();
  };

  const handleSplitByLineBreaks = (): void => {
    onSplitSourceByLineBreaks();
    handleSceneActionsClose();
  };

  const handleAddSegment = (): void => {
    onEditableSegmentAdd();
    handleSceneActionsClose();
  };

  const handleRunPipelineClick = (): void => {
    onRunPipeline();
    handleSceneActionsClose();
  };

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

  const recoveryWarnings = pipelineWarnings.map((warning) => parsePipelineWarning(warning));

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
        <Paper
          variant="outlined"
          data-testid="workspace-actions-toolbar"
          sx={{
            position: 'sticky',
            top: 16,
            zIndex: 2,
            px: 1.5,
            py: 1.25,
            backdropFilter: 'blur(18px)',
            backgroundImage: 'none',
          }}
        >
          <Stack
            direction={{ xs: 'column', md: 'row' }}
            spacing={1.25}
            sx={{
              justifyContent: 'space-between',
              alignItems: { xs: 'flex-start', md: 'center' },
            }}
          >
            <Box>
              <Typography variant="body2" sx={{ fontWeight: 650 }}>
                Scene-by-scene editor
              </Typography>
              <Typography variant="caption" color="text.secondary">
                Keep scene actions visible while the source list gets long.
              </Typography>
            </Box>

            <Stack direction="row" spacing={1} sx={{ flexWrap: 'wrap' }}>
              <Button
                size="small"
                variant="outlined"
                startIcon={<MoreHorizRoundedIcon />}
                onClick={handleSceneActionsClick}
                aria-controls={sceneActionsAnchorEl ? 'scene-actions-menu' : undefined}
                aria-haspopup="true"
                aria-expanded={sceneActionsAnchorEl ? 'true' : undefined}
              >
                Scene actions
              </Button>
              <Button size="small" variant="outlined" onClick={handleImportClick}>
                Import text/Markdown
              </Button>
              <Button
                size="small"
                variant="contained"
                onClick={handleRunPipelineClick}
                disabled={isRunning}
              >
                {isRunning ? 'Running pipeline…' : 'Run pipeline'}
              </Button>
            </Stack>
          </Stack>
          <Menu
            id="scene-actions-menu"
            anchorEl={sceneActionsAnchorEl}
            open={Boolean(sceneActionsAnchorEl)}
            onClose={handleSceneActionsClose}
          >
            <MenuItem onClick={handleSplitByLineBreaks} disabled={!sourceText.trim()}>
              Split by line breaks
            </MenuItem>
            <MenuItem onClick={handleAddSegment}>
              <AddRoundedIcon fontSize="small" />
              Add segment
            </MenuItem>
            <Divider />
            <MenuItem
              onClick={() => {
                handleSceneActionsClose();
                handleImportClick();
              }}
            >
              Import text/Markdown
            </MenuItem>
            <MenuItem onClick={handleRunPipelineClick} disabled={isRunning}>
              {isRunning ? 'Running pipeline…' : 'Run pipeline'}
            </MenuItem>
          </Menu>
        </Paper>

        <Stack spacing={1}>
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
        <input
          ref={importInputRef}
          hidden
          type="file"
          accept=".txt,.md,text/plain,text/markdown"
          onChange={(event) => {
            void handleImportChange(event);
          }}
        />
        {isRunning ? (
          <Stack spacing={1}>
            <Typography variant="caption" color="text.secondary">
              Pipeline running with the active provider model ({runElapsedSeconds}s elapsed)
            </Typography>
            <LinearProgress aria-label="Pipeline in progress" />
          </Stack>
        ) : null}
        {statusMessage ? <Alert severity={statusSeverity}>{statusMessage}</Alert> : null}
        {recoveryWarnings.length > 0 ? (
          <Paper
            variant="outlined"
            data-testid="workspace-recovery-details"
            sx={{
              p: 1.5,
              borderColor: 'warning.main',
              backgroundColor: 'rgba(255, 179, 0, 0.04)',
            }}
          >
            <Stack spacing={1.25}>
              <Stack direction="row" spacing={1} sx={{ alignItems: 'center', flexWrap: 'wrap' }}>
                <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>
                  Recovery details
                </Typography>
                <Chip
                  size="small"
                  color="warning"
                  variant="outlined"
                  label={`${recoveryWarnings.length} warning${recoveryWarnings.length === 1 ? '' : 's'}`}
                />
              </Stack>
              <Typography variant="body2" color="text.secondary">
                The pipeline produced usable text, but one or more segments were recovered locally
                after the provider returned invalid structured output. Review the affected
                segment(s) before publishing.
              </Typography>
              <Stack spacing={1}>
                {recoveryWarnings.map((warning, index) => (
                  <Box
                    key={`${warning.stageLabel}-${warning.impactedSegmentsLabel}-${index}`}
                    data-testid={`workspace-recovery-warning-${index}`}
                    sx={{
                      p: 1.25,
                      borderRadius: 2,
                      border: '1px solid',
                      borderColor: 'divider',
                      backgroundColor: 'background.paper',
                    }}
                  >
                    <Stack
                      direction="row"
                      spacing={1}
                      sx={{ mb: 0.75, flexWrap: 'wrap', alignItems: 'center' }}
                    >
                      <Chip size="small" label={warning.stageLabel} />
                      <Chip size="small" variant="outlined" label={warning.impactedSegmentsLabel} />
                    </Stack>
                    <Typography variant="body2" sx={{ fontWeight: 600 }}>
                      Why this is flagged
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      {warning.reason}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      {warning.guidance}
                    </Typography>
                  </Box>
                ))}
              </Stack>
            </Stack>
          </Paper>
        ) : null}
      </Stack>
    </Paper>
  );
}

type ParsedPipelineWarning = {
  stageLabel: string;
  impactedSegmentsLabel: string;
  reason: string;
  guidance: string;
};

const pipelineWarningPattern =
  /^(?<stage>.+?) recovered (?:with local fallback|without model findings) for source segment index\(es\): (?<range>[^.]+)\. Reason: (?<reason>.+?)(?:\.)?$/;

function formatStageLabel(value: string): string {
  const preservedWords = new Set(['qa', 'api', 'pdf', 'ui', 'llm', 'json']);

  return value
    .split('_')
    .filter((part) => part.length > 0)
    .map((part) => {
      const lower = part.toLowerCase();

      if (preservedWords.has(lower)) {
        return lower.toUpperCase();
      }

      return lower.charAt(0).toUpperCase() + lower.slice(1);
    })
    .join(' ');
}

function formatSegmentRange(range: string): string {
  const match = range.match(/^(\d+)-(\d+)$/);

  if (!match) {
    return range;
  }

  const start = Number(match[1]) + 1;
  const end = Number(match[2]) + 1;

  return start === end ? `Segment ${start}` : `Segments ${start}-${end}`;
}

function parsePipelineWarning(warning: string): ParsedPipelineWarning {
  const match = warning.match(pipelineWarningPattern);

  if (!match?.groups) {
    return {
      stageLabel: 'Pipeline warning',
      impactedSegmentsLabel: 'Review required',
      reason: warning,
      guidance: 'Review the affected segment(s) before publishing.',
    };
  }

  return {
    stageLabel: formatStageLabel(match.groups.stage),
    impactedSegmentsLabel: formatSegmentRange(match.groups.range),
    reason: match.groups.reason.trim(),
    guidance:
      'The translated text in this segment was rebuilt locally, so compare it against the source and re-run if you want a fresh provider pass.',
  };
}
