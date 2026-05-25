import type { Metadata } from 'next';
import type { ReactElement, ReactNode } from 'react';

import { Inter } from 'next/font/google';
import { AppRouterCacheProvider } from '@mui/material-nextjs/v15-appRouter';

import { ThemeRegistry } from '@/components/theme-registry';

import './globals.css';

const inter = Inter({
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-inter',
});

export const metadata: Metadata = {
  title: 'Thomas Kung Author Translation Studio',
  description:
    'A multi-pass literary translation workbench for Swedish fiction and author material.',
};

type RootLayoutProps = Readonly<{
  children: ReactNode;
}>;

export default function RootLayout({ children }: RootLayoutProps): ReactElement {
  return (
    <html lang="en" className={inter.variable} suppressHydrationWarning>
      <body>
        <AppRouterCacheProvider options={{ enableCssLayer: true }}>
          <ThemeRegistry>{children}</ThemeRegistry>
        </AppRouterCacheProvider>
      </body>
    </html>
  );
}
