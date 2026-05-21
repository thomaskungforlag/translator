/** @jest-environment node */

import * as modelOptionsModule from '@/lib/model-options';

import { GET } from './route';

jest.mock('@/lib/model-options', (): typeof import('@/lib/model-options') => {
  const actual = jest.requireActual<typeof import('@/lib/model-options')>('@/lib/model-options');

  return {
    ...actual,
    getModelOptions: jest.fn(),
  };
});

describe('GET /api/model-options', () => {
  it('returns the live model options payload', async () => {
    const mockedGetModelOptions = jest.mocked(modelOptionsModule.getModelOptions);
    const result = {
      providers: {
        openai: {
          provider: 'openai' as const,
          configured: true,
          defaultModelId: 'gpt-5-mini',
          models: [{ id: 'gpt-5-mini', label: 'GPT-5-mini', source: 'live' as const }],
        },
        poe: {
          provider: 'poe' as const,
          configured: true,
          defaultModelId: 'Claude-Sonnet-4.5',
          models: [
            { id: 'Claude-Sonnet-4.5', label: 'Claude-Sonnet-4.5', source: 'live' as const },
          ],
        },
      },
    };

    mockedGetModelOptions.mockResolvedValue(result);

    const response = await GET();

    expect(response.status).toBe(200);
    const body: unknown = await response.json();
    expect(body).toEqual(result);
    expect(mockedGetModelOptions).toHaveBeenCalledTimes(1);
  });
});
