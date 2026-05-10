import OpenAI from 'openai';
import { zodTextFormat } from 'openai/helpers/zod';
import { z } from 'zod';

import { env } from './env';
import {
  buildFaithfulDraft,
  buildPolishedDraft,
  buildSourceAnalysis,
  buildVoiceDraft,
  type SegmentDraft,
} from './pipeline';
import { qaFindingSchema, qaResponseSchema, stageResponseSchema } from './translation-schemas';

export type StageSegment = {
  index: number;
  text: string;
};

export type TranslationWorkspaceResponse = {
  project: import('./workspace').StudioShellProject;
  mode: 'openai' | 'fallback';
  message?: string;
};

const openaiClient = env.OPENAI_API_KEY ? new OpenAI({ apiKey: env.OPENAI_API_KEY }) : null;
const openaiModel = env.OPENAI_MODEL ?? 'gpt-4.1-mini';

export const isOpenAIConfigured = Boolean(openaiClient);

export function parseStageResponse(stageName: string, prompt: string): Promise<StageSegment[]> {
  if (!openaiClient) {
    return Promise.resolve([]);
  }

  return openaiClient.responses
    .parse({
      model: openaiModel,
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
    })
    .then((response) => {
      if (!response.output_parsed) {
        throw new Error(`OpenAI returned no structured output for ${stageName}.`);
      }

      return response.output_parsed.segments;
    });
}

export function parseQaResponse(prompt: string): Promise<Array<z.infer<typeof qaFindingSchema>>> {
  if (!openaiClient) {
    return Promise.resolve([]);
  }

  return openaiClient.responses
    .parse({
      model: openaiModel,
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
    })
    .then((response) => {
      if (!response.output_parsed) {
        throw new Error('OpenAI returned no structured QA output.');
      }

      return response.output_parsed.findings;
    });
}

export function ensureStageCoverage(
  stageName: string,
  sourceSegments: string[],
  stageSegments: StageSegment[],
): void {
  if (stageSegments.length !== sourceSegments.length) {
    throw new Error(`OpenAI returned a different number of segments for ${stageName}.`);
  }

  const actualIndexes = stageSegments
    .map((segment) => segment.index)
    .slice()
    .sort((a, b) => a - b);

  for (const [index, expectedIndex] of sourceSegments
    .map((_, segmentIndex) => segmentIndex)
    .entries()) {
    if (actualIndexes[index] !== expectedIndex) {
      throw new Error(`OpenAI returned an out-of-order response for ${stageName}.`);
    }
  }
}

type DraftStageSet = {
  sourceSegments: string[];
  analysisSegments: StageSegment[];
  faithfulSegments: StageSegment[];
  voiceSegments: StageSegment[];
  polishedSegments: StageSegment[];
};

function resolveStageText(segments: StageSegment[], index: number, fallback: string): string {
  return segments[index]?.text ?? fallback;
}

export function toDrafts({
  sourceSegments,
  analysisSegments,
  faithfulSegments,
  voiceSegments,
  polishedSegments,
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
    const polishedDraft = resolveStageText(
      polishedSegments,
      index,
      buildPolishedDraft(sourceText, voiceAdaptedDraft),
    );

    return {
      sourceText,
      sourceAnalysis: resolveStageText(analysisSegments, index, buildSourceAnalysis(sourceText)),
      translationDraft,
      voiceAdaptedDraft,
      polishedDraft,
      finalText: polishedDraft,
      qaFindings: [],
    };
  });
}
