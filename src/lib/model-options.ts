import { env } from './env';

export type ModelProvider = 'openai' | 'poe';

export type ModelOptionSource = 'live' | 'fallback';

export type ModelOption = {
  id: string;
  label: string;
  source: ModelOptionSource;
};

export type ProviderModelOptions = {
  provider: ModelProvider;
  configured: boolean;
  defaultModelId: string;
  models: ModelOption[];
  note?: string;
};

type ModelRecord = {
  id?: string;
  object?: string;
  owned_by?: string;
  created?: number;
};

type ListResponse = {
  data?: ModelRecord[];
};

const openaiPreferredModelIds = [
  'gpt-5.5',
  'gpt-5.2',
  'gpt-5.1',
  'gpt-5',
  'gpt-5-mini',
  'gpt-5-nano',
  'gpt-4.1',
  'gpt-4.1-mini',
  'gpt-4.1-nano',
  'gpt-4o',
  'gpt-4o-mini',
  'o4-mini',
  'o3',
  'o3-mini',
  'o1',
];

const poePreferredModelIds = [
  'GPT-5-Pro',
  'GPT-5-Codex',
  'Claude-Sonnet-4.5',
  'Claude-Haiku-4.5',
  'Gemini-2.5-Pro',
  'Grok-4',
  'DeepSeek-R1',
];

const openaiFallbackModels: ModelOption[] = [
  'gpt-5.5',
  'gpt-5.2',
  'gpt-5.1',
  'gpt-5',
  'gpt-5-mini',
  'gpt-4.1',
  'gpt-4o',
  'o3',
  'o3-mini',
].map((id) => ({
  id,
  label: formatModelLabel(id),
  source: 'fallback' as const,
}));

const poeFallbackModels: ModelOption[] = [
  'GPT-5-Pro',
  'GPT-5-Codex',
  'Claude-Sonnet-4.5',
  'Claude-Haiku-4.5',
  'Gemini-2.5-Pro',
  'Grok-4',
  'DeepSeek-R1',
].map((id) => ({
  id,
  label: id,
  source: 'fallback' as const,
}));

function formatModelLabel(id: string): string {
  if (/^gpt-/i.test(id)) {
    return id.replace(/^gpt-/i, 'GPT-');
  }

  if (/^o\d/i.test(id)) {
    return id.toUpperCase();
  }

  return id
    .split('-')
    .map((part) => (part.length === 0 ? part : part.charAt(0).toUpperCase() + part.slice(1)))
    .join('-');
}

function isOpenAITextModel(id: string): boolean {
  if (!/^([go]\d|gpt-|chatgpt-|computer-use-)/i.test(id)) {
    return false;
  }

  return !/(audio|image|vision|whisper|tts|embedding|moderation|sora|transcribe|search)/i.test(id);
}

function isPoeTextModel(id: string): boolean {
  if (poePreferredModelIds.includes(id)) {
    return true;
  }

  return /^(Claude|GPT|Gemini|Grok|DeepSeek|Llama|Mistral|Qwen|o\d)/i.test(id);
}

function toModelOptions(
  records: ModelRecord[],
  provider: ModelProvider,
  preferredIds: string[],
): ModelOption[] {
  const seen = new Set<string>();
  const filtered = records
    .map((record) => record.id?.trim())
    .filter((id): id is string => Boolean(id))
    .filter((id) => (provider === 'openai' ? isOpenAITextModel(id) : isPoeTextModel(id)))
    .sort((left, right) => left.localeCompare(right));

  const preferred = preferredIds.filter((id) => filtered.includes(id));
  const remaining = filtered.filter((id) => !preferred.includes(id));

  return [...preferred, ...remaining]
    .filter((id) => {
      if (seen.has(id)) {
        return false;
      }

      seen.add(id);
      return true;
    })
    .map((id) => ({
      id,
      label: provider === 'poe' ? id : formatModelLabel(id),
      source: 'live' as const,
    }));
}

async function parseListResponse(response: Response): Promise<ListResponse> {
  const payload = (await response.json()) as unknown;

  if (!payload || typeof payload !== 'object') {
    return {};
  }

  const record = payload as Record<string, unknown>;
  const data = record.data;

  if (!Array.isArray(data)) {
    return {};
  }

  return {
    data: data as ModelRecord[],
  };
}

async function fetchOpenAIModels(): Promise<ProviderModelOptions> {
  if (!env.OPENAI_API_KEY) {
    return {
      provider: 'openai',
      configured: false,
      defaultModelId: env.OPENAI_MODEL ?? 'gpt-5-mini',
      models: openaiFallbackModels,
      note: 'OpenAI API key missing. Showing starter model choices only.',
    };
  }

  try {
    const response = await fetch('https://api.openai.com/v1/models', {
      headers: {
        Authorization: `Bearer ${env.OPENAI_API_KEY}`,
      },
      cache: 'no-store',
    });

    if (!response.ok) {
      throw new Error(`OpenAI models request failed with status ${response.status}.`);
    }

    const { data = [] } = await parseListResponse(response);
    const models = toModelOptions(data, 'openai', openaiPreferredModelIds);

    if (models.length === 0) {
      return {
        provider: 'openai',
        configured: true,
        defaultModelId: env.OPENAI_MODEL ?? 'gpt-5-mini',
        models: openaiFallbackModels,
        note: 'OpenAI returned no text models. Showing starter model choices only.',
      };
    }

    return {
      provider: 'openai',
      configured: true,
      defaultModelId:
        models.find((model) => model.id === env.OPENAI_MODEL)?.id ?? models[0]?.id ?? 'gpt-5-mini',
      models,
      note: 'Live OpenAI models loaded.',
    };
  } catch (error) {
    return {
      provider: 'openai',
      configured: true,
      defaultModelId: env.OPENAI_MODEL ?? 'gpt-5-mini',
      models: openaiFallbackModels,
      note:
        error instanceof Error
          ? `Could not load live OpenAI models: ${error.message}`
          : 'Could not load live OpenAI models. Showing starter model choices only.',
    };
  }
}

async function fetchPoeModels(): Promise<ProviderModelOptions> {
  try {
    const response = await fetch('https://api.poe.com/v1/models', {
      cache: 'no-store',
    });

    if (!response.ok) {
      throw new Error(`Poe models request failed with status ${response.status}.`);
    }

    const { data = [] } = await parseListResponse(response);
    const models = toModelOptions(data, 'poe', poePreferredModelIds);

    if (models.length === 0) {
      return {
        provider: 'poe',
        configured: Boolean(env.POE_API_KEY),
        defaultModelId: env.POE_BOT ?? 'Claude-Sonnet-4.5',
        models: poeFallbackModels,
        note: 'Poe returned no text models. Showing starter model choices only.',
      };
    }

    return {
      provider: 'poe',
      configured: Boolean(env.POE_API_KEY),
      defaultModelId:
        models.find((model) => model.id === env.POE_BOT)?.id ??
        models[0]?.id ??
        'Claude-Sonnet-4.5',
      models,
      note: 'Live Poe models loaded.',
    };
  } catch (error) {
    return {
      provider: 'poe',
      configured: Boolean(env.POE_API_KEY),
      defaultModelId: env.POE_BOT ?? 'Claude-Sonnet-4.5',
      models: poeFallbackModels,
      note:
        error instanceof Error
          ? `Could not load live Poe models: ${error.message}`
          : 'Could not load live Poe models. Showing starter model choices only.',
    };
  }
}

export async function getModelOptions(): Promise<{
  providers: Record<ModelProvider, ProviderModelOptions>;
}> {
  const [openai, poe] = await Promise.all([fetchOpenAIModels(), fetchPoeModels()]);

  return {
    providers: {
      openai,
      poe,
    },
  };
}

export function getDefaultModelId(provider: ModelProvider): string {
  if (provider === 'poe') {
    return env.POE_BOT ?? 'Claude-Sonnet-4.5';
  }

  return env.OPENAI_MODEL ?? 'gpt-5-mini';
}

export function getDefaultProvider(): ModelProvider {
  return env.AI_PROVIDER;
}
