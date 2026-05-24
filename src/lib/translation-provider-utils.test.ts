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

describe('translation-provider-utils (provider adapters)', () => {
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
      json: () => mockPoeResponse('{"segments":[{"index":0,"text":"Draft"}]}'),
    } as unknown as Response);

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
        json: () => mockPoeResponse('not-json'),
      } as unknown as Response)
      .mockResolvedValueOnce({
        ok: true,
        json: () => mockPoeResponse('{"segments":[{"index":0,"text":"Repaired"}]}'),
      } as unknown as Response);

    const utils = await loadUtilsModule();
    const segments = await utils.parseStageResponse('voice_adaptation', 'prompt');

    expect(segments).toEqual([{ index: 0, text: 'Repaired' }]);
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it('accepts stage payloads returned as a top-level array', async () => {
    process.env.AI_PROVIDER = 'poe';
    process.env.POE_API_KEY = 'test-poe-key';

    const fetchMock = jest.mocked(globalThis.fetch);

    fetchMock.mockResolvedValueOnce({
      ok: true,
      json: () => mockPoeResponse('[{"index":0,"text":"Array payload"}]'),
    } as unknown as Response);

    const utils = await loadUtilsModule();
    const segments = await utils.parseStageResponse('faithful_translation', 'prompt');

    expect(segments).toEqual([{ index: 0, text: 'Array payload' }]);
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('normalizes array payloads that use polished as the text field', async () => {
    process.env.AI_PROVIDER = 'poe';
    process.env.POE_API_KEY = 'test-poe-key';

    const fetchMock = jest.mocked(globalThis.fetch);

    fetchMock.mockResolvedValueOnce({
      ok: true,
      json: () =>
        mockPoeResponse(
          JSON.stringify([
            { index: 0, polished: 'Polished 1' },
            { index: 1, polished: 'Polished 2' },
          ]),
        ),
    } as unknown as Response);

    const utils = await loadUtilsModule();
    const segments = await utils.parseStageResponse('polish_pass', 'prompt');

    expect(segments).toEqual([
      { index: 0, text: 'Polished 1' },
      { index: 1, text: 'Polished 2' },
    ]);
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('normalizes analyses/analysis payloads into segments/text', async () => {
    process.env.AI_PROVIDER = 'poe';
    process.env.POE_API_KEY = 'test-poe-key';

    const fetchMock = jest.mocked(globalThis.fetch);

    fetchMock.mockResolvedValueOnce({
      ok: true,
      json: () =>
        mockPoeResponse(
          JSON.stringify({
            stageName: 'source_analysis',
            analyses: [
              { index: 0, analysis: 'Analysis 1' },
              { index: 1, analysis: 'Analysis 2' },
            ],
          }),
        ),
    } as unknown as Response);

    const utils = await loadUtilsModule();
    const segments = await utils.parseStageResponse('source_analysis', 'prompt');

    expect(segments).toEqual([
      { index: 0, text: 'Analysis 1' },
      { index: 1, text: 'Analysis 2' },
    ]);
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('normalizes stageResult wrapper payloads with analyses array', async () => {
    process.env.AI_PROVIDER = 'poe';
    process.env.POE_API_KEY = 'test-poe-key';

    const fetchMock = jest.mocked(globalThis.fetch);

    fetchMock.mockResolvedValueOnce({
      ok: true,
      json: () =>
        mockPoeResponse(
          JSON.stringify({
            stageResult: {
              stageName: 'source_analysis',
              analyses: [
                { index: 0, analysis: 'Analysis A' },
                { index: 1, analysis: 'Analysis B' },
              ],
            },
          }),
        ),
    } as unknown as Response);

    const utils = await loadUtilsModule();
    const segments = await utils.parseStageResponse('source_analysis', 'prompt');

    expect(segments).toEqual([
      { index: 0, text: 'Analysis A' },
      { index: 1, text: 'Analysis B' },
    ]);
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('normalizes dynamic segment keys like voiceAdaptedSegments', async () => {
    process.env.AI_PROVIDER = 'poe';
    process.env.POE_API_KEY = 'test-poe-key';

    const fetchMock = jest.mocked(globalThis.fetch);

    fetchMock.mockResolvedValueOnce({
      ok: true,
      json: () =>
        mockPoeResponse(
          JSON.stringify({
            voiceAdaptedSegments: [
              { index: 0, text: 'Voice 1', note: 'ok' },
              { index: 1, text: 'Voice 2', note: 'ok' },
            ],
          }),
        ),
    } as unknown as Response);

    const utils = await loadUtilsModule();
    const segments = await utils.parseStageResponse('voice_adaptation', 'prompt');

    expect(segments).toEqual([
      { index: 0, text: 'Voice 1' },
      { index: 1, text: 'Voice 2' },
    ]);
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('parses nested JSON string payloads before schema validation', async () => {
    process.env.AI_PROVIDER = 'poe';
    process.env.POE_API_KEY = 'test-poe-key';

    const fetchMock = jest.mocked(globalThis.fetch);

    fetchMock.mockResolvedValueOnce({
      ok: true,
      json: () =>
        mockPoeResponse('"{\\"segments\\":[{\\"index\\":0,\\"text\\":\\"Nested payload\\"}]}"'),
    } as unknown as Response);

    const utils = await loadUtilsModule();
    const segments = await utils.parseStageResponse('polish_pass', 'prompt');

    expect(segments).toEqual([{ index: 0, text: 'Nested payload' }]);
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });
});
