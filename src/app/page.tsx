import type { ReactElement } from 'react';

import { ProofreadingWorkspace } from '@/components/proofreading-workspace';
import { TranslationWorkspace } from '@/components/translation-workspace';
import { env } from '@/lib/env';
import { getDefaultModelId, getDefaultProvider } from '@/lib/model-options';
import { initialWorkspaceSeed } from '@/lib/initial-workspace';

export default function HomePage(): ReactElement {
  const initialProvider = getDefaultProvider();
  const initialModel = getDefaultModelId(initialProvider);

  return (
    <>
      <ProofreadingWorkspace />
      <TranslationWorkspace
        providerAvailability={{
          openai: Boolean(env.OPENAI_API_KEY),
          poe: Boolean(env.POE_API_KEY),
        }}
        initialProvider={initialProvider}
        initialModel={initialModel}
        initialSeed={initialWorkspaceSeed}
      />
    </>
  );
}
