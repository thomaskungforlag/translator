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

type PoeMessage = {
  role: 'system' | 'user';
  content: string;
};

type PoeCompletionResponse = {
  choices?: Array<{
    message?: {
      content?: string;
    };
    text?: string;
  }>;
  output_text?: string;
};

type PoeSchema = typeof stageResponseSchema | typeof qaResponseSchema;

export type StageSegment = {
  index: number;
  text: string;
};

export type TranslationWorkspaceResponse = {
  project: import('./workspace').StudioShellProject;
  mode: 'openai' | 'poe' | 'fallback';
  message?: string;
};

const openaiClient = env.OPENAI_API_KEY ? new OpenAI({ apiKey: env.OPENAI_API_KEY }) : null;
const openaiModel = env.OPENAI_MODEL ?? 'gpt-5-mini';
const poeApiUrl = env.POE_API_URL ?? 'https://api.poe.com/v1/chat/completions';
const poeBot = env.POE_BOT ?? 'Claude-Sonnet-4.5';

export const activeProvider = env.AI_PROVIDER;
export const isOpenAIConfigured = Boolean(openaiClient);
export const isPoeConfigured = Boolean(env.POE_API_KEY);
export const isLlmConfigured = activeProvider === 'poe' ? isPoeConfigured : isOpenAIConfigured;
export const activeProviderMode: Exclude<TranslationWorkspaceResponse['mode'], 'fallback'> =
  activeProvider;

function extractPoeText(response: PoeCompletionResponse): string {
  const firstChoice = response.choices?.[0];
  const messageContent = firstChoice?.message?.content;

  if (messageContent && messageContent.trim().length > 0) {
    return messageContent;
  }

  const choiceText = firstChoice?.text;

  if (choiceText && choiceText.trim().length > 0) {
    return choiceText;
  }

  const outputText = response.output_text;

  if (outputText && outputText.trim().length > 0) {
    return outputText;
  }

  throw new Error('Poe returned an empty response body.');
}

function extractJsonText(rawText: string): string {
  const fencedJsonMatch = rawText.match(/```json\s*([\s\S]*?)```/i);

  if (fencedJsonMatch?.[1]) {
    return fencedJsonMatch[1].trim();
  }

  const fencedMatch = rawText.match(/```\s*([\s\S]*?)```/);

  if (fencedMatch?.[1]) {
    return fencedMatch[1].trim();
  }

  return rawText.trim();
}

async function requestPoe(messages: PoeMessage[]): Promise<string> {
  if (!env.POE_API_KEY) {
    throw new Error('Poe key is not configured.');
  }

  const response = await fetch(poeApiUrl, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${env.POE_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: poeBot,
      messages,
      temperature: 0,
    }),
  });

  if (!response.ok) {
    throw new Error(`Poe request failed with status ${response.status}.`);
  }

  const payload = (await response.json()) as PoeCompletionResponse;

  return extractPoeText(payload);
}

async function repairPoeJson(rawResponse: string, schemaName: string): Promise<string> {
  return requestPoe([
    {
      role: 'system',
      content: 'You repair malformed JSON. Return only valid JSON and do not add commentary.',
    },
    {
      role: 'user',
      content: [
        `Repair this response to valid ${schemaName} JSON.`,
        'Keep the exact semantic content. Return only JSON.',
        rawResponse,
      ].join('\n\n'),
    },
  ]);
}

async function parsePoeJsonWithRepair<T>(
  rawResponse: string,
  schema: PoeSchema,
  schemaName: string,
): Promise<T> {
  const parseCandidate = (candidate: string) => {
    try {
      return schema.safeParse(JSON.parse(extractJsonText(candidate)) as unknown);
    } catch {
      return schema.safeParse(undefined);
    }
  };

  const initial = parseCandidate(rawResponse);

  if (initial.success) {
    return initial.data as T;
  }

  const repairedResponse = await repairPoeJson(rawResponse, schemaName);
  const repaired = parseCandidate(repairedResponse);

  if (repaired.success) {
    return repaired.data as T;
  }

  throw new Error(`Poe returned invalid ${schemaName} JSON after repair attempt.`);
}

async function parsePoeStageResponse(prompt: string): Promise<StageSegment[]> {
  const rawResponse = await requestPoe([
    {
      role: 'system',
      content:
        'You are a literary translation engine for Swedish fiction. Return only strict JSON.',
    },
    {
      role: 'user',
      content: prompt,
    },
  ]);

  const parsed = await parsePoeJsonWithRepair<z.infer<typeof stageResponseSchema>>(
    rawResponse,
    stageResponseSchema,
    'stage_response',
  );

  return parsed.segments;
}

async function parsePoeQaResponse(prompt: string): Promise<Array<z.infer<typeof qaFindingSchema>>> {
  const rawResponse = await requestPoe([
    {
      role: 'system',
      content: 'You are a literary QA reviewer. Return only strict JSON with actionable findings.',
    },
    {
      role: 'user',
      content: prompt,
    },
  ]);

  const parsed = await parsePoeJsonWithRepair<z.infer<typeof qaResponseSchema>>(
    rawResponse,
    qaResponseSchema,
    'qa_response',
  );

  return parsed.findings;
}

export function parseStageResponse(stageName: string, prompt: string): Promise<StageSegment[]> {
  if (activeProvider === 'poe') {
    return parsePoeStageResponse(prompt);
  }

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
  if (activeProvider === 'poe') {
    return parsePoeQaResponse(prompt);
  }

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
