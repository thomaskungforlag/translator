import type { ReactElement } from 'react';

import { Card, CardContent, Chip, Paper, Stack, Typography } from '@mui/material';

import type { StudioShellProject } from './types';

type PipelineStagesPanelProps = {
  stages: StudioShellProject['pipelineStages'];
};

export function PipelineStagesPanel({ stages }: PipelineStagesPanelProps): ReactElement {
  return (
    <Paper sx={{ p: 2.5 }}>
      <Typography variant="overline" color="text.secondary">
        Pipeline stages
      </Typography>
      <Stack spacing={1.25} sx={{ mt: 1.5 }}>
        {stages.map((stage) => (
          <Card key={stage.label} variant="outlined" sx={{ borderRadius: 3 }}>
            <CardContent sx={{ '&:last-child': { pb: 2 } }}>
              <Stack direction="row" sx={{ justifyContent: 'space-between', alignItems: 'center' }}>
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
  );
}
