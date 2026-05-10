import type { ReactElement } from 'react';

import { TranslationWorkspace } from '@/components/translation-workspace';
import { env } from '@/lib/env';
import { demoWorkspaceSeed } from '@/lib/demo-workspace';

export default function HomePage(): ReactElement {
  const apiKeyConfigured =
    env.AI_PROVIDER === 'poe' ? Boolean(env.POE_API_KEY) : Boolean(env.OPENAI_API_KEY);
  const activeRuntimeModelLabel =
    env.AI_PROVIDER === 'poe'
      ? `Poe • ${env.POE_BOT ?? 'Claude-Sonnet-4.5'}`
      : `OpenAI • ${env.OPENAI_MODEL ?? 'gpt-5-mini'}`;

  return (
    <TranslationWorkspace
      apiKeyConfigured={apiKeyConfigured}
      activeRuntimeModelLabel={activeRuntimeModelLabel}
      initialSeed={demoWorkspaceSeed}
    />
  );
}
