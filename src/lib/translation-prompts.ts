import { buildReferencePromptContext } from './reference-material';
import type { TranslationWorkspaceSeed } from './workspace';

type StageSegment = {
  index: number;
  text: string;
};

type StagePromptInput = {
  reference: string;
  project: {
    title: string;
    contentType: TranslationWorkspaceSeed['contentType'];
    sourceLanguageCode: TranslationWorkspaceSeed['sourceLanguageCode'];
    targetLanguageCode: TranslationWorkspaceSeed['targetLanguage']['code'];
    targetLanguageLabel: TranslationWorkspaceSeed['targetLanguage']['label'];
  };
  stageName: string;
  sourceSegments: StageSegment[];
  previousStages: Record<string, StageSegment[]>;
  instructions: string[];
};

type BuildStageInputArgs = {
  seed: TranslationWorkspaceSeed;
  sourceSegments: string[];
  stageName: string;
  instructions: string[];
  previousStages: Record<string, StageSegment[]>;
};

export function buildStageInput({
  seed,
  sourceSegments,
  stageName,
  instructions,
  previousStages,
}: BuildStageInputArgs): string {
  const payload: StagePromptInput = {
    reference: buildReferencePromptContext(),
    project: {
      title: seed.title,
      contentType: seed.contentType,
      sourceLanguageCode: seed.sourceLanguageCode,
      targetLanguageCode: seed.targetLanguage.code,
      targetLanguageLabel: seed.targetLanguage.label,
    },
    stageName,
    sourceSegments: sourceSegments.map((segment, index) => ({
      index,
      text: segment,
    })),
    previousStages,
    instructions,
  };

  return JSON.stringify(payload, null, 2);
}

export function buildQaPrompt(
  seed: TranslationWorkspaceSeed,
  sourceSegments: Array<{
    index: number;
    sourceText: string;
    sourceAnalysis: string;
    finalText: string;
  }>,
): string {
  return JSON.stringify(
    {
      reference: buildReferencePromptContext(),
      project: {
        title: seed.title,
        contentType: seed.contentType,
        sourceLanguageCode: seed.sourceLanguageCode,
        targetLanguageCode: seed.targetLanguage.code,
        targetLanguageLabel: seed.targetLanguage.label,
      },
      sourceSegments,
      instructions: [
        'Review the final texts against the Swedish source and the reference material.',
        'Return only actionable QA findings.',
        'Be strict about locked terminology, voice drift, tense/aspect drift, image drift, translation stiffness, family-term naturalness, cultural texture drift, and formatting issues.',
        'Check whether the English tense/aspect changes the emotional logic of the source. Flag cases where hope, expectation, remembered belief, or childlike certainty has become ongoing action or completed fact.',
        'Use category tense_aspect_drift when tense/aspect alters the emotional perspective or immediacy.',
        'Use category image_drift when key sensory or symbolic imagery is weakened, flattened, or unintentionally changed.',
        'Use category translation_stiffness when English feels translated rather than native literary prose (literal syntax transfer, awkward collocations, weak literal diction, awkward article/pronoun handling, or accidental melodrama).',
        'Use category family_term_naturalness when literal family terms create awkward English in narration, while preserving emotional distance and perspective.',
        'Use category cultural_texture_drift when socially warm or communal texture is flattened into neutral wording.',
        'Do not file translation_stiffness when phrasing is intentionally stark, ambiguous, or emotionally restrained.',
      ],
    },
    null,
    2,
  );
}
