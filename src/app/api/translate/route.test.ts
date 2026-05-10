/** @jest-environment node */

import { demoWorkspaceSeed } from '@/lib/demo-workspace';
import * as translationModule from '@/lib/translation';

import { POST } from './route';

jest.mock('@/lib/translation', (): typeof import('@/lib/translation') => {
  const actual = jest.requireActual<typeof import('@/lib/translation')>('@/lib/translation');

  return {
    ...actual,
    runTranslationWorkspace: jest.fn(),
  };
});

describe('POST /api/translate', () => {
  it('parses the request and returns the translation result', async () => {
    const mockedRunTranslationWorkspace = jest.mocked(translationModule.runTranslationWorkspace);
    const result = {
      project: {
        title: demoWorkspaceSeed.title,
        contentType: demoWorkspaceSeed.contentType,
        targetLanguage: demoWorkspaceSeed.targetLanguage,
        progress: 100,
        segments: [],
        glossary: demoWorkspaceSeed.glossary,
        qaFindings: [],
        pipelineStages: [],
      },
      mode: 'openai' as const,
    };

    mockedRunTranslationWorkspace.mockResolvedValue(result);

    const response = await POST(
      new Request('http://localhost/api/translate', {
        method: 'POST',
        body: JSON.stringify(demoWorkspaceSeed),
      }),
    );

    expect(response.status).toBe(200);
    const body: unknown = await response.json();
    expect(body).toEqual(result);
    expect(mockedRunTranslationWorkspace).toHaveBeenCalledWith(demoWorkspaceSeed);
  });
});
