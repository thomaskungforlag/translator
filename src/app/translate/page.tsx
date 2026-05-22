import type { Metadata } from 'next';
import type { ReactElement } from 'react';

import { AppShell } from '@/components/app-shell';
import { TranslationWorkspace } from '@/components/translation-workspace';
import { env } from '@/lib/env';
import { getDefaultModelId, getDefaultProvider } from '@/lib/model-options';
import { initialWorkspaceSeed } from '@/lib/initial-workspace';

export const metadata: Metadata = {
  title: 'Translate | Thomas Kung Author Translation Studio',
  description: 'Run the multi-pass translation workbench on its own route.',
};

export default function TranslatePage(): ReactElement {
  const initialProvider = getDefaultProvider();
  const initialModel = getDefaultModelId(initialProvider);

  return (
    <AppShell activeRoute="/translate">
      <TranslationWorkspace
        providerAvailability={{
          openai: Boolean(env.OPENAI_API_KEY),
          poe: Boolean(env.POE_API_KEY),
        }}
        initialProvider={initialProvider}
        initialModel={initialModel}
        initialSeed={initialWorkspaceSeed}
      />
    </AppShell>
  );
}
