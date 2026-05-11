/** @jest-environment node */

const validRequest = {
  sourcePostId: 42,
  sourceLanguageCode: 'sv',
  targetLanguageCode: 'en',
  title: 'Om oss',
  contentType: 'website_copy',
  contentPayload: [
    {
      key: 'block:0:text:1',
      blockType: 'core/paragraph',
      path: 'block:0/text:1',
      sourceText: 'Hej världen.',
      status: 'translate',
    },
  ],
};

describe('POST /api/wordpress/translate-page', () => {
  beforeEach(() => {
    jest.resetModules();
    process.env.WORDPRESS_TRANSLATION_API_KEY = 'shared-secret';
  });

  afterEach(() => {
    delete process.env.WORDPRESS_TRANSLATION_API_KEY;
  });

  it('requires the shared service key header', async () => {
    const { POST } = await import('./route');

    const response = await POST(
      new Request('http://localhost/api/wordpress/translate-page', {
        method: 'POST',
        body: JSON.stringify(validRequest),
      }),
    );

    expect(response.status).toBe(401);
    await expect(response.json()).resolves.toEqual({
      error: 'Unauthorized translation request.',
    });
  });

  it('rejects malformed request payloads', async () => {
    const { POST } = await import('./route');

    const response = await POST(
      new Request('http://localhost/api/wordpress/translate-page', {
        method: 'POST',
        headers: {
          'x-translation-service-key': 'shared-secret',
        },
        body: JSON.stringify({
          ...validRequest,
          contentPayload: [],
        }),
      }),
    );

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toEqual({
      error: 'Invalid WordPress translation request payload.',
    });
  });

  it('returns the WordPress translation result on success', async () => {
    jest.doMock('@/lib/wordpress-translation', () => ({
      translateWordPressPage: jest.fn().mockResolvedValue({
        mode: 'openai',
        title: 'About us',
        translatedContentPayload: [
          {
            key: 'block:0:text:1',
            blockType: 'core/paragraph',
            path: 'block:0/text:1',
            sourceText: 'Hej världen.',
            translatedText: 'Hello world.',
            status: 'translate',
          },
        ],
        qaFindings: [],
        segmentReports: [],
        warnings: [],
        styleProfileSummary: {
          name: 'Röd Tvilling',
          description: 'Default profile',
          referenceTitle: 'Röd Tvilling',
          lockedTerms: ['The Shadow Ship'],
          translationMemoryPolicy: 'Seed only.',
        },
      }),
    }));

    const { POST } = await import('./route');

    const response = await POST(
      new Request('http://localhost/api/wordpress/translate-page', {
        method: 'POST',
        headers: {
          'x-translation-service-key': 'shared-secret',
        },
        body: JSON.stringify(validRequest),
      }),
    );

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({
      mode: 'openai',
      title: 'About us',
      translatedContentPayload: [
        {
          key: 'block:0:text:1',
          blockType: 'core/paragraph',
          path: 'block:0/text:1',
          sourceText: 'Hej världen.',
          translatedText: 'Hello world.',
          status: 'translate',
        },
      ],
      qaFindings: [],
      segmentReports: [],
      warnings: [],
      styleProfileSummary: {
        name: 'Röd Tvilling',
        description: 'Default profile',
        referenceTitle: 'Röd Tvilling',
        lockedTerms: ['The Shadow Ship'],
        translationMemoryPolicy: 'Seed only.',
      },
    });
  });
});
