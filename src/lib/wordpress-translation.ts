import type { LanguageConfig, StyleProfile } from './domain';
import { buildDefaultStyleProfile, redTwinReference } from './reference-material';
import { runTranslationWorkspace } from './translation';
import type { TranslationWorkspaceSeed } from './workspace';
import {
  type WordPressContentUnit,
  type WordPressTranslatePageRequest,
  type WordPressTranslatePageResponse,
  wordPressTranslatePageResponseSchema,
} from './wordpress-translation-schemas';

const titleUnitKey = '__page_title__';
const titleUnitPath = 'page:title';
const titleBlockType = 'page_title';
const unitSeparator = '\n***\n';

type TranslationRunner = typeof runTranslationWorkspace;
type TranslationResult = Awaited<ReturnType<TranslationRunner>>;

function buildWebsiteCopyTargetLanguage(
  code: WordPressTranslatePageRequest['targetLanguageCode'],
  targetVariantLabel?: string,
): LanguageConfig {
  const isBritish = code === 'en-GB';
  const isAmerican = code === 'en-US';
  const label =
    targetVariantLabel ?? (isBritish ? 'English (UK)' : isAmerican ? 'English (US)' : 'English');
  const locale = isBritish ? 'en-GB' : isAmerican ? 'en-US' : 'en';

  return {
    code,
    label,
    locale,
    translationNotes: [
      'Translate for website copy, not literary chapter layout.',
      'Keep headings, CTAs, and marketing phrasing clear and idiomatic.',
      'Preserve locked terminology and author-brand voice from the reference material.',
    ],
    dialogueRules: ['Preserve the requested English variant across headings, buttons, and body.'],
    punctuationRules: ['Keep structural breaks stable so content units can be rehydrated safely.'],
    marketQualityNotes: ['Aim for publishable website copy that still respects the source tone.'],
  };
}

function buildStyleProfileSummary(styleProfile: StyleProfile) {
  return {
    name: styleProfile.name,
    description: styleProfile.description,
    referenceTitle: redTwinReference.title,
    lockedTerms: redTwinReference.lockedTerms.map((entry) => entry.targetTerm),
    translationMemoryPolicy:
      'Checked-in examples are placeholders only; keep real corpus material outside the public repo.',
  };
}

function buildTitleUnit(request: WordPressTranslatePageRequest): WordPressContentUnit {
  return {
    key: titleUnitKey,
    blockType: titleBlockType,
    path: titleUnitPath,
    sourceText: request.title,
    status: 'translate',
  };
}

function isTranslatableUnit(unit: WordPressContentUnit): boolean {
  return unit.status === 'translate';
}

function buildWordPressSeed(request: WordPressTranslatePageRequest): TranslationWorkspaceSeed {
  const translatableUnits = [
    buildTitleUnit(request),
    ...request.contentPayload.filter(isTranslatableUnit),
  ];
  const styleProfile = buildDefaultStyleProfile();

  return {
    projectId: `wp-${request.sourcePostId}-${request.targetLanguageCode}`,
    title: request.title,
    contentType: 'website_copy',
    sourceLanguageCode: request.sourceLanguageCode,
    targetLanguage: buildWebsiteCopyTargetLanguage(
      request.targetLanguageCode,
      request.targetVariantLabel,
    ),
    styleProfile,
    sourceText: translatableUnits.map((unit) => unit.sourceText).join(unitSeparator),
    glossary: redTwinReference.lockedTerms,
    segmentationStrategy: 'scene_markers',
  };
}

function buildPreservedWarnings(request: WordPressTranslatePageRequest) {
  return request.contentPayload
    .filter((unit) => unit.status === 'preserve')
    .map((unit) => ({
      code: 'unsupported_block' as const,
      message: `Preserved ${unit.blockType} without translation because it is unsupported in v1.`,
      unitKey: unit.key,
      blockType: unit.blockType,
    }));
}

function buildFallbackWarning(result: TranslationResult) {
  if (result.mode !== 'fallback') {
    return [];
  }

  return [
    {
      code: 'degraded_mode' as const,
      message:
        result.message ??
        'The translation service returned degraded fallback output. Review before publishing.',
    },
  ];
}

function mapSegmentReport(
  unit: WordPressContentUnit,
  segment: TranslationResult['project']['segments'][number],
) {
  return {
    unitKey: unit.key,
    blockType: unit.blockType,
    path: unit.path,
    sourceAnalysis: segment.sourceAnalysis,
    translationDraft: segment.translationDraft ?? segment.finalText ?? unit.sourceText,
    voiceAdaptedDraft: segment.voiceAdaptedDraft ?? segment.finalText ?? unit.sourceText,
    literaryNaturalnessDraft:
      segment.literaryNaturalnessDraft ?? segment.finalText ?? unit.sourceText,
    polishedDraft: segment.polishedDraft ?? segment.finalText ?? unit.sourceText,
    professionalLiteraryCopyeditDraft:
      segment.professionalLiteraryCopyeditDraft ?? segment.finalText ?? unit.sourceText,
    finalText: segment.finalText ?? unit.sourceText,
    qaFindings: segment.qaFindings,
  };
}

function buildTranslatedResponse(
  request: WordPressTranslatePageRequest,
  result: TranslationResult,
): WordPressTranslatePageResponse {
  const translatableContentUnits = request.contentPayload.filter(isTranslatableUnit);
  const expectedSegmentCount = translatableContentUnits.length + 1;

  if (result.project.segments.length !== expectedSegmentCount) {
    throw new Error('WordPress translation segment count does not match the content payload.');
  }

  const [titleSegment, ...contentSegments] = result.project.segments;
  let translatedIndex = 0;
  const translatedContentPayload = request.contentPayload.map((unit) => {
    if (!isTranslatableUnit(unit)) {
      return {
        ...unit,
        translatedText: unit.sourceText,
      };
    }

    const segment = contentSegments[translatedIndex];

    if (!segment) {
      throw new Error(`Missing translated segment for unit ${unit.key}.`);
    }

    translatedIndex += 1;

    return {
      ...unit,
      translatedText: segment.finalText ?? unit.sourceText,
    };
  });

  const segmentReports = [
    mapSegmentReport(buildTitleUnit(request), titleSegment),
    ...translatableContentUnits.map((unit, index) => {
      const segment = contentSegments[index];

      if (!segment) {
        throw new Error(`Missing segment report for unit ${unit.key}.`);
      }

      return mapSegmentReport(unit, segment);
    }),
  ];

  return wordPressTranslatePageResponseSchema.parse({
    mode: result.mode,
    title: titleSegment.finalText ?? request.title,
    translatedContentPayload,
    qaFindings: result.project.qaFindings,
    segmentReports,
    warnings: [...buildPreservedWarnings(request), ...buildFallbackWarning(result)],
    styleProfileSummary: buildStyleProfileSummary(result.project.styleProfile),
    message: result.message,
  });
}

export async function translateWordPressPage(
  request: WordPressTranslatePageRequest,
  runner: TranslationRunner = runTranslationWorkspace,
): Promise<WordPressTranslatePageResponse> {
  const seed = buildWordPressSeed(request);
  const result = await runner(seed);

  return buildTranslatedResponse(request, result);
}
