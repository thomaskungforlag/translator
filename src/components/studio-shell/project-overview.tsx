import type { ReactElement } from 'react';

import DescriptionOutlinedIcon from '@mui/icons-material/DescriptionOutlined';
import EditRoundedIcon from '@mui/icons-material/EditRounded';
import ScienceOutlinedIcon from '@mui/icons-material/ScienceOutlined';
import { Box, Chip, IconButton, LinearProgress, Paper, Stack, Typography } from '@mui/material';

import type { StudioShellProject } from '@/lib/workspace';

type ProjectOverviewProps = {
  project: StudioShellProject;
};

export function ProjectOverview({ project }: ProjectOverviewProps): ReactElement {
  return (
    <Paper sx={{ p: 2.5 }}>
      <Stack direction="row" sx={{ justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
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
          <Chip size="small" icon={<DescriptionOutlinedIcon />} label={project.contentType} />
          <Chip size="small" icon={<ScienceOutlinedIcon />} label={project.targetLanguage.label} />
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
  );
}
