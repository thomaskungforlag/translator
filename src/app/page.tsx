import type { Metadata } from 'next';
import type { ReactElement } from 'react';

import { Box, Card, CardContent, Chip, Stack, Typography } from '@mui/material';

import { AppShell } from '@/components/app-shell';
import { RouteButton } from '@/components/route-button';

export const metadata: Metadata = {
  title: 'Thomas Kung Author Translation Studio',
  description: 'A route-based literary translation and proofreading workspace for Swedish fiction.',
};

export default function HomePage(): ReactElement {
  return (
    <AppShell activeRoute="/">
      <Stack spacing={3}>
        <Box
          sx={{
            display: 'grid',
            gap: 2,
            gridTemplateColumns: { xs: '1fr', lg: 'minmax(0, 1.15fr) minmax(0, 0.85fr)' },
            alignItems: 'stretch',
          }}
        >
          <Card
            variant="outlined"
            sx={{
              minHeight: 260,
              borderRadius: 4,
              background:
                'linear-gradient(145deg, rgba(8, 18, 35, 0.96) 0%, rgba(16, 32, 58, 0.9) 100%)',
              color: 'common.white',
            }}
          >
            <CardContent sx={{ height: '100%' }}>
              <Stack spacing={2} sx={{ height: '100%', justifyContent: 'space-between' }}>
                <Stack spacing={1.25}>
                  <Stack direction="row" spacing={1} sx={{ flexWrap: 'wrap' }}>
                    <Chip size="small" color="primary" label="Editorial routes" />
                    <Chip size="small" variant="outlined" label="Local-first proofing" />
                  </Stack>
                  <Typography variant="h3" component="h1" sx={{ maxWidth: 720 }}>
                    Choose a workspace instead of forcing every tool onto one screen.
                  </Typography>
                  <Typography
                    variant="body1"
                    sx={{ maxWidth: 760, color: 'rgba(255,255,255,0.78)' }}
                  >
                    Start with proofreading or translation, then expand into dedicated routes for
                    projects, glossary management, and style profiles.
                  </Typography>
                </Stack>

                <Stack direction="row" spacing={1.5} sx={{ flexWrap: 'wrap' }}>
                  <RouteButton href="/proofreading" variant="contained" color="primary">
                    Open proofreading workspace
                  </RouteButton>
                  <RouteButton href="/translate" variant="outlined" color="inherit">
                    Open translation workspace
                  </RouteButton>
                </Stack>
              </Stack>
            </CardContent>
          </Card>

          <Stack spacing={2}>
            <Card variant="outlined" sx={{ borderRadius: 4, flex: 1 }}>
              <CardContent>
                <Stack spacing={1.25}>
                  <Chip size="small" label="Coming first" color="warning" />
                  <Typography variant="h5" component="h2">
                    Proofreading
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Paste translated prose, highlight weak phrasing, and review suggested
                    improvements inline.
                  </Typography>
                  <RouteButton href="/proofreading" variant="text">
                    Go to proofreading
                  </RouteButton>
                </Stack>
              </CardContent>
            </Card>

            <Card variant="outlined" sx={{ borderRadius: 4, flex: 1 }}>
              <CardContent>
                <Stack spacing={1.25}>
                  <Chip size="small" label="Existing workflow" color="info" />
                  <Typography variant="h5" component="h2">
                    Translation studio
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Keep the existing multi-pass translation workspace, now on its own route.
                  </Typography>
                  <RouteButton href="/translate" variant="text">
                    Go to translation
                  </RouteButton>
                </Stack>
              </CardContent>
            </Card>
          </Stack>
        </Box>

        <Card variant="outlined" sx={{ borderRadius: 4 }}>
          <CardContent>
            <Stack spacing={1.5}>
              <Typography variant="overline" color="text.secondary">
                Planned routes
              </Typography>
              <Stack direction="row" spacing={1} sx={{ flexWrap: 'wrap' }}>
                <Chip label="Projects" variant="outlined" />
                <Chip label="Glossary" variant="outlined" />
                <Chip label="Style profile" variant="outlined" />
              </Stack>
            </Stack>
          </CardContent>
        </Card>
      </Stack>
    </AppShell>
  );
}
