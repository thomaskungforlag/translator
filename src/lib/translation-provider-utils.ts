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
type PoeSchemaName = 'stage_response' | 'qa_response';
type SafeParseResult = ReturnType<PoeSchema['safeParse']>;

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

function preview(value: string, maxLength = 700): string {
  if (value.length <= maxLength) {
    return value;
  }

  return `${value.slice(0, maxLength)}... [truncated ${value.length - maxLength} chars]`;
}

function summarizeParseIssues(result: SafeParseResult): string[] {
  if (result.success) {
    return [];
  }

  return result.error.issues.slice(0, 8).map((issue) => {
    const path = issue.path.length > 0 ? issue.path.join('.') : '(root)';

    return `${path}: ${issue.message}`;
  });
}

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

function extractBalancedJson(rawText: string): string | null {
  const starts = ['{', '['] as const;

  for (const startChar of starts) {
    const startIndex = rawText.indexOf(startChar);

    if (startIndex === -1) {
      continue;
    }

    const endChar = startChar === '{' ? '}' : ']';
    let depth = 0;

    for (let index = startIndex; index < rawText.length; index += 1) {
      const char = rawText[index];

      if (char === startChar) {
        depth += 1;
      }

      if (char === endChar) {
        depth -= 1;

        if (depth === 0) {
          return rawText.slice(startIndex, index + 1);
        }
      }
    }
  }

  return null;
}

function safeJsonParse(value: string): unknown {
  try {
    return JSON.parse(value) as unknown;
  } catch {
    return undefined;
  }
}

function extractJsonCandidate(rawText: string): unknown {
  const stripped = extractJsonText(rawText);
  const direct = safeJsonParse(stripped);

  if (direct !== undefined) {
    return direct;
  }

  const balanced = extractBalancedJson(rawText);

  if (!balanced) {
    return undefined;
  }

  return safeJsonParse(balanced);
}

function toStageResponseShape(candidate: unknown): unknown {
  const normalizeStageItems = (items: unknown[]): Array<{ index: number; text: string }> => {
    return items
      .map((item) => {
        if (!item || typeof item !== 'object') {
          return null;
        }

        const record = item as Record<string, unknown>;
        const index = typeof record.index === 'number' ? record.index : null;
        const textCandidate = [
          record.text,
          record.analysis,
          record.translation,
          record.draft,
          record.voice,
          record.polish,
          record.polished,
          record.voiceAdapted,
          record.voice_adapted,
          record.output,
        ].find((value) => typeof value === 'string' && value.trim().length > 0) as
          | string
          | undefined;

        if (index === null || !textCandidate) {
          return null;
        }

        return {
          index,
          text: textCandidate,
        };
      })
      .filter((item): item is { index: number; text: string } => item !== null);
  };

  if (Array.isArray(candidate)) {
    const normalized = normalizeStageItems(candidate);

    return {
      segments: normalized.length > 0 ? normalized : candidate,
    };
  }

  if (!candidate || typeof candidate !== 'object') {
    return candidate;
  }

  const record = candidate as Record<string, unknown>;
  const nestedStageContainer =
    record.stageResult ?? record.stage_result ?? record.result ?? record.payload;

  if (nestedStageContainer && typeof nestedStageContainer === 'object') {
    return toStageResponseShape(nestedStageContainer);
  }

  const resolveArrayContainer = (): unknown[] | null => {
    const prioritizedKeys = [
      'segments',
      'data',
      'analyses',
      'translations',
      'stage_response',
      'stageResponse',
    ];

    for (const key of prioritizedKeys) {
      const value = record[key];

      if (Array.isArray(value)) {
        return value;
      }
    }

    const dynamicEntry = Object.entries(record).find(([key, value]) => {
      if (!Array.isArray(value)) {
        return false;
      }

      const normalizedKey = key.toLowerCase();

      return (
        normalizedKey.includes('segment') ||
        normalizedKey.includes('analysis') ||
        normalizedKey.includes('analys') ||
        normalizedKey.includes('translation')
      );
    });

    return dynamicEntry?.[1] as unknown[] | null;
  };

  const resolvedContainer = resolveArrayContainer();

  if (resolvedContainer) {
    const normalized = normalizeStageItems(resolvedContainer);

    return {
      segments: normalized.length > 0 ? normalized : resolvedContainer,
    };
  }

  return candidate;
}

function toQaResponseShape(candidate: unknown): unknown {
  const normalizeQaSeverity = (value: unknown): 'info' | 'warning' | 'critical' | null => {
    if (typeof value !== 'string') {
      return 'warning';
    }

    const normalized = value.toLowerCase().trim();

    if (normalized === 'critical' || normalized === 'high' || normalized === 'error') {
      return 'critical';
    }

    if (
      normalized === 'warning' ||
      normalized === 'medium' ||
      normalized === 'warn' ||
      normalized === 'minor'
    ) {
      return 'warning';
    }

    if (normalized === 'info' || normalized === 'low') {
      return 'info';
    }

    if (normalized === 'pass' || normalized === 'ok' || normalized === 'none') {
      return null;
    }

    return 'warning';
  };

  const normalizeQaCategory = (value: unknown): z.infer<typeof qaFindingSchema>['category'] => {
    if (typeof value !== 'string') {
      return 'market_quality';
    }

    const normalized = value.toLowerCase().trim();
    const categoryMap: Record<string, z.infer<typeof qaFindingSchema>['category']> = {
      omission: 'omission',
      mistranslation: 'mistranslation',
      grammar: 'grammar',
      spelling: 'spelling',
      style_drift: 'style_drift',
      voice_drift: 'style_drift',
      style: 'style_drift',
      terminology: 'terminology',
      locked_terminology: 'terminology',
      terminology_and_voice: 'terminology',
      character_voice: 'character_voice',
      voice: 'character_voice',
      market_quality: 'market_quality',
      formatting: 'formatting',
    };

    return categoryMap[normalized] ?? 'market_quality';
  };

  const toOptionalText = (value: unknown): string | undefined => {
    return typeof value === 'string' && value.trim().length > 0 ? value : undefined;
  };

  const normalizeQaItems = (items: unknown[]): Array<z.infer<typeof qaFindingSchema>> => {
    return items
      .map((item) => {
        if (!item || typeof item !== 'object') {
          return null;
        }

        const record = item as Record<string, unknown>;
        const segmentIndex =
          typeof record.segmentIndex === 'number'
            ? record.segmentIndex
            : typeof record.segment_index === 'number'
              ? record.segment_index
              : typeof record.index === 'number'
                ? record.index
                : null;
        const severity = normalizeQaSeverity(record.severity);
        const issue = toOptionalText(record.issue) ?? toOptionalText(record.finding);

        if (segmentIndex === null || severity === null || !issue) {
          return null;
        }

        const normalizedFinding: z.infer<typeof qaFindingSchema> = {
          segmentIndex,
          severity,
          category: normalizeQaCategory(record.category),
          issue,
        };

        const suggestion =
          toOptionalText(record.suggestion) ?? toOptionalText(record.recommendation);

        if (suggestion) {
          normalizedFinding.suggestion = suggestion;
        }

        const sourceExcerpt =
          toOptionalText(record.sourceExcerpt) ??
          toOptionalText(record.source_phrase) ??
          toOptionalText(record.evidence);

        if (sourceExcerpt) {
          normalizedFinding.sourceExcerpt = sourceExcerpt;
        }

        const targetExcerpt =
          toOptionalText(record.targetExcerpt) ?? toOptionalText(record.final_phrase);

        if (targetExcerpt) {
          normalizedFinding.targetExcerpt = targetExcerpt;
        }

        return normalizedFinding;
      })
      .filter((item): item is z.infer<typeof qaFindingSchema> => item !== null);
  };

  if (Array.isArray(candidate)) {
    return { findings: normalizeQaItems(candidate) };
  }

  if (!candidate || typeof candidate !== 'object') {
    return candidate;
  }

  const record = candidate as Record<string, unknown>;

  const resolveQaArray = (): unknown[] | null => {
    const prioritizedKeys = [
      'findings',
      'issues',
      'qaFindings',
      'qa_findings',
      'qa',
      'qa_response',
      'qaResponse',
    ];

    for (const key of prioritizedKeys) {
      const value = record[key];

      if (Array.isArray(value)) {
        return value;
      }
    }

    const dynamicEntry = Object.entries(record).find(([key, value]) => {
      if (!Array.isArray(value)) {
        return false;
      }

      const normalizedKey = key.toLowerCase();

      return normalizedKey.includes('finding') || normalizedKey.includes('issue');
    });

    return dynamicEntry?.[1] as unknown[] | null;
  };

  const resolvedQaArray = resolveQaArray();

  if (resolvedQaArray) {
    return { findings: normalizeQaItems(resolvedQaArray) };
  }

  if (Array.isArray(record.findings)) {
    return { findings: normalizeQaItems(record.findings) };
  }

  if (Array.isArray(record.issues)) {
    return { findings: normalizeQaItems(record.issues) };
  }

  return candidate;
}

function normalizePoePayload(candidate: unknown, schemaName: PoeSchemaName): unknown {
  const base =
    schemaName === 'stage_response'
      ? toStageResponseShape(candidate)
      : toQaResponseShape(candidate);

  if (typeof base === 'string') {
    const reparsed = extractJsonCandidate(base);

    if (reparsed !== undefined) {
      return normalizePoePayload(reparsed, schemaName);
    }
  }

  return base;
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
    const errorBody = await response.text();

    console.error('[poe] request failed', {
      status: response.status,
      statusText: response.statusText,
      apiUrl: poeApiUrl,
      model: poeBot,
      bodyPreview: preview(errorBody),
    });

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
  schemaName: PoeSchemaName,
): Promise<T> {
  const parseCandidate = (candidate: string) => {
    const parsedCandidate = extractJsonCandidate(candidate);
    const normalized = normalizePoePayload(parsedCandidate, schemaName);

    return {
      result: schema.safeParse(normalized),
      parsedCandidate,
      normalized,
    };
  };

  const initial = parseCandidate(rawResponse);

  if (initial.result.success) {
    return initial.result.data as T;
  }

  console.info('[poe] initial parse mismatch; attempting one repair pass', {
    schemaName,
    issues: summarizeParseIssues(initial.result),
    rawPreview: preview(rawResponse),
    parsedCandidateType: typeof initial.parsedCandidate,
    normalizedType: typeof initial.normalized,
  });

  const repairedResponse = await repairPoeJson(rawResponse, schemaName);
  const repaired = parseCandidate(repairedResponse);

  if (repaired.result.success) {
    console.info('[poe] repair pass succeeded', {
      schemaName,
      initialIssues: summarizeParseIssues(initial.result),
    });

    return repaired.result.data as T;
  }

  console.error('[poe] repair parse failed', {
    schemaName,
    initialIssues: summarizeParseIssues(initial.result),
    repairIssues: summarizeParseIssues(repaired.result),
    rawPreview: preview(rawResponse),
    repairedPreview: preview(repairedResponse),
    parsedCandidateType: typeof repaired.parsedCandidate,
    normalizedType: typeof repaired.normalized,
  });

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
  stageName: 'faithful_translation' | 'voice_adaptation' | 'polish_pass',
  sourceSegments: string[],
  stageSegments: StageSegment[],
): void {
  const suspiciousIndexes = stageSegments
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

  if (suspiciousIndexes.length > 0) {
    const previewIndexes = suspiciousIndexes.slice(0, 8).join(', ');

    throw new Error(
      `Model output for ${stageName} appears untranslated in segment index(es): ${previewIndexes}.`,
    );
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
