import type { ReactElement } from 'react';

import DownloadRoundedIcon from '@mui/icons-material/DownloadRounded';
import PlayArrowRoundedIcon from '@mui/icons-material/PlayArrowRounded';
import { Box, Button, Chip, Paper, Stack, Typography } from '@mui/material';

type StudioHeroProps = {
  apiKeyConfigured: boolean;
};

export function StudioHero({ apiKeyConfigured }: StudioHeroProps): ReactElement {
  return (
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
        sx={{ alignItems: { xs: 'flex-start', lg: 'center' }, justifyContent: 'space-between' }}
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
  );
}
