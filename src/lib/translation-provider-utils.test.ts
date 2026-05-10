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

  it('accepts stage payloads returned as a top-level array', async () => {
    process.env.AI_PROVIDER = 'poe';
    process.env.POE_API_KEY = 'test-poe-key';

    const fetchMock = jest.mocked(globalThis.fetch);

    fetchMock.mockResolvedValueOnce({
      ok: true,
      json: async () => mockPoeResponse('[{"index":0,"text":"Array payload"}]'),
    } as Response);

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
      json: async () =>
        mockPoeResponse(
          JSON.stringify([
            { index: 0, polished: 'Polished 1' },
            { index: 1, polished: 'Polished 2' },
          ]),
        ),
    } as Response);

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
      json: async () =>
        mockPoeResponse(
          JSON.stringify({
            stageName: 'source_analysis',
            analyses: [
              { index: 0, analysis: 'Analysis 1' },
              { index: 1, analysis: 'Analysis 2' },
            ],
          }),
        ),
    } as Response);

    const utils = await loadUtilsModule();
    const segments = await utils.parseStageResponse('source_analysis', 'prompt');

    expect(segments).toEqual([
      { index: 0, text: 'Analysis 1' },
      { index: 1, text: 'Analysis 2' },
    ]);
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('normalizes dynamic segment keys like voiceAdaptedSegments', async () => {
    process.env.AI_PROVIDER = 'poe';
    process.env.POE_API_KEY = 'test-poe-key';

    const fetchMock = jest.mocked(globalThis.fetch);

    fetchMock.mockResolvedValueOnce({
      ok: true,
      json: async () =>
        mockPoeResponse(
          JSON.stringify({
            voiceAdaptedSegments: [
              { index: 0, text: 'Voice 1', note: 'ok' },
              { index: 1, text: 'Voice 2', note: 'ok' },
            ],
          }),
        ),
    } as Response);

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
      json: async () =>
        mockPoeResponse('"{\\"segments\\":[{\\"index\\":0,\\"text\\":\\"Nested payload\\"}]}"'),
    } as Response);

    const utils = await loadUtilsModule();
    const segments = await utils.parseStageResponse('polish_pass', 'prompt');

    expect(segments).toEqual([{ index: 0, text: 'Nested payload' }]);
    expect(fetchMock).toHaveBeenCalledTimes(1);
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

  it('accepts repaired stage_response wrapper payloads', async () => {
    process.env.AI_PROVIDER = 'poe';
    process.env.POE_API_KEY = 'test-poe-key';

    const fetchMock = jest.mocked(globalThis.fetch);

    fetchMock
      .mockResolvedValueOnce({
        ok: true,
        json: async () =>
          mockPoeResponse(
            JSON.stringify([
              { index: 0, polished: 'Polished 1' },
              { index: 1, polished: 'Polished 2' },
            ]),
          ),
      } as Response)
      .mockResolvedValueOnce({
        ok: true,
        json: async () =>
          mockPoeResponse(
            JSON.stringify({
              stage_response: [
                { index: 0, polished: 'Polished 1' },
                { index: 1, polished: 'Polished 2' },
              ],
            }),
          ),
      } as Response);

    const utils = await loadUtilsModule();
    const segments = await utils.parseStageResponse('polish_pass', 'prompt');

    expect(segments).toEqual([
      { index: 0, text: 'Polished 1' },
      { index: 1, text: 'Polished 2' },
    ]);
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('normalizes qaFindings payloads with finding/recommendation keys', async () => {
    process.env.AI_PROVIDER = 'poe';
    process.env.POE_API_KEY = 'test-poe-key';

    const fetchMock = jest.mocked(globalThis.fetch);

    fetchMock.mockResolvedValueOnce({
      ok: true,
      json: async () =>
        mockPoeResponse(
          JSON.stringify({
            qaFindings: [
              {
                segmentIndex: 2,
                severity: 'critical',
                category: 'locked_terminology',
                finding: 'Locked term mismatch.',
                recommendation: 'Use canonical term.',
                evidence: 'Skuggskeppet',
              },
            ],
          }),
        ),
    } as Response);

    const utils = await loadUtilsModule();
    const findings = await utils.parseQaResponse('qa prompt');

    expect(findings).toEqual([
      {
        segmentIndex: 2,
        severity: 'critical',
        category: 'terminology',
        issue: 'Locked term mismatch.',
        suggestion: 'Use canonical term.',
        sourceExcerpt: 'Skuggskeppet',
      },
    ]);
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('drops qa entries marked as pass and keeps real findings', async () => {
    process.env.AI_PROVIDER = 'poe';
    process.env.POE_API_KEY = 'test-poe-key';

    const fetchMock = jest.mocked(globalThis.fetch);

    fetchMock.mockResolvedValueOnce({
      ok: true,
      json: async () =>
        mockPoeResponse(
          JSON.stringify({
            qaFindings: [
              {
                segmentIndex: 0,
                severity: 'pass',
                category: 'terminology_and_voice',
                finding: 'No issues.',
              },
              {
                segmentIndex: 1,
                severity: 'warning',
                category: 'terminology_and_voice',
                finding: 'Possible style drift.',
              },
            ],
          }),
        ),
    } as Response);

    const utils = await loadUtilsModule();
    const findings = await utils.parseQaResponse('qa prompt');

    expect(findings).toEqual([
      {
        segmentIndex: 1,
        severity: 'warning',
        category: 'terminology',
        issue: 'Possible style drift.',
      },
    ]);
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });
});
