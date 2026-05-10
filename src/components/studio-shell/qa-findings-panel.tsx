import type { ReactElement } from 'react';

import { Card, CardContent, Chip, Paper, Stack, Typography } from '@mui/material';

import type { QAFinding } from '@/lib/domain';

type QAFindingsPanelProps = {
  findings: QAFinding[];
};

export function QAFindingsPanel({ findings }: QAFindingsPanelProps): ReactElement {
  return (
    <Paper sx={{ p: 2.5 }}>
      <Typography variant="overline" color="text.secondary">
        QA findings
      </Typography>
      <Stack spacing={1.5} sx={{ mt: 1.5 }}>
        {findings.map((finding) => (
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
  );
}
