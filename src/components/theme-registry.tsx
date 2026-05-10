'use client';

import type { ReactElement, ReactNode } from 'react';

import { CssBaseline, ThemeProvider } from '@mui/material';

import { theme } from '@/theme';

type ThemeRegistryProps = {
  children: ReactNode;
};

export function ThemeRegistry({ children }: ThemeRegistryProps): ReactElement {
  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      {children}
    </ThemeProvider>
  );
}
