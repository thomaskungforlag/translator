/** @jest-environment node */

export {};

const ORIGINAL_ENV = process.env;

type PoeMockPayload = {
  choices: Array<{
    message: {
      content: string;
    };
  }>;
};

function mockPoeResponse(content: string): PoeMockPayload {
  return {
    choices: [{ message: { content } }],
  };
}

async function loadUtilsModule() {
  jest.resetModules();

  return import('./translation-provider-utils');
}

describe('translation-provider-utils (Poe retry handling)', () => {
  beforeEach(() => {
    process.env = { ...ORIGINAL_ENV };
    delete process.env.OPENAI_API_KEY;
    delete process.env.OPENAI_MODEL;
    delete process.env.POE_BOT;
    delete process.env.POE_API_URL;

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

  it('retries transient Poe request failures before parsing the response', async () => {
    process.env.AI_PROVIDER = 'poe';
    process.env.POE_API_KEY = 'test-poe-key';

    const fetchMock = jest.mocked(globalThis.fetch);
    const consoleWarnSpy = jest.spyOn(console, 'warn').mockImplementation(() => undefined);

    fetchMock
      .mockResolvedValueOnce({
        ok: false,
        status: 503,
        statusText: 'Service Unavailable',
        text: () => Promise.resolve('temporary outage'),
      } as unknown as Response)
      .mockResolvedValueOnce({
        ok: true,
        json: () => mockPoeResponse('{"segments":[{"index":0,"text":"Recovered"}]}'),
      } as unknown as Response);

    const utils = await loadUtilsModule();
    const segments = await utils.parseStageResponse('source_analysis', 'prompt');

    expect(segments).toEqual([{ index: 0, text: 'Recovered' }]);
    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(consoleWarnSpy).toHaveBeenCalledWith(
      '[poe] transient request failure; retrying',
      expect.objectContaining({
        provider: 'poe',
        model: 'Claude-Sonnet-4.5',
        attempt: 1,
        maxAttempts: 3,
      }),
    );
  });
});
