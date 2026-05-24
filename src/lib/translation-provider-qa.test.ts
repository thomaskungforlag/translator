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

describe('translation-provider-utils (QA normalization)', () => {
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

  it('throws after repair pass when Poe QA output is still invalid', async () => {
    process.env.AI_PROVIDER = 'poe';
    process.env.POE_API_KEY = 'test-poe-key';

    const fetchMock = jest.mocked(globalThis.fetch);
    const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => undefined);

    fetchMock
      .mockResolvedValueOnce({
        ok: true,
        json: () => mockPoeResponse('{"findings":"wrong-shape"}'),
      } as unknown as Response)
      .mockResolvedValueOnce({
        ok: true,
        json: () => mockPoeResponse('still-wrong-json'),
      } as unknown as Response);

    const utils = await loadUtilsModule();

    await expect(utils.parseQaResponse('qa prompt')).rejects.toThrow(
      'Poe returned invalid qa_response JSON after repair attempt.',
    );
    expect(
      consoleErrorSpy.mock.calls.some(
        ([message, details]) =>
          message === '[poe] repair parse failed' &&
          typeof details === 'object' &&
          details !== null &&
          'schemaName' in details &&
          (details as { schemaName?: string }).schemaName === 'qa_response' &&
          'provider' in details &&
          (details as { provider?: string }).provider === 'poe',
      ),
    ).toBe(true);
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it('accepts repaired stage_response wrapper payloads', async () => {
    process.env.AI_PROVIDER = 'poe';
    process.env.POE_API_KEY = 'test-poe-key';

    const fetchMock = jest.mocked(globalThis.fetch);

    fetchMock
      .mockResolvedValueOnce({
        ok: true,
        json: () =>
          mockPoeResponse(
            JSON.stringify([
              { index: 0, polished: 'Polished 1' },
              { index: 1, polished: 'Polished 2' },
            ]),
          ),
      } as unknown as Response)
      .mockResolvedValueOnce({
        ok: true,
        json: () =>
          mockPoeResponse(
            JSON.stringify({
              stage_response: [
                { index: 0, polished: 'Polished 1' },
                { index: 1, polished: 'Polished 2' },
              ],
            }),
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

  it('normalizes qaFindings payloads with finding/recommendation keys', async () => {
    process.env.AI_PROVIDER = 'poe';
    process.env.POE_API_KEY = 'test-poe-key';

    const fetchMock = jest.mocked(globalThis.fetch);

    fetchMock.mockResolvedValueOnce({
      ok: true,
      json: () =>
        mockPoeResponse(
          JSON.stringify({
            qaFindings: [
              {
                segmentIndex: 2,
                severity: 'critical',
                category: 'locked_terminology',
                finding: 'Locked term mismatch.',
                recommendation: 'Use canonical term.',
                evidence: 'Auroraporten',
              },
            ],
          }),
        ),
    } as unknown as Response);

    const utils = await loadUtilsModule();
    const findings = await utils.parseQaResponse('qa prompt');

    expect(findings).toEqual([
      {
        segmentIndex: 2,
        severity: 'critical',
        category: 'terminology',
        issue: 'Locked term mismatch.',
        suggestion: 'Use canonical term.',
        sourceExcerpt: 'Auroraporten',
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
      json: () =>
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
    } as unknown as Response);

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

  it('normalizes snake_case QA payload fields from Poe', async () => {
    process.env.AI_PROVIDER = 'poe';
    process.env.POE_API_KEY = 'test-poe-key';

    const fetchMock = jest.mocked(globalThis.fetch);

    fetchMock.mockResolvedValueOnce({
      ok: true,
      json: () =>
        mockPoeResponse(
          JSON.stringify({
            findings: [
              {
                segment_index: 0,
                severity: 'minor',
                category: 'voice_drift',
                source_phrase: 'raglade runt i lagenheten',
                final_phrase: 'staggered around the apartment',
                issue: 'Tone softening in violent context.',
                suggestion: 'use "hurling" for stronger force',
              },
            ],
          }),
        ),
    } as unknown as Response);

    const utils = await loadUtilsModule();
    const findings = await utils.parseQaResponse('qa prompt');

    expect(findings).toEqual([
      {
        segmentIndex: 0,
        severity: 'warning',
        category: 'style_drift',
        sourceExcerpt: 'raglade runt i lagenheten',
        targetExcerpt: 'staggered around the apartment',
        issue: 'Tone softening in violent context.',
        suggestion: 'use "hurling" for stronger force',
      },
    ]);
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('maps literalness-style categories to translation_stiffness', async () => {
    process.env.AI_PROVIDER = 'poe';
    process.env.POE_API_KEY = 'test-poe-key';

    const fetchMock = jest.mocked(globalThis.fetch);

    fetchMock.mockResolvedValueOnce({
      ok: true,
      json: () =>
        mockPoeResponse(
          JSON.stringify({
            findings: [
              {
                segmentIndex: 0,
                severity: 'warning',
                category: 'literalness',
                issue: 'The syntax tracks Swedish too closely in English.',
              },
            ],
          }),
        ),
    } as unknown as Response);

    const utils = await loadUtilsModule();
    const findings = await utils.parseQaResponse('qa prompt');

    expect(findings).toEqual([
      {
        segmentIndex: 0,
        severity: 'warning',
        category: 'translation_stiffness',
        issue: 'The syntax tracks Swedish too closely in English.',
      },
    ]);
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('maps new QA category aliases for tense, image, family, and cultural drift', async () => {
    process.env.AI_PROVIDER = 'poe';
    process.env.POE_API_KEY = 'test-poe-key';

    const fetchMock = jest.mocked(globalThis.fetch);

    fetchMock.mockResolvedValueOnce({
      ok: true,
      json: () =>
        mockPoeResponse(
          JSON.stringify({
            findings: [
              {
                segmentIndex: 0,
                severity: 'warning',
                category: 'tense_drift',
                issue: 'Past expectation became progressive action.',
              },
              {
                segmentIndex: 1,
                severity: 'warning',
                category: 'imagery_drift',
                issue: 'Image lost precision.',
              },
              {
                segmentIndex: 2,
                severity: 'warning',
                category: 'family_terms',
                issue: 'Literal family terms sound awkward in English.',
              },
              {
                segmentIndex: 3,
                severity: 'warning',
                category: 'cultural_texture',
                issue: 'Communal warmth was flattened.',
              },
            ],
          }),
        ),
    } as unknown as Response);

    const utils = await loadUtilsModule();
    const findings = await utils.parseQaResponse('qa prompt');

    expect(findings).toEqual([
      {
        segmentIndex: 0,
        severity: 'warning',
        category: 'tense_aspect_drift',
        issue: 'Past expectation became progressive action.',
      },
      {
        segmentIndex: 1,
        severity: 'warning',
        category: 'image_drift',
        issue: 'Image lost precision.',
      },
      {
        segmentIndex: 2,
        severity: 'warning',
        category: 'family_term_naturalness',
        issue: 'Literal family terms sound awkward in English.',
      },
      {
        segmentIndex: 3,
        severity: 'warning',
        category: 'cultural_texture_drift',
        issue: 'Communal warmth was flattened.',
      },
    ]);
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('flags unchanged faithful output as untranslated', async () => {
    process.env.AI_PROVIDER = 'poe';
    process.env.POE_API_KEY = 'test-poe-key';

    const utils = await loadUtilsModule();

    expect(() =>
      utils.ensureStageLooksTranslated(
        'faithful_translation',
        ['Tuya var tillbaka i lägenheten.'],
        [{ index: 0, text: 'Tuya var tillbaka i lägenheten.' }],
      ),
    ).toThrow(/appears untranslated/i);
  });

  it('accepts English faithful output as translated', async () => {
    process.env.AI_PROVIDER = 'poe';
    process.env.POE_API_KEY = 'test-poe-key';

    const utils = await loadUtilsModule();

    expect(() =>
      utils.ensureStageLooksTranslated(
        'faithful_translation',
        ['Tuya var tillbaka i lägenheten.'],
        [{ index: 0, text: 'Tuya was back in the apartment.' }],
      ),
    ).not.toThrow();
  });

  it('reports provider-specific coverage errors', async () => {
    process.env.AI_PROVIDER = 'poe';
    process.env.POE_API_KEY = 'test-poe-key';

    const utils = await loadUtilsModule();

    expect(() => utils.ensureStageCoverage('faithful_translation', 'poe', ['source'], [])).toThrow(
      /Poe returned a different number of segments for faithful_translation\./,
    );
  });
});
