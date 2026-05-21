/** @jest-environment node */

export {};

const ORIGINAL_ENV = process.env;

async function loadModule() {
  jest.resetModules();

  return import('./model-options');
}

describe('model-options', () => {
  beforeEach(() => {
    process.env = { ...ORIGINAL_ENV };
    process.env.OPENAI_API_KEY = 'test-openai-key';
    process.env.OPENAI_MODEL = 'gpt-5-mini';
    delete process.env.POE_API_KEY;

    Object.defineProperty(globalThis, 'fetch', {
      configurable: true,
      writable: true,
      value: jest.fn(),
    });
  });

  afterEach(() => {
    jest.restoreAllMocks();
    process.env = ORIGINAL_ENV;
  });

  it('loads live provider models and filters the text-capable set', async () => {
    const fetchMock = jest.mocked(globalThis.fetch);

    fetchMock
      .mockResolvedValueOnce({
        ok: true,
        json: () =>
          Promise.resolve({
            object: 'list',
            data: [
              { id: 'gpt-5-mini', object: 'model', created: 1, owned_by: 'openai' },
              { id: 'text-embedding-3-small', object: 'model', created: 1, owned_by: 'openai' },
              { id: 'o3', object: 'model', created: 1, owned_by: 'openai' },
            ],
          }),
      } as unknown as Response)
      .mockResolvedValueOnce({
        ok: true,
        json: () =>
          Promise.resolve({
            data: [
              { id: 'Claude-Sonnet-4.5', object: 'model', created: 1, owned_by: 'poe' },
              { id: 'Nano-Banana', object: 'model', created: 1, owned_by: 'poe' },
              { id: 'Grok-4', object: 'model', created: 1, owned_by: 'poe' },
            ],
          }),
      } as unknown as Response);

    const modelOptions = await loadModule();
    const result = await modelOptions.getModelOptions();

    expect(result.providers.openai.configured).toBe(true);
    expect(result.providers.openai.defaultModelId).toBe('gpt-5-mini');
    expect(result.providers.openai.models.map((model) => model.id)).toEqual(['gpt-5-mini', 'o3']);
    expect(result.providers.poe.models.map((model) => model.id)).toEqual([
      'Claude-Sonnet-4.5',
      'Grok-4',
    ]);
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });
});
