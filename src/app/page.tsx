import type { ReactElement } from 'react';

import { TranslationWorkspace } from '@/components/translation-workspace';
import { env } from '@/lib/env';
import { demoWorkspaceSeed } from '@/lib/demo-workspace';

export default function HomePage(): ReactElement {
  return (
    <TranslationWorkspace
      apiKeyConfigured={Boolean(env.OPENAI_API_KEY)}
      initialSeed={demoWorkspaceSeed}
    />
  );
}
