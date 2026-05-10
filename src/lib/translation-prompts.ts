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
        'Be strict about locked terminology, voice drift, translation stiffness, and formatting issues.',
        'Use category translation_stiffness when English feels translated rather than native literary prose (literal syntax transfer, awkward collocations, weak literal diction, awkward article/pronoun handling, or accidental melodrama).',
        'Do not file translation_stiffness when phrasing is intentionally stark, ambiguous, or emotionally restrained.',
      ],
    },
    null,
    2,
  );
}
