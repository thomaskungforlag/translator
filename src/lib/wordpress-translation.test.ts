import type { StudioShellProject } from './workspace';
import { translateWordPressPage } from './wordpress-translation';
import type { WordPressTranslatePageRequest } from './wordpress-translation-schemas';

function buildProject(
  finalTexts: string[],
  mode: 'openai' | 'fallback',
): {
  project: StudioShellProject;
  mode: 'openai' | 'fallback';
  message?: string;
} {
  return {
    project: {
      title: 'Om oss',
      contentType: 'website_copy',
      targetLanguage: {
        code: 'en',
        label: 'English',
        locale: 'en',
        translationNotes: [],
        dialogueRules: [],
        punctuationRules: [],
        marketQualityNotes: [],
      },
      styleProfile: {
        id: 'style-private-author-default',
        name: 'Private Author Corpus',
        description: 'Default profile',
        voicePrinciples: ['Grounded'],
        preferredTone: ['Direct'],
        avoidPatterns: ['Genericized voice'],
        sentenceRhythmNotes: ['Keep cadence tight.'],
        genreNotes: ['Stay concrete.'],
        sampleTexts: [],
      },
      progress: 100,
      segments: finalTexts.map((text, index) => ({
        id: `seg-${index}`,
        projectId: 'wp-99-en',
        index,
        sourceText: `source-${index}`,
        sourceAnalysis: `analysis-${index}`,
        translationDraft: `faithful-${index}`,
        voiceAdaptedDraft: `voice-${index}`,
        literaryNaturalnessDraft: `natural-${index}`,
        polishedDraft: `polished-${index}`,
        professionalLiteraryCopyeditDraft: text,
        finalText: text,
        finalTextLocked: false,
        qaFindings: [
          {
            id: `qa-${index}`,
            severity: 'warning',
            category: 'market_quality',
            issue: `Check segment ${index}.`,
            resolved: false,
          },
        ],
        status: 'reviewed',
      })),
      glossary: [],
      qaFindings: [
        {
          id: 'qa-page-1',
          severity: 'warning',
          category: 'market_quality',
          issue: 'Check page quality.',
          resolved: false,
        },
      ],
      pipelineStages: [],
    },
    mode,
    message:
      mode === 'fallback'
        ? 'The configured model provider is unavailable. Showing demo fallback drafts only.'
        : undefined,
  };
}

describe('translateWordPressPage', () => {
  const request: WordPressTranslatePageRequest = {
    sourcePostId: 99,
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
        metadata: { nodePath: '/html/body/p/text()[1]' },
      },
      {
        key: 'block:1:preserve',
        blockType: 'acf/custom-hero',
        path: 'block:1',
        sourceText: '[unsupported block preserved]',
        status: 'preserve',
      },
    ],
    pageContext: {
      slug: 'om-oss',
      path: '/om-oss',
      existingTargetPostId: 101,
    },
  };

  it('round-trips translated and preserved content units with stable keys', async () => {
    const result = await translateWordPressPage(request, () =>
      Promise.resolve(buildProject(['About us', 'Hello world.'], 'openai')),
    );

    expect(result.title).toBe('About us');
    expect(result.translatedContentPayload).toEqual([
      expect.objectContaining({
        key: 'block:0:text:1',
        translatedText: 'Hello world.',
      }),
      expect.objectContaining({
        key: 'block:1:preserve',
        translatedText: '[unsupported block preserved]',
      }),
    ]);
    expect(result.segmentReports).toHaveLength(2);
    expect(result.segmentReports[0]?.unitKey).toBe('__page_title__');
    expect(result.warnings).toEqual([
      expect.objectContaining({
        code: 'unsupported_block',
        unitKey: 'block:1:preserve',
      }),
    ]);
  });

  it('adds an explicit degraded-mode warning for fallback output', async () => {
    const result = await translateWordPressPage(request, () =>
      Promise.resolve(buildProject(['About us', 'Hello world.'], 'fallback')),
    );

    expect(result.mode).toBe('fallback');
    expect(result.warnings).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          code: 'degraded_mode',
        }),
      ]),
    );
  });
});
