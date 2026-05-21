/** @jest-environment node */

export {};

import { demoWorkspaceSeed } from './demo-workspace';
import { buildFaithfulDraft } from './pipeline';

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

function mockPoeStageResponse(segmentText: string): Response {
  return {
    ok: true,
    json: () =>
      Promise.resolve(
        mockPoeResponse(JSON.stringify({ segments: [{ index: 0, text: segmentText }] })),
      ),
  } as unknown as Response;
}

function mockPoeStageResponseSegments(segments: Array<{ index: number; text: string }>): Response {
  return {
    ok: true,
    json: () => Promise.resolve(mockPoeResponse(JSON.stringify({ segments }))),
  } as unknown as Response;
}

function mockPoeQaResponse(content: string): Response {
  return {
    ok: true,
    json: () => Promise.resolve(mockPoeResponse(content)),
  } as unknown as Response;
}

async function loadProviderModule() {
  jest.resetModules();

  return import('./translation-provider');
}

describe('runTranslationWorkspace', () => {
  beforeEach(() => {
    process.env = { ...ORIGINAL_ENV };
    process.env.AI_PROVIDER = 'poe';
    process.env.POE_API_KEY = 'test-poe-key';
    delete process.env.OPENAI_API_KEY;

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

  it('recovers a suspicious faithful chunk with deterministic fallback and continues', async () => {
    const sourceText = 'Tuya var tillbaka i lägenheten.';
    const fetchMock = jest.mocked(globalThis.fetch);

    fetchMock
      .mockResolvedValueOnce(mockPoeStageResponse('Short source analysis.'))
      .mockResolvedValueOnce(mockPoeStageResponse(sourceText))
      .mockResolvedValueOnce(mockPoeStageResponse('Tuya was back in the apartment.'))
      .mockResolvedValueOnce(mockPoeStageResponse('Tuya was back in the apartment.'))
      .mockResolvedValueOnce(mockPoeStageResponse('Tuya was back in the apartment.'))
      .mockResolvedValueOnce(mockPoeStageResponse('Tuya was back in the apartment.'))
      .mockResolvedValueOnce(mockPoeQaResponse(JSON.stringify({ findings: [] })));

    const { runTranslationWorkspace } = await loadProviderModule();
    const result = await runTranslationWorkspace({
      ...demoWorkspaceSeed,
      sourceText,
    });

    expect(result.mode).toBe('poe');
    expect(result.project.segments[0]?.translationDraft).toBe(buildFaithfulDraft(sourceText));
    expect(result.message).toMatch(/faithful_translation recovered with local fallback/i);
    expect(result.project.segments[0]?.finalText).toBe('Tuya was back in the apartment.');
  });

  it('salvages translated segments when only part of a chunk is suspicious', async () => {
    const sourceText =
      'Tuya var tillbaka i lägenheten.\n\nHon väntade vid räcket tills dimman lättade.';
    const fetchMock = jest.mocked(globalThis.fetch);

    fetchMock
      .mockResolvedValueOnce(
        mockPoeStageResponseSegments([
          { index: 0, text: 'Analysis 0' },
          { index: 1, text: 'Analysis 1' },
        ]),
      )
      .mockResolvedValueOnce(
        mockPoeStageResponseSegments([
          { index: 0, text: 'Tuya was back in the apartment.' },
          { index: 1, text: 'Hon väntade vid räcket tills dimman lättade.' },
        ]),
      )
      .mockResolvedValueOnce(
        mockPoeStageResponseSegments([
          { index: 0, text: 'Tuya was back in the apartment.' },
          { index: 1, text: 'She waited by the railing until the fog thinned.' },
        ]),
      )
      .mockResolvedValueOnce(
        mockPoeStageResponseSegments([
          { index: 0, text: 'Tuya was back in the apartment.' },
          { index: 1, text: 'She waited by the railing until the fog thinned.' },
        ]),
      )
      .mockResolvedValueOnce(
        mockPoeStageResponseSegments([
          { index: 0, text: 'Tuya was back in the apartment.' },
          { index: 1, text: 'She waited by the railing until the fog thinned.' },
        ]),
      )
      .mockResolvedValueOnce(
        mockPoeStageResponseSegments([
          { index: 0, text: 'Tuya was back in the apartment.' },
          { index: 1, text: 'She waited by the railing until the fog thinned.' },
        ]),
      )
      .mockResolvedValueOnce(mockPoeQaResponse(JSON.stringify({ findings: [] })));

    const { runTranslationWorkspace } = await loadProviderModule();
    const result = await runTranslationWorkspace({
      ...demoWorkspaceSeed,
      sourceText,
    });

    expect(result.mode).toBe('poe');
    expect(result.project.segments[0]?.translationDraft).toBe('Tuya was back in the apartment.');
    expect(result.project.segments[1]?.translationDraft).toBe(
      buildFaithfulDraft('Hon väntade vid räcket tills dimman lättade.'),
    );
    expect(result.message).toMatch(/faithful_translation recovered with local fallback/i);
  });

  it('recovers QA model failures without falling back the whole project', async () => {
    const sourceText = 'Hon väntade vid räcket tills dimman lättade.';
    const fetchMock = jest.mocked(globalThis.fetch);

    fetchMock
      .mockResolvedValueOnce(mockPoeStageResponse('Short source analysis.'))
      .mockResolvedValueOnce(
        mockPoeStageResponse('She waited by the railing until the fog thinned.'),
      )
      .mockResolvedValueOnce(
        mockPoeStageResponse('She waited at the railing until the fog thinned.'),
      )
      .mockResolvedValueOnce(
        mockPoeStageResponse('She waited at the railing until the fog lifted.'),
      )
      .mockResolvedValueOnce(
        mockPoeStageResponse('She waited at the railing until the fog lifted.'),
      )
      .mockResolvedValueOnce(
        mockPoeStageResponse('She waited at the railing until the fog lifted.'),
      )
      .mockResolvedValueOnce({
        ok: false,
        status: 500,
        text: () => Promise.resolve('internal error'),
      } as unknown as Response);

    const { runTranslationWorkspace } = await loadProviderModule();
    const result = await runTranslationWorkspace({
      ...demoWorkspaceSeed,
      sourceText,
    });

    expect(result.mode).toBe('poe');
    expect(result.project.segments[0]?.finalText).toBe(
      'She waited at the railing until the fog lifted.',
    );
    expect(result.message).toMatch(/qa_review recovered without model findings/i);
  });
});
