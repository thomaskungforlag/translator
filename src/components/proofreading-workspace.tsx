'use client';

import { useState, type ReactElement } from 'react';

import { alpha } from '@mui/material/styles';
import { Box, Chip, Divider, Paper, Stack, TextField, Typography, useTheme } from '@mui/material';

import type { QAFinding } from '@/lib/domain';
import { buildProofreadingFindings, buildProofreadingSummary } from '@/lib/proofreading';

type HighlightRange = {
  finding: QAFinding;
  start: number;
  end: number;
};

function countWords(value: string): number {
  return value
    .trim()
    .split(/\s+/)
    .filter((word) => word.length > 0).length;
}

function countSentences(value: string): number {
  const normalized = value.trim();

  if (normalized.length === 0) {
    return 0;
  }

  const matches = normalized.match(/[.!?]+(?=\s|$)/g);

  return matches?.length ?? 1;
}

function getFindingTone(finding: QAFinding): 'info' | 'warning' | 'error' {
  if (finding.severity === 'critical') {
    return 'error';
  }

  if (finding.severity === 'warning') {
    return 'warning';
  }

  return 'info';
}

function buildHighlightRanges(text: string, findings: QAFinding[]): HighlightRange[] {
  const ranges = findings
    .map((finding) => {
      const range = finding.targetRange;

      if (!range || range.end <= range.start || range.start < 0 || range.end > text.length) {
        return null;
      }

      return {
        finding,
        start: range.start,
        end: range.end,
      } satisfies HighlightRange;
    })
    .filter((range): range is HighlightRange => range !== null)
    .sort((left, right) => left.start - right.start || right.end - left.end);

  const normalized: HighlightRange[] = [];
  let cursor = -1;

  for (const range of ranges) {
    if (range.start < cursor) {
      continue;
    }

    normalized.push(range);
    cursor = range.end;
  }

  return normalized;
}

function renderPreviewText(text: string, ranges: HighlightRange[]): ReactElement[] {
  if (ranges.length === 0) {
    return [<span key="plain">{text}</span>];
  }

  const nodes: ReactElement[] = [];
  let cursor = 0;

  ranges.forEach((range, index) => {
    if (cursor < range.start) {
      nodes.push(
        <span key={`text-${cursor}-${range.start}`}>{text.slice(cursor, range.start)}</span>,
      );
    }

    nodes.push(
      <Box
        component="mark"
        key={`highlight-${range.start}-${range.end}-${index}`}
        data-testid="proofreading-highlight"
        title={range.finding.issue}
        sx={(theme) => {
          const tone = getFindingTone(range.finding);
          const palette =
            tone === 'error'
              ? theme.palette.error
              : tone === 'warning'
                ? theme.palette.warning
                : theme.palette.info;

          return {
            px: 0.15,
            borderRadius: 0.5,
            backgroundColor: alpha(palette.light, 0.28),
            color: 'inherit',
            borderBottom: `2px solid ${palette.main}`,
            textDecoration: 'none',
          };
        }}
      >
        {text.slice(range.start, range.end)}
      </Box>,
    );

    cursor = range.end;
  });

  if (cursor < text.length) {
    nodes.push(<span key={`text-${cursor}-end`}>{text.slice(cursor)}</span>);
  }

  return nodes;
}

export function ProofreadingWorkspace(): ReactElement {
  const theme = useTheme();
  const [draftText, setDraftText] = useState('');
  const findings = buildProofreadingFindings(draftText);
  const highlightRanges = buildHighlightRanges(draftText, findings);
  const summary = buildProofreadingSummary(draftText);
  const wordCount = countWords(draftText);
  const sentenceCount = countSentences(draftText);

  return (
    <Paper
      variant="outlined"
      sx={{
        mx: { xs: 2, md: 3 },
        mt: { xs: 2, md: 3 },
        mb: 0,
        p: { xs: 2, md: 3 },
        borderRadius: 4,
        background: `linear-gradient(180deg, ${alpha(theme.palette.info.light, 0.08)} 0%, ${theme.palette.background.paper} 100%)`,
      }}
    >
      <Stack spacing={2.5}>
        <Stack spacing={0.75}>
          <Typography variant="overline" color="text.secondary">
            Proofreading
          </Typography>
          <Typography variant="h4" component="h1">
            Visual proofing guidance
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Paste a translated text and the app will flag words or phrases that may need a more
            natural rewrite.
          </Typography>
        </Stack>

        <Box
          sx={{
            display: 'grid',
            gap: 2,
            gridTemplateColumns: { xs: '1fr', xl: 'minmax(0, 1.05fr) minmax(0, 0.95fr)' },
            alignItems: 'start',
          }}
        >
          <Stack spacing={1.5}>
            <TextField
              label="Translated text"
              value={draftText}
              onChange={(event) => {
                setDraftText(event.target.value);
              }}
              placeholder="Paste translated prose here."
              multiline
              minRows={14}
              fullWidth
              helperText="The basic mode works locally and highlights likely improvement spots as you type."
            />

            <Stack direction="row" spacing={1} sx={{ flexWrap: 'wrap' }}>
              <Chip size="small" label={`${wordCount} words`} variant="outlined" />
              <Chip size="small" label={`${sentenceCount} sentences`} variant="outlined" />
              <Chip
                size="small"
                label={`${findings.length} findings`}
                color={findings.length > 0 ? 'warning' : 'default'}
              />
            </Stack>
          </Stack>

          <Stack spacing={1.5} sx={{ minWidth: 0 }}>
            <Paper
              variant="outlined"
              sx={{
                p: 2,
                minHeight: 280,
                borderRadius: 3,
                backgroundColor: alpha(theme.palette.background.paper, 0.8),
              }}
            >
              <Stack spacing={1.25}>
                <Typography variant="subtitle2" color="text.secondary">
                  Proofreading guidance
                </Typography>

                {draftText.trim().length === 0 ? (
                  <Typography variant="body2" color="text.secondary">
                    Paste text to see highlighted phrases and suggested improvements.
                  </Typography>
                ) : (
                  <Typography
                    variant="body1"
                    sx={{
                      whiteSpace: 'pre-wrap',
                      lineHeight: 1.8,
                      wordBreak: 'break-word',
                    }}
                  >
                    {renderPreviewText(draftText, highlightRanges)}
                  </Typography>
                )}
              </Stack>
            </Paper>

            <Divider />

            <Stack spacing={1.25}>
              <Typography variant="subtitle2" color="text.secondary">
                Findings
              </Typography>

              {findings.length === 0 ? (
                <Typography variant="body2" color="text.secondary">
                  {summary}
                </Typography>
              ) : (
                findings.map((finding) => {
                  const tone = getFindingTone(finding);

                  return (
                    <Paper key={finding.id} variant="outlined" sx={{ p: 1.5, borderRadius: 3 }}>
                      <Stack spacing={0.75}>
                        <Stack direction="row" spacing={1} sx={{ flexWrap: 'wrap' }}>
                          <Chip size="small" label={finding.category} color={tone} />
                          <Chip size="small" label={finding.severity} variant="outlined" />
                        </Stack>
                        <Typography variant="body2" sx={{ fontWeight: 650 }}>
                          {finding.issue}
                        </Typography>
                        {finding.targetExcerpt ? (
                          <Typography variant="body2" color="text.secondary">
                            Highlight: {finding.targetExcerpt}
                          </Typography>
                        ) : null}
                        {finding.suggestion ? (
                          <Typography variant="body2" color="text.secondary">
                            Suggestion: {finding.suggestion}
                          </Typography>
                        ) : null}
                      </Stack>
                    </Paper>
                  );
                })
              )}
            </Stack>
          </Stack>
        </Box>
      </Stack>
    </Paper>
  );
}
