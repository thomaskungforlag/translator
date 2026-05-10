import type { ReactElement } from 'react';

import { TranslationWorkspace } from '@/components/translation-workspace';
import { env } from '@/lib/env';
import { demoWorkspaceSeed } from '@/lib/demo-workspace';

export default function HomePage(): ReactElement {
  const apiKeyConfigured =
    env.AI_PROVIDER === 'poe' ? Boolean(env.POE_API_KEY) : Boolean(env.OPENAI_API_KEY);

  return (
    <TranslationWorkspace apiKeyConfigured={apiKeyConfigured} initialSeed={demoWorkspaceSeed} />
  );
}
