import { wordPressTranslatePageRequestSchema } from './wordpress-translation-schemas';

describe('wordPressTranslatePageRequestSchema', () => {
  it('accepts major language target codes', () => {
    const parsed = wordPressTranslatePageRequestSchema.parse({
      sourcePostId: 42,
      sourceLanguageCode: 'sv',
      targetLanguageCode: 'fr',
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
    });

    expect(parsed.targetLanguageCode).toBe('fr');
  });
});
