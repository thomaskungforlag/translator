import OpenAI from 'openai';
import { zodTextFormat } from 'openai/helpers/zod';
import { z } from 'zod';

import { env } from './env';
import {
  buildFaithfulDraft,
  buildLiteraryNaturalnessDraft,
  buildPolishedDraft,
  buildProfessionalLiteraryCopyeditDraft,
  buildSourceAnalysis,
  buildVoiceDraft,
  type SegmentDraft,
} from './pipeline';
import { qaFindingSchema, qaResponseSchema, stageResponseSchema } from './translation-schemas';
import {
  parsePoeQaResponse,
  parsePoeStageResponse,
  type StageSegment,
} from './translation-provider-normalize';

export type TranslationWorkspaceResponse = {
  project: import('./workspace').StudioShellProject;
  mode: 'openai' | 'poe' | 'fallback';
  message?: string;
  warnings: string[];
};

export type TranslationProvider = Exclude<TranslationWorkspaceResponse['mode'], 'fallback'>;

export type RuntimeProvider = TranslationProvider;

export type RuntimeModelSelection = {
  provider: RuntimeProvider;
  model: string;
};

const openaiClient = env.OPENAI_API_KEY ? new OpenAI({ apiKey: env.OPENAI_API_KEY }) : null;
const poeApiUrl = env.POE_API_URL ?? 'https://api.poe.com/v1/chat/completions';

export const isOpenAIConfigured = Boolean(openaiClient);
export const isPoeConfigured = Boolean(env.POE_API_KEY);

export function getDefaultRuntimeProvider(): RuntimeProvider {
  return env.AI_PROVIDER;
}

export function getDefaultRuntimeModel(provider: RuntimeProvider): string {
  return provider === 'poe'
    ? (env.POE_BOT ?? 'Claude-Sonnet-4.5')
    : (env.OPENAI_MODEL ?? 'gpt-5-mini');
}

export function resolveRuntimeModelSelection(selection?: {
  provider?: RuntimeProvider;
  model?: string;
}): RuntimeModelSelection {
  const provider = selection?.provider ?? getDefaultRuntimeProvider();
  const model = selection?.model?.trim() || getDefaultRuntimeModel(provider);

  return { provider, model };
}

export function isRuntimeProviderConfigured(provider: RuntimeProvider): boolean {
  return provider === 'poe' ? isPoeConfigured : isOpenAIConfigured;
}

function providerDisplayName(provider: TranslationProvider): string {
  return provider === 'poe' ? 'Poe' : 'OpenAI';
}

async function parseOpenAIStageResponse(
  stageName: string,
  prompt: string,
  model: string,
): Promise<StageSegment[]> {
  const response = await openaiClient!.responses.parse({
    model,
    input: [
      {
        role: 'system',
        content:
          'You are a literary translation engine for Swedish fiction. Return only structured JSON.',
      },
      {
        role: 'user',
        content: prompt,
      },
    ],
    text: {
      format: zodTextFormat(stageResponseSchema, stageName),
    },
  });

  if (!response.output_parsed) {
    throw new Error(`OpenAI returned no structured output for ${stageName}.`);
  }

  return response.output_parsed.segments;
}

async function parseOpenAIQaResponse(
  prompt: string,
  model: string,
): Promise<Array<z.infer<typeof qaFindingSchema>>> {
  const response = await openaiClient!.responses.parse({
    model,
    input: [
      {
        role: 'system',
        content:
          'You are a literary QA reviewer. Return only structured JSON with actionable findings.',
      },
      {
        role: 'user',
        content: prompt,
      },
    ],
    text: {
      format: zodTextFormat(qaResponseSchema, 'qa_review'),
    },
  });

  if (!response.output_parsed) {
    throw new Error('OpenAI returned no structured QA output.');
  }

  return response.output_parsed.findings;
}

export function parseStageResponse(
  stageName: string,
  prompt: string,
  selection?: RuntimeModelSelection,
): Promise<StageSegment[]> {
  const runtimeSelection = selection ?? resolveRuntimeModelSelection();

  if (runtimeSelection.provider === 'poe') {
    if (!env.POE_API_KEY) {
      return Promise.resolve([]);
    }

    return parsePoeStageResponse(poeApiUrl, env.POE_API_KEY, runtimeSelection.model, prompt);
  }

  if (!openaiClient) {
    return Promise.resolve([]);
  }

  return parseOpenAIStageResponse(stageName, prompt, runtimeSelection.model);
}

export function parseQaResponse(
  prompt: string,
  selection?: RuntimeModelSelection,
): Promise<Array<z.infer<typeof qaFindingSchema>>> {
  const runtimeSelection = selection ?? resolveRuntimeModelSelection();

  if (runtimeSelection.provider === 'poe') {
    if (!env.POE_API_KEY) {
      return Promise.resolve([]);
    }

    return parsePoeQaResponse(poeApiUrl, env.POE_API_KEY, runtimeSelection.model, prompt);
  }

  if (!openaiClient) {
    return Promise.resolve([]);
  }

  return parseOpenAIQaResponse(prompt, runtimeSelection.model);
}

export function ensureStageCoverage(
  stageName: string,
  provider: TranslationProvider,
  sourceSegments: string[],
  stageSegments: StageSegment[],
): void {
  if (stageSegments.length !== sourceSegments.length) {
    throw new Error(
      `${providerDisplayName(provider)} returned a different number of segments for ${stageName}.`,
    );
  }

  const actualIndexes = stageSegments
    .map((segment) => segment.index)
    .slice()
    .sort((a, b) => a - b);

  for (const [index, expectedIndex] of sourceSegments
    .map((_, segmentIndex) => segmentIndex)
    .entries()) {
    if (actualIndexes[index] !== expectedIndex) {
      throw new Error(
        `${providerDisplayName(provider)} returned an out-of-order response for ${stageName}.`,
      );
    }
  }
}

function normalizeComparableText(value: string): string {
  return value
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9\s]/gi, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .toLowerCase();
}

function countMatches(value: string, words: string[]): number {
  return words.reduce((count, word) => {
    const regex = new RegExp(`\\b${word}\\b`, 'g');
    const matches = value.match(regex);

    return count + (matches?.length ?? 0);
  }, 0);
}

function looksLikeSwedish(value: string): boolean {
  const lower = value.toLowerCase();

  if (/[åäö]/.test(lower)) {
    return true;
  }

  const swedishMarkers = [
    'och',
    'att',
    'det',
    'som',
    'inte',
    'för',
    'med',
    'till',
    'var',
    'när',
    'hade',
  ];

  return countMatches(lower, swedishMarkers) >= 3;
}

function looksLikeEnglish(value: string): boolean {
  const lower = value.toLowerCase();
  const englishMarkers = ['the', 'and', 'was', 'were', 'with', 'from', 'that', 'she', 'he'];

  return countMatches(lower, englishMarkers) >= 2;
}

export function ensureStageLooksTranslated(
  stageName:
    | 'faithful_translation'
    | 'voice_adaptation'
    | 'literary_naturalness'
    | 'polish_pass'
    | 'professional_literary_copyedit',
  sourceSegments: string[],
  stageSegments: StageSegment[],
): void {
  const suspiciousIndexes = getSuspiciousStageIndexes(sourceSegments, stageSegments);

  if (suspiciousIndexes.length > 0) {
    const previewIndexes = suspiciousIndexes.slice(0, 8).join(', ');

    throw new Error(
      `Model output for ${stageName} appears untranslated in segment index(es): ${previewIndexes}.`,
    );
  }
}

export function getSuspiciousStageIndexes(
  sourceSegments: string[],
  stageSegments: StageSegment[],
): number[] {
  return stageSegments
    .filter((segment) => {
      const source = sourceSegments[segment.index] ?? '';
      const sourceComparable = normalizeComparableText(source);
      const outputComparable = normalizeComparableText(segment.text);
      const unchanged =
        sourceComparable.length > 0 &&
        sourceComparable === outputComparable &&
        outputComparable.length > 0;
      const likelySwedishOutput = looksLikeSwedish(segment.text) && !looksLikeEnglish(segment.text);

      return unchanged || likelySwedishOutput;
    })
    .map((segment) => segment.index);
}

type DraftStageSet = {
  sourceSegments: string[];
  analysisSegments: StageSegment[];
  faithfulSegments: StageSegment[];
  voiceSegments: StageSegment[];
  naturalnessSegments: StageSegment[];
  polishedSegments: StageSegment[];
  professionalCopyeditSegments: StageSegment[];
};

function resolveStageText(segments: StageSegment[], index: number, fallback: string): string {
  return segments[index]?.text ?? fallback;
}

export function toDrafts({
  sourceSegments,
  analysisSegments,
  faithfulSegments,
  voiceSegments,
  naturalnessSegments,
  polishedSegments,
  professionalCopyeditSegments,
}: DraftStageSet): SegmentDraft[] {
  return sourceSegments.map((sourceText, index) => {
    const translationDraft = resolveStageText(
      faithfulSegments,
      index,
      buildFaithfulDraft(sourceText),
    );
    const voiceAdaptedDraft = resolveStageText(
      voiceSegments,
      index,
      buildVoiceDraft(sourceText, translationDraft),
    );
    const literaryNaturalnessDraft = resolveStageText(
      naturalnessSegments,
      index,
      buildLiteraryNaturalnessDraft(sourceText, voiceAdaptedDraft),
    );
    const polishedDraft = resolveStageText(
      polishedSegments,
      index,
      buildPolishedDraft(sourceText, literaryNaturalnessDraft),
    );
    const professionalLiteraryCopyeditDraft = resolveStageText(
      professionalCopyeditSegments,
      index,
      buildProfessionalLiteraryCopyeditDraft(sourceText, polishedDraft),
    );

    return {
      sourceText,
      sourceAnalysis: resolveStageText(analysisSegments, index, buildSourceAnalysis(sourceText)),
      translationDraft,
      voiceAdaptedDraft,
      literaryNaturalnessDraft,
      polishedDraft,
      professionalLiteraryCopyeditDraft,
      finalText: professionalLiteraryCopyeditDraft,
      qaFindings: [],
    };
  });
}
