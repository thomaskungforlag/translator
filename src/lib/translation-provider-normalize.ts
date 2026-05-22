import { z } from 'zod';

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
type PoeRequestContext = {
  apiUrl: string;
  apiKey: string;
  bot: string;
};

export type StageSegment = {
  index: number;
  text: string;
};

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

function previewLength(value: string): number {
  return value.length;
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
  const pickStageText = (record: Record<string, unknown>): string | undefined =>
    [
      record.text,
      record.analysis,
      record.translation,
      record.translation_text,
      record.draft,
      record.voice,
      record.voice_adapted_text,
      record.voiceAdaptedText,
      record.polish,
      record.polished,
      record.polishedText,
      record.polished_text,
      record.copyedit,
      record.copyeditedText,
      record.copyedited_text,
      record.professionalCopyedit,
      record.professional_copyedit,
      record.professional_literary_copyedit,
      record.professional_literary_copyedit_text,
      record.professionalLiteraryCopyeditText,
      record.voiceAdapted,
      record.voice_adapted,
      record.output,
    ].find((value) => typeof value === 'string' && value.trim().length > 0) as string | undefined;

  const normalizeStageItems = (items: unknown[]): Array<{ index: number; text: string }> =>
    items
      .map((item) => {
        if (!item || typeof item !== 'object') {
          return null;
        }

        const record = item as Record<string, unknown>;
        const index = typeof record.index === 'number' ? record.index : null;
        const textCandidate = pickStageText(record);

        if (index === null || !textCandidate) {
          return null;
        }

        return { index, text: textCandidate };
      })
      .filter((item): item is { index: number; text: string } => item !== null);

  const normalizeStageRecord = (
    record: Record<string, unknown>,
  ): Array<{ index: number; text: string }> | null => {
    const index = typeof record.index === 'number' ? record.index : null;
    const textCandidate = pickStageText(record);

    if (index === null || !textCandidate) {
      return null;
    }

    return [{ index, text: textCandidate }];
  };

  const normalizeIndexedRecordContainer = (
    record: Record<string, unknown>,
  ): Array<{ index: number; text: string }> | null => {
    const numericEntries = Object.entries(record)
      .filter(([key]) => /^\d+$/.test(key))
      .sort(([left], [right]) => Number(left) - Number(right))
      .map(([, value]) => value);

    if (numericEntries.length === 0) {
      return null;
    }

    const normalized = normalizeStageItems(numericEntries);

    return normalized.length > 0 ? normalized : null;
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
    record.stageResult ??
    record.stage_result ??
    record.stage_response ??
    record.result ??
    record.payload;

  if (nestedStageContainer && typeof nestedStageContainer === 'object') {
    return toStageResponseShape(nestedStageContainer);
  }

  const singleRecord = normalizeStageRecord(record);

  if (singleRecord) {
    return { segments: singleRecord };
  }

  const indexedRecordContainer = normalizeIndexedRecordContainer(record);

  if (indexedRecordContainer) {
    return { segments: indexedRecordContainer };
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
        return value as unknown[];
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

    const dynamicValue = dynamicEntry?.[1];

    return Array.isArray(dynamicValue) ? (dynamicValue as unknown[]) : null;
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
      grammar_flow: 'grammar_flow',
      syntax_flow: 'grammar_flow',
      style_drift: 'style_drift',
      voice_drift: 'style_drift',
      style: 'style_drift',
      tone_shift: 'tone_shift',
      tone: 'tone_shift',
      translation_stiffness: 'translation_stiffness',
      stiffness: 'translation_stiffness',
      literalism: 'translation_stiffness',
      literalness: 'translation_stiffness',
      tense_aspect_drift: 'tense_aspect_drift',
      tense_drift: 'tense_aspect_drift',
      aspect_drift: 'tense_aspect_drift',
      motion_image_drift: 'motion_image_drift',
      motion_drift: 'motion_image_drift',
      image_drift: 'image_drift',
      imagery_drift: 'image_drift',
      emotional_intensity_drift: 'emotional_intensity_drift',
      emotional_drift: 'emotional_intensity_drift',
      punctuation_flow: 'punctuation_flow',
      family_term_naturalness: 'family_term_naturalness',
      family_terms: 'family_term_naturalness',
      family_naturalness: 'family_term_naturalness',
      cultural_texture_drift: 'cultural_texture_drift',
      cultural_drift: 'cultural_texture_drift',
      cultural_texture: 'cultural_texture_drift',
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

  const toOptionalText = (value: unknown): string | undefined =>
    typeof value === 'string' && value.trim().length > 0 ? value : undefined;

  const resolveSegmentIndex = (record: Record<string, unknown>): number | null =>
    typeof record.segmentIndex === 'number'
      ? record.segmentIndex
      : typeof record.segment_index === 'number'
        ? record.segment_index
        : typeof record.index === 'number'
          ? record.index
          : null;

  const extractTargetRange = (
    record: Record<string, unknown>,
  ): z.infer<typeof qaFindingSchema>['targetRange'] => {
    const targetRangeRecord =
      record.targetRange && typeof record.targetRange === 'object'
        ? (record.targetRange as Record<string, unknown>)
        : null;

    if (
      !targetRangeRecord ||
      typeof targetRangeRecord.start !== 'number' ||
      typeof targetRangeRecord.end !== 'number' ||
      targetRangeRecord.start < 0 ||
      targetRangeRecord.end < targetRangeRecord.start
    ) {
      return undefined;
    }

    return {
      start: targetRangeRecord.start,
      end: targetRangeRecord.end,
    };
  };

  const normalizeQaItem = (item: unknown): z.infer<typeof qaFindingSchema> | null => {
    if (!item || typeof item !== 'object') {
      return null;
    }

    const record = item as Record<string, unknown>;
    const segmentIndex = resolveSegmentIndex(record);
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

    const suggestion = toOptionalText(record.suggestion) ?? toOptionalText(record.recommendation);

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

    const targetRange = extractTargetRange(record);

    if (targetRange) {
      normalizedFinding.targetRange = targetRange;
    }

    return normalizedFinding;
  };

  const normalizeQaItems = (items: unknown[]): Array<z.infer<typeof qaFindingSchema>> =>
    items
      .map(normalizeQaItem)
      .filter((item): item is z.infer<typeof qaFindingSchema> => item !== null);

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
        return value as unknown[];
      }
    }

    const dynamicEntry = Object.entries(record).find(([key, value]) => {
      if (!Array.isArray(value)) {
        return false;
      }

      const normalizedKey = key.toLowerCase();

      return normalizedKey.includes('finding') || normalizedKey.includes('issue');
    });

    const dynamicValue = dynamicEntry?.[1];

    return Array.isArray(dynamicValue) ? (dynamicValue as unknown[]) : null;
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

export async function requestPoe(
  context: PoeRequestContext,
  messages: PoeMessage[],
): Promise<string> {
  const response = await fetch(context.apiUrl, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${context.apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: context.bot,
      messages,
      temperature: 0,
    }),
  });

  if (!response.ok) {
    const errorBody = await response.text();

    console.error('[poe] request failed', {
      provider: 'poe',
      status: response.status,
      statusText: response.statusText,
      apiUrl: context.apiUrl,
      model: context.bot,
      bodyLength: errorBody.length,
      bodyPreview: preview(errorBody),
    });

    throw new Error(`Poe request failed with status ${response.status}.`);
  }

  const payload = (await response.json()) as PoeCompletionResponse;

  return extractPoeText(payload);
}

async function repairPoeJson(
  context: PoeRequestContext,
  rawResponse: string,
  schemaName: string,
): Promise<string> {
  return requestPoe(context, [
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
  context: PoeRequestContext,
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
    provider: 'poe',
    apiUrl: context.apiUrl,
    model: context.bot,
    schemaName,
    issues: summarizeParseIssues(initial.result),
    rawLength: previewLength(rawResponse),
    rawPreview: preview(rawResponse),
    parsedCandidateType: typeof initial.parsedCandidate,
    normalizedType: typeof initial.normalized,
  });

  const repairedResponse = await repairPoeJson(context, rawResponse, schemaName);
  const repaired = parseCandidate(repairedResponse);

  if (repaired.result.success) {
    console.info('[poe] repair pass succeeded', {
      provider: 'poe',
      apiUrl: context.apiUrl,
      model: context.bot,
      schemaName,
      initialIssues: summarizeParseIssues(initial.result),
      repairedLength: previewLength(repairedResponse),
    });

    return repaired.result.data as T;
  }

  console.error('[poe] repair parse failed', {
    provider: 'poe',
    apiUrl: context.apiUrl,
    model: context.bot,
    schemaName,
    initialIssues: summarizeParseIssues(initial.result),
    repairIssues: summarizeParseIssues(repaired.result),
    rawLength: previewLength(rawResponse),
    rawPreview: preview(rawResponse),
    repairedLength: previewLength(repairedResponse),
    repairedPreview: preview(repairedResponse),
    parsedCandidateType: typeof repaired.parsedCandidate,
    normalizedType: typeof repaired.normalized,
  });

  throw new Error(`Poe returned invalid ${schemaName} JSON after repair attempt.`);
}

export async function parsePoeStageResponse(
  apiUrl: string,
  apiKey: string,
  bot: string,
  prompt: string,
): Promise<StageSegment[]> {
  const context = { apiUrl, apiKey, bot };

  const rawResponse = await requestPoe(context, [
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
    context,
    rawResponse,
    stageResponseSchema,
    'stage_response',
  );

  return parsed.segments;
}

export async function parsePoeQaResponse(
  apiUrl: string,
  apiKey: string,
  bot: string,
  prompt: string,
): Promise<Array<z.infer<typeof qaFindingSchema>>> {
  const context = { apiUrl, apiKey, bot };

  const rawResponse = await requestPoe(context, [
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
    context,
    rawResponse,
    qaResponseSchema,
    'qa_response',
  );

  return parsed.findings;
}
