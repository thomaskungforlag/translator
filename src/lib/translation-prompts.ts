import type { StyleProfile } from './domain';
import { buildReferencePromptContext } from './reference-material';
import { buildRuntimeReferencePromptContext } from './reference-material-runtime';
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
  styleProfile: StyleProfile;
};

type BuildStageInputArgs = {
  seed: TranslationWorkspaceSeed;
  sourceSegments: string[];
  stageName: string;
  instructions: string[];
  previousStages: Record<string, StageSegment[]>;
};

export async function buildStageInput({
  seed,
  sourceSegments,
  stageName,
  instructions,
  previousStages,
}: BuildStageInputArgs): Promise<string> {
  const runtimeReferenceBlock = await buildRuntimeReferencePromptContext(
    sourceSegments.join('\n\n'),
  );
  const reference =
    runtimeReferenceBlock.length > 0
      ? `${buildReferencePromptContext(seed.styleProfile)}\nRuntime document excerpts:\n${runtimeReferenceBlock}`
      : buildReferencePromptContext(seed.styleProfile);
  const payload: StagePromptInput = {
    reference,
    project: {
      title: seed.title,
      contentType: seed.contentType,
      sourceLanguageCode: seed.sourceLanguageCode,
      targetLanguageCode: seed.targetLanguage.code,
      targetLanguageLabel: seed.targetLanguage.label,
    },
    stageName,
    styleProfile: seed.styleProfile,
    sourceSegments: sourceSegments.map((segment, index) => ({
      index,
      text: segment,
    })),
    previousStages,
    instructions,
  };

  return JSON.stringify(payload, null, 2);
}

export async function buildQaPrompt(
  seed: TranslationWorkspaceSeed,
  sourceSegments: Array<{
    index: number;
    sourceText: string;
    sourceAnalysis: string;
    finalText: string;
  }>,
): Promise<string> {
  const runtimeReferenceBlock = await buildRuntimeReferencePromptContext(
    sourceSegments.map((segment) => segment.sourceText).join('\n\n'),
  );
  const reference =
    runtimeReferenceBlock.length > 0
      ? `${buildReferencePromptContext(seed.styleProfile)}\nRuntime document excerpts:\n${runtimeReferenceBlock}`
      : buildReferencePromptContext(seed.styleProfile);
  return JSON.stringify(
    {
      reference,
      project: {
        title: seed.title,
        contentType: seed.contentType,
        sourceLanguageCode: seed.sourceLanguageCode,
        targetLanguageCode: seed.targetLanguage.code,
        targetLanguageLabel: seed.targetLanguage.label,
      },
      styleProfile: seed.styleProfile,
      sourceSegments,
      instructions: [
        'Review the final texts against the Swedish source and the reference material.',
        'Return only actionable QA findings.',
        'Be strict about locked terminology, voice drift, tense/aspect drift, image drift, motion image drift, emotional intensity drift, grammar flow, punctuation flow, translation stiffness, family-term naturalness, cultural texture drift, and formatting issues.',
        'Check whether the English tense/aspect changes the emotional logic of the source. Flag cases where hope, expectation, remembered belief, or childlike certainty has become ongoing action or completed fact.',
        'Use category tense_aspect_drift when tense/aspect alters the emotional perspective or immediacy.',
        'Use category image_drift when key sensory or symbolic imagery is weakened, flattened, or unintentionally changed.',
        'Use category motion_image_drift when movement loses directional precision or physical intent.',
        'Use category emotional_intensity_drift when emotional force is flattened by weaker verb choice.',
        'Use category grammar_flow when sentence grammar feels translated and can be tightened without changing tone.',
        'Use category punctuation_flow when punctuation rhythm blocks literary readability.',
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
