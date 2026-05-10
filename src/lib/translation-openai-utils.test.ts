/** @jest-environment node */

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

  return import('./translation-openai-utils');
}

describe('translation-openai-utils (provider adapters)', () => {
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

  it('parses Poe stage output directly when valid JSON is returned', async () => {
    process.env.AI_PROVIDER = 'poe';
    process.env.POE_API_KEY = 'test-poe-key';

    const fetchMock = jest.mocked(globalThis.fetch);

    fetchMock.mockResolvedValueOnce({
      ok: true,
      json: async () => mockPoeResponse('{"segments":[{"index":0,"text":"Draft"}]}'),
    } as Response);

    const utils = await loadUtilsModule();
    const segments = await utils.parseStageResponse('source_analysis', 'prompt');

    expect(segments).toEqual([{ index: 0, text: 'Draft' }]);
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('runs one repair pass when Poe stage output is malformed', async () => {
    process.env.AI_PROVIDER = 'poe';
    process.env.POE_API_KEY = 'test-poe-key';

    const fetchMock = jest.mocked(globalThis.fetch);

    fetchMock
      .mockResolvedValueOnce({
        ok: true,
        json: async () => mockPoeResponse('not-json'),
      } as Response)
      .mockResolvedValueOnce({
        ok: true,
        json: async () => mockPoeResponse('{"segments":[{"index":0,"text":"Repaired"}]}'),
      } as Response);

    const utils = await loadUtilsModule();
    const segments = await utils.parseStageResponse('voice_adaptation', 'prompt');

    expect(segments).toEqual([{ index: 0, text: 'Repaired' }]);
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it('throws after repair pass when Poe QA output is still invalid', async () => {
    process.env.AI_PROVIDER = 'poe';
    process.env.POE_API_KEY = 'test-poe-key';

    const fetchMock = jest.mocked(globalThis.fetch);

    fetchMock
      .mockResolvedValueOnce({
        ok: true,
        json: async () => mockPoeResponse('{"findings":"wrong-shape"}'),
      } as Response)
      .mockResolvedValueOnce({
        ok: true,
        json: async () => mockPoeResponse('still-wrong-json'),
      } as Response);

    const utils = await loadUtilsModule();

    await expect(utils.parseQaResponse('qa prompt')).rejects.toThrow(
      'Poe returned invalid qa_response JSON after repair attempt.',
    );
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });
});
