import OpenAI from 'openai';
import { zodTextFormat } from 'openai/helpers/zod';
import { z } from 'zod';

import { env } from '@/lib/env';
import { languageCodeValues } from '@/lib/domain';

import { buildStudioShellProject, splitSourceText, type SegmentDraft } from './pipeline';
import type { StudioShellProject, TranslationWorkspaceSeed } from './workspace';

const translationDraftSchema = z.object({
  sourceText: z.string().min(1),
  translationDraft: z.string().min(1),
  voiceAdaptedDraft: z.string().min(1),
  polishedDraft: z.string().min(1),
  finalText: z.string().min(1),
});

const translationResponseSchema = z.object({
  segments: z.array(translationDraftSchema).min(1),
});

export const translationWorkspaceRequestSchema = z.object({
  projectId: z.string().min(1),
  title: z.string().min(1),
  contentType: z.enum([
    'novel_chapter',
    'short_story',
    'blurb',
    'website_copy',
    'newsletter',
    'social_post',
  ]),
  sourceLanguageCode: z.enum(languageCodeValues),
  targetLanguage: z.object({
    code: z.enum(languageCodeValues),
    label: z.string().min(1),
    locale: z.string().min(1),
    translationNotes: z.array(z.string()),
    dialogueRules: z.array(z.string()),
    punctuationRules: z.array(z.string()),
    marketQualityNotes: z.array(z.string()),
  }),
  sourceText: z.string().min(1),
  glossary: z.array(
    z.object({
      id: z.string().min(1),
      sourceTerm: z.string().min(1),
      targetTerm: z.string().min(1),
      category: z.enum(['character', 'place', 'technology', 'worldbuilding', 'phrase', 'other']),
      notes: z.string().optional(),
      locked: z.boolean(),
    }),
  ),
});

type TranslationWorkspaceResponse = {
  project: StudioShellProject;
  mode: 'openai' | 'fallback';
  message?: string;
};

const openaiClient = env.OPENAI_API_KEY ? new OpenAI({ apiKey: env.OPENAI_API_KEY }) : null;
const openaiModel = env.OPENAI_MODEL ?? 'gpt-4.1-mini';

function buildTranslationInput(seed: TranslationWorkspaceSeed): string {
  return JSON.stringify(
    {
      sourceLanguageCode: seed.sourceLanguageCode,
      targetLanguage: seed.targetLanguage.label,
      contentType: seed.contentType,
      sourceTextSegments: splitSourceText(seed.sourceText),
      glossary: seed.glossary,
      instructions: [
        'Produce faithful, voice-aware literary English.',
        'Return one draft object per source segment in the same order.',
        'Keep locked glossary terms capitalized exactly as specified.',
        'Do not add commentary or markdown.',
      ],
    },
    null,
    2,
  );
}

async function translateWithOpenAI(seed: TranslationWorkspaceSeed): Promise<StudioShellProject> {
  if (!openaiClient) {
    return buildStudioShellProject(seed);
  }

  const sourceSegments = splitSourceText(seed.sourceText);
  const response = await openaiClient.responses.parse({
    model: openaiModel,
    input: [
      {
        role: 'system',
        content:
          'You are a literary translation engine for Swedish fiction. Output only structured JSON.',
      },
      {
        role: 'user',
        content: buildTranslationInput(seed),
      },
    ],
    text: {
      format: zodTextFormat(translationResponseSchema, 'translation_pipeline'),
    },
  });

  if (!response.output_parsed) {
    throw new Error('OpenAI returned no structured output.');
  }

  const drafts: SegmentDraft[] = response.output_parsed.segments;

  if (drafts.length !== sourceSegments.length) {
    throw new Error('OpenAI returned a different number of segments than the source text.');
  }

  return buildStudioShellProject(seed, drafts);
}

export async function runTranslationWorkspace(
  seed: TranslationWorkspaceSeed,
): Promise<TranslationWorkspaceResponse> {
  try {
    const project = await translateWithOpenAI(seed);

    return {
      project,
      mode: openaiClient ? 'openai' : 'fallback',
      message: openaiClient ? undefined : 'OpenAI key is not configured, using local fallback.',
    };
  } catch (error) {
    const project = buildStudioShellProject(seed);
    const message =
      error instanceof Error
        ? error.message
        : 'Translation pipeline failed. Falling back to local drafts.';

    return {
      project,
      mode: 'fallback',
      message,
    };
  }
}
