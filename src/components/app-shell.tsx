import type { ReactElement, ReactNode } from 'react';

import { Box, Chip, Paper, Stack, Typography } from '@mui/material';

import { RouteButton } from './route-button';

type AppRoute = '/' | '/proofreading' | '/translate';

type AppNavItem = {
  href: AppRoute;
  label: string;
};

const navigationItems: AppNavItem[] = [
  { href: '/', label: 'Home' },
  { href: '/proofreading', label: 'Proofreading' },
  { href: '/translate', label: 'Translate' },
];

type AppShellProps = {
  activeRoute: AppRoute;
  children: ReactNode;
};

export function AppShell({ activeRoute, children }: AppShellProps): ReactElement {
  return (
    <Box
      data-testid="app-shell-ready"
      sx={{
        minHeight: '100vh',
        px: { xs: 2, md: 3 },
        py: { xs: 2, md: 3 },
        background:
          'radial-gradient(circle at top left, rgba(14, 122, 126, 0.08), transparent 38%), linear-gradient(180deg, rgba(8, 18, 35, 0.02), transparent 26%)',
      }}
    >
      <Stack spacing={3} sx={{ width: '100%', mx: 'auto', maxWidth: 1680 }}>
        <Paper
          component="header"
          variant="outlined"
          sx={{
            p: { xs: 1.5, md: 2 },
            borderRadius: 3,
            overflow: 'hidden',
            background:
              'linear-gradient(135deg, rgba(7, 14, 29, 0.94) 0%, rgba(12, 22, 44, 0.9) 58%, rgba(15, 29, 57, 0.88) 100%)',
            borderColor: 'rgba(148, 163, 184, 0.18)',
            boxShadow: '0 24px 80px rgba(2, 6, 23, 0.34)',
          }}
        >
          <Stack
            direction={{ xs: 'column', md: 'row' }}
            spacing={2}
            sx={{ alignItems: { xs: 'flex-start', md: 'center' }, justifyContent: 'space-between' }}
          >
            <Box sx={{ minWidth: 0 }}>
              <Stack
                direction="row"
                spacing={1}
                sx={{ alignItems: 'center', mb: 0.75, flexWrap: 'wrap' }}
              >
                <Chip
                  size="small"
                  label="Workspace"
                  sx={{
                    bgcolor: 'rgba(125, 211, 252, 0.16)',
                    color: 'primary.light',
                    border: '1px solid rgba(125, 211, 252, 0.24)',
                  }}
                />
                <Typography variant="overline" color="text.secondary">
                  Thomas Kung
                </Typography>
              </Stack>
              <Typography
                variant="h5"
                component="p"
                sx={{ lineHeight: 1.05, letterSpacing: '-0.03em' }}
              >
                Editorial routes
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
                Proofreading, translation, and future tools in one navigable system.
              </Typography>
            </Box>

            <Stack
              component="nav"
              aria-label="Primary navigation"
              direction="row"
              spacing={1}
              sx={{ flexWrap: 'wrap', justifyContent: { xs: 'flex-start', md: 'flex-end' } }}
            >
              {navigationItems.map((item) => {
                const isActive = item.href === activeRoute;

                return (
                  <RouteButton
                    key={item.href}
                    href={item.href}
                    variant={isActive ? 'contained' : 'outlined'}
                    color={isActive ? 'primary' : 'inherit'}
                    size="small"
                    aria-current={isActive ? 'page' : undefined}
                    sx={{
                      px: 2,
                      minWidth: 0,
                      borderColor: isActive ? 'transparent' : 'rgba(148, 163, 184, 0.22)',
                      bgcolor: isActive ? 'primary.main' : 'rgba(255,255,255,0.03)',
                      color: isActive ? 'rgba(4, 10, 20, 0.96)' : 'text.primary',
                      '&:hover': {
                        bgcolor: isActive ? 'primary.light' : 'rgba(255,255,255,0.08)',
                        borderColor: 'rgba(125, 211, 252, 0.42)',
                      },
                    }}
                  >
                    {item.label}
                  </RouteButton>
                );
              })}
            </Stack>
          </Stack>
        </Paper>

        <Box sx={{ minWidth: 0 }}>{children}</Box>
      </Stack>
    </Box>
  );
}
