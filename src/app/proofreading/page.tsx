import type { Metadata } from 'next';
import type { ReactElement } from 'react';

import { AppShell } from '@/components/app-shell';
import { ProofreadingWorkspace } from '@/components/proofreading-workspace';

export const metadata: Metadata = {
  title: 'Proofreading | Thomas Kung Author Translation Studio',
  description: 'Paste translated prose and inspect likely improvement spots inline.',
};

export default function ProofreadingPage(): ReactElement {
  return (
    <AppShell activeRoute="/proofreading">
      <ProofreadingWorkspace />
    </AppShell>
  );
}
