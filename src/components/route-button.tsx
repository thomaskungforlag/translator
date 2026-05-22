'use client';

import type { ReactElement, ReactNode } from 'react';

import NextLink from 'next/link';
import type { ButtonProps } from '@mui/material';
import { Button } from '@mui/material';

type RouteButtonProps = Omit<ButtonProps, 'component' | 'href'> & {
  href: string;
  children: ReactNode;
};

export function RouteButton({ href, children, ...props }: RouteButtonProps): ReactElement {
  return (
    <Button href={href} LinkComponent={NextLink} {...props}>
      {children}
    </Button>
  );
}
