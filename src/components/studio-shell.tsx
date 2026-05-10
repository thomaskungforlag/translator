'use client';

import { useState, type ReactElement } from 'react';

import AutoAwesomeRoundedIcon from '@mui/icons-material/AutoAwesomeRounded';
import BookOutlinedIcon from '@mui/icons-material/BookOutlined';
import CheckCircleOutlineRoundedIcon from '@mui/icons-material/CheckCircleOutlineRounded';
import ContentCopyRoundedIcon from '@mui/icons-material/ContentCopyRounded';
import DescriptionOutlinedIcon from '@mui/icons-material/DescriptionOutlined';
import DownloadRoundedIcon from '@mui/icons-material/DownloadRounded';
import EditRoundedIcon from '@mui/icons-material/EditRounded';
import PlayArrowRoundedIcon from '@mui/icons-material/PlayArrowRounded';
import ScienceOutlinedIcon from '@mui/icons-material/ScienceOutlined';
import WarningAmberRoundedIcon from '@mui/icons-material/WarningAmberRounded';
import {
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  Divider,
  IconButton,
  LinearProgress,
  List,
  ListItem,
  ListItemButton,
  ListItemText,
  Paper,
  Stack,
  Tab,
  Tabs,
  Tooltip,
  Typography,
} from '@mui/material';

import type {
  ContentType,
  DocumentSegment,
  GlossaryEntry,
  LanguageConfig,
  QAFinding,
  SegmentStatus,
} from '@/lib/domain';

type StudioShellProps = {
  apiKeyConfigured: boolean;
  project: {
    title: string;
    contentType: ContentType;
    targetLanguage: LanguageConfig;
    progress: number;
    segments: DocumentSegment[];
    glossary: GlossaryEntry[];
    qaFindings: QAFinding[];
    pipelineStages: Array<{ label: string; status: SegmentStatus | 'running' | 'idle' }>;
  };
};

const passLabels = ['Source prep', 'Faithful', 'Voice', 'Polish', 'QA'] as const;

export function StudioShell({ apiKeyConfigured, project }: StudioShellProps): ReactElement {
  const [activePass, setActivePass] = useState(2);
  const [selectedSegmentId, setSelectedSegmentId] = useState(project.segments[0]?.id ?? '');

  const selectedSegment =
    project.segments.find((segment) => segment.id === selectedSegmentId) ?? project.segments[0];

  return (
    <Box
      sx={{
        minHeight: '100vh',
        width: '100%',
        px: { xs: 2, md: 3 },
        py: { xs: 2, md: 3 },
        overflowX: 'clip',
      }}
    >
      <Stack spacing={3}>
        <Paper
          sx={{
            p: { xs: 2.25, md: 3 },
            borderRadius: 4,
            background:
              'linear-gradient(135deg, rgba(14, 20, 41, 0.94) 0%, rgba(9, 15, 30, 0.82) 100%)',
          }}
        >
          <Stack
            direction={{ xs: 'column', lg: 'row' }}
            spacing={2}
            sx={{
              alignItems: { xs: 'flex-start', lg: 'center' },
              justifyContent: 'space-between',
            }}
          >
            <Box>
              <Stack direction="row" spacing={1} sx={{ alignItems: 'center', mb: 1 }}>
                <Chip size="small" color="primary" label="MVP foundation" />
                <Chip
                  size="small"
                  variant="outlined"
                  label={apiKeyConfigured ? 'OpenAI key configured' : 'OpenAI key missing'}
                  color={apiKeyConfigured ? 'success' : 'warning'}
                />
              </Stack>
              <Typography variant="h4" component="h1" gutterBottom sx={{ mb: 1 }}>
                Thomas Kung Author Translation Studio
              </Typography>
              <Typography variant="body1" color="text.secondary" sx={{ maxWidth: 820 }}>
                A multi-pass literary translation workbench for Swedish fiction, built to preserve
                voice, structure, terminology, and QA traceability from source text to final
                market-ready English.
              </Typography>
            </Box>

            <Stack direction="row" spacing={1.5} sx={{ flexWrap: 'wrap' }}>
              <Button variant="contained" startIcon={<PlayArrowRoundedIcon />}>
                Run pipeline
              </Button>
              <Button variant="outlined" startIcon={<DownloadRoundedIcon />}>
                Export Markdown
              </Button>
            </Stack>
          </Stack>
        </Paper>

        <Box
          sx={{
            width: '100%',
            display: 'grid',
            gap: 3,
            gridTemplateColumns: {
              xs: '1fr',
              xl: 'minmax(0, 320px) minmax(0, 1fr) minmax(0, 320px)',
            },
          }}
        >
          <Box sx={{ minWidth: 0 }}>
            <Stack spacing={3}>
              <Paper sx={{ p: 2.5 }}>
                <Stack
                  direction="row"
                  sx={{ justifyContent: 'space-between', alignItems: 'center', mb: 2 }}
                >
                  <Box>
                    <Typography variant="overline" color="text.secondary">
                      Project
                    </Typography>
                    <Typography variant="h6">{project.title}</Typography>
                  </Box>
                  <IconButton size="small" color="primary">
                    <EditRoundedIcon fontSize="small" />
                  </IconButton>
                </Stack>

                <Stack spacing={1.5}>
                  <Stack direction="row" spacing={1} sx={{ flexWrap: 'wrap' }}>
                    <Chip
                      size="small"
                      icon={<DescriptionOutlinedIcon />}
                      label={project.contentType}
                    />
                    <Chip
                      size="small"
                      icon={<ScienceOutlinedIcon />}
                      label={project.targetLanguage.label}
                    />
                  </Stack>

                  <Box>
                    <Stack direction="row" sx={{ justifyContent: 'space-between', mb: 0.75 }}>
                      <Typography variant="body2" color="text.secondary">
                        Pipeline progress
                      </Typography>
                      <Typography variant="body2" sx={{ fontWeight: 700 }}>
                        {project.progress}%
                      </Typography>
                    </Stack>
                    <LinearProgress
                      variant="determinate"
                      value={project.progress}
                      sx={{ height: 10, borderRadius: 999 }}
                    />
                  </Box>
                </Stack>
              </Paper>

              <Paper sx={{ p: 2.5 }}>
                <Typography variant="overline" color="text.secondary">
                  Pipeline stages
                </Typography>
                <Stack spacing={1.25} sx={{ mt: 1.5 }}>
                  {project.pipelineStages.map((stage) => (
                    <Card key={stage.label} variant="outlined" sx={{ borderRadius: 3 }}>
                      <CardContent sx={{ '&:last-child': { pb: 2 } }}>
                        <Stack
                          direction="row"
                          sx={{ justifyContent: 'space-between', alignItems: 'center' }}
                        >
                          <Typography variant="body2" sx={{ fontWeight: 650 }}>
                            {stage.label}
                          </Typography>
                          <Chip
                            size="small"
                            label={stage.status}
                            color={
                              stage.status === 'approved'
                                ? 'success'
                                : stage.status === 'running'
                                  ? 'primary'
                                  : 'default'
                            }
                            variant={stage.status === 'running' ? 'filled' : 'outlined'}
                          />
                        </Stack>
                      </CardContent>
                    </Card>
                  ))}
                </Stack>
              </Paper>

              <Paper sx={{ p: 2.5 }}>
                <Typography variant="overline" color="text.secondary">
                  Glossary snapshot
                </Typography>
                <List dense sx={{ mt: 1 }}>
                  {project.glossary.map((entry) => (
                    <ListItem key={entry.id} disablePadding sx={{ py: 0.5 }}>
                      <ListItemButton sx={{ borderRadius: 2 }}>
                        <ListItemText
                          primary={
                            <Stack direction="row" spacing={1} sx={{ alignItems: 'center' }}>
                              <Typography variant="body2" sx={{ fontWeight: 650 }}>
                                {entry.sourceTerm}
                              </Typography>
                              <Chip size="small" label={entry.category} variant="outlined" />
                            </Stack>
                          }
                          secondary={entry.targetTerm}
                        />
                      </ListItemButton>
                    </ListItem>
                  ))}
                </List>
              </Paper>
            </Stack>
          </Box>

          <Box sx={{ minWidth: 0 }}>
            <Stack spacing={3}>
              <Paper sx={{ p: 2.5 }}>
                <Stack spacing={2}>
                  <Stack
                    direction={{ xs: 'column', md: 'row' }}
                    spacing={2}
                    sx={{
                      justifyContent: 'space-between',
                      alignItems: { xs: 'flex-start', md: 'center' },
                    }}
                  >
                    <Box>
                      <Typography variant="overline" color="text.secondary">
                        Segment review
                      </Typography>
                      <Typography variant="h6">
                        Source, draft, and final output side by side
                      </Typography>
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
                    <Paper variant="outlined" sx={{ p: 2, height: '100%', minWidth: 0 }}>
                      <Stack spacing={1.5}>
                        <Typography variant="subtitle2" color="text.secondary">
                          Segments
                        </Typography>
                        {project.segments.map((segment) => {
                          const isSelected = segment.id === selectedSegment.id;

                          return (
                            <Button
                              key={segment.id}
                              variant={isSelected ? 'contained' : 'text'}
                              onClick={() => {
                                setSelectedSegmentId(segment.id);
                              }}
                              sx={{
                                justifyContent: 'flex-start',
                                borderRadius: 3,
                                px: 1.5,
                                py: 1.25,
                              }}
                            >
                              <Stack
                                spacing={0.25}
                                sx={{ alignItems: 'flex-start', width: '100%' }}
                              >
                                <Stack
                                  direction="row"
                                  spacing={1}
                                  sx={{ alignItems: 'center', width: '100%' }}
                                >
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

                    <Stack spacing={2} sx={{ minWidth: 0 }}>
                      <Paper variant="outlined" sx={{ p: 2.25, minWidth: 0 }}>
                        <Stack spacing={1.5}>
                          <Stack
                            direction="row"
                            sx={{ justifyContent: 'space-between', alignItems: 'center' }}
                          >
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

                          <Typography variant="h5" component="p">
                            {selectedSegment.sourceText}
                          </Typography>
                          <Divider />
                          <Typography variant="body1" color="text.secondary">
                            {activePass === 0 &&
                              'Paragraph structure is preserved and the source text is normalized before translation.'}
                            {activePass === 1 && selectedSegment.translationDraft}
                            {activePass === 2 && selectedSegment.voiceAdaptedDraft}
                            {activePass === 3 && selectedSegment.polishedDraft}
                            {activePass === 4 && selectedSegment.finalText}
                          </Typography>
                        </Stack>
                      </Paper>

                      <Paper variant="outlined" sx={{ p: 2.25 }}>
                        <Stack spacing={1.5}>
                          <Typography variant="subtitle2" color="text.secondary">
                            Stage notes
                          </Typography>
                          <Stack direction="row" spacing={1} sx={{ flexWrap: 'wrap' }}>
                            <Chip icon={<AutoAwesomeRoundedIcon />} label="Voice preserved" />
                            <Chip icon={<BookOutlinedIcon />} label="Glossary locked" />
                            <Chip
                              icon={<WarningAmberRoundedIcon />}
                              label="QA gated"
                              color="warning"
                            />
                          </Stack>
                          <Typography variant="body2" color="text.secondary">
                            The MVP keeps each pass inspectable so Thomas can compare source
                            meaning, literal translation, voice alignment, polish, and QA findings
                            without losing earlier drafts.
                          </Typography>
                        </Stack>
                      </Paper>
                    </Stack>
                  </Box>
                </Stack>
              </Paper>
            </Stack>
          </Box>

          <Box sx={{ minWidth: 0 }}>
            <Stack spacing={3}>
              <Paper sx={{ p: 2.5 }}>
                <Typography variant="overline" color="text.secondary">
                  QA findings
                </Typography>
                <Stack spacing={1.5} sx={{ mt: 1.5 }}>
                  {project.qaFindings.map((finding) => (
                    <Card key={finding.id} variant="outlined" sx={{ borderRadius: 3 }}>
                      <CardContent sx={{ '&:last-child': { pb: 2 } }}>
                        <Stack spacing={1}>
                          <Stack
                            direction="row"
                            sx={{ justifyContent: 'space-between', alignItems: 'center' }}
                          >
                            <Chip
                              size="small"
                              label={finding.severity}
                              color={
                                finding.severity === 'critical'
                                  ? 'error'
                                  : finding.severity === 'warning'
                                    ? 'warning'
                                    : 'default'
                              }
                            />
                            <Typography variant="caption" color="text.secondary">
                              {finding.category}
                            </Typography>
                          </Stack>
                          <Typography variant="body2" sx={{ fontWeight: 650 }}>
                            {finding.issue}
                          </Typography>
                          {finding.suggestion ? (
                            <Typography variant="body2" color="text.secondary">
                              Suggestion: {finding.suggestion}
                            </Typography>
                          ) : null}
                        </Stack>
                      </CardContent>
                    </Card>
                  ))}
                </Stack>
              </Paper>

              <Paper sx={{ p: 2.5 }}>
                <Typography variant="overline" color="text.secondary">
                  Quick actions
                </Typography>
                <Stack spacing={1.5} sx={{ mt: 1.5 }}>
                  <Button variant="contained" fullWidth startIcon={<PlayArrowRoundedIcon />}>
                    Translate selected segment
                  </Button>
                  <Button variant="outlined" fullWidth startIcon={<EditRoundedIcon />}>
                    Edit final text
                  </Button>
                  <Button variant="outlined" fullWidth startIcon={<DownloadRoundedIcon />}>
                    Export QA report
                  </Button>
                </Stack>
              </Paper>
            </Stack>
          </Box>
        </Box>
      </Stack>
    </Box>
  );
}
