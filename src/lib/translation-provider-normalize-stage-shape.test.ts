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

describe('translation-provider-normalize stage shape', () => {
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

  it('normalizes a single stage object with translation text into one segment', async () => {
    process.env.AI_PROVIDER = 'poe';
    process.env.POE_API_KEY = 'test-poe-key';

    const fetchMock = jest.mocked(globalThis.fetch);

    fetchMock.mockResolvedValueOnce({
      ok: true,
      json: () =>
        mockPoeResponse(
          JSON.stringify({
            index: 0,
            translation: 'Single object payload',
          }),
        ),
    } as unknown as Response);

    const utils = await loadUtilsModule();
    const segments = await utils.parseStageResponse('faithful_translation', 'prompt');

    expect(segments).toEqual([{ index: 0, text: 'Single object payload' }]);
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('normalizes a single stage object with voice_adapted_text into one segment', async () => {
    process.env.AI_PROVIDER = 'poe';
    process.env.POE_API_KEY = 'test-poe-key';

    const fetchMock = jest.mocked(globalThis.fetch);

    fetchMock.mockResolvedValueOnce({
      ok: true,
      json: () =>
        mockPoeResponse(
          JSON.stringify({
            index: 0,
            voice_adapted_text: 'Voice adapted payload',
          }),
        ),
    } as unknown as Response);

    const utils = await loadUtilsModule();
    const segments = await utils.parseStageResponse('voice_adaptation', 'prompt');

    expect(segments).toEqual([{ index: 0, text: 'Voice adapted payload' }]);
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('normalizes a single stage object with polishedText into one segment', async () => {
    process.env.AI_PROVIDER = 'poe';
    process.env.POE_API_KEY = 'test-poe-key';

    const fetchMock = jest.mocked(globalThis.fetch);

    fetchMock.mockResolvedValueOnce({
      ok: true,
      json: () =>
        mockPoeResponse(
          JSON.stringify({
            index: 0,
            polishedText: 'Polished payload',
          }),
        ),
    } as unknown as Response);

    const utils = await loadUtilsModule();
    const segments = await utils.parseStageResponse('polish_pass', 'prompt');

    expect(segments).toEqual([{ index: 0, text: 'Polished payload' }]);
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('normalizes an object keyed by index into ordered segments', async () => {
    process.env.AI_PROVIDER = 'poe';
    process.env.POE_API_KEY = 'test-poe-key';

    const fetchMock = jest.mocked(globalThis.fetch);

    fetchMock.mockResolvedValueOnce({
      ok: true,
      json: () =>
        mockPoeResponse(
          JSON.stringify({
            0: {
              index: 0,
              voice_adapted_text: 'Voice adapted payload 0',
            },
            1: {
              index: 1,
              voice_adapted_text: 'Voice adapted payload 1',
            },
          }),
        ),
    } as unknown as Response);

    const utils = await loadUtilsModule();
    const segments = await utils.parseStageResponse('voice_adaptation', 'prompt');

    expect(segments).toEqual([
      { index: 0, text: 'Voice adapted payload 0' },
      { index: 1, text: 'Voice adapted payload 1' },
    ]);
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });
});
