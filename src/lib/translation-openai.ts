import {
  buildSegmentQaFindings,
  buildSourceAnalysis,
  buildStudioShellProject,
  splitSourceText,
  type SegmentDraft,
} from './pipeline';
import { buildQaPrompt, buildStageInput } from './translation-prompts';
import { translationWorkspaceRequestSchema } from './translation-schemas';
import {
  ensureStageCoverage,
  isOpenAIConfigured,
  parseQaResponse,
  parseStageResponse,
  toDrafts,
  type TranslationWorkspaceResponse,
} from './translation-openai-utils';
import type { TranslationWorkspaceSeed } from './workspace';

function buildAnalysisPrompt(seed: TranslationWorkspaceSeed, sourceSegments: string[]): string {
  return buildStageInput({
    seed,
    sourceSegments,
    stageName: 'source_analysis',
    instructions: [
      'Analyze each source segment before translation.',
      'Return one JSON object per source segment, in source order, with the index and concise analysis text.',
      'Call out tone, imagery, locked terms, and any obvious QA risks.',
    ],
    previousStages: {},
  });
}

function buildFaithfulPrompt(
  seed: TranslationWorkspaceSeed,
  sourceSegments: string[],
  analysisSegments: Array<{ index: number; text: string }>,
): string {
  return buildStageInput({
    seed,
    sourceSegments,
    stageName: 'faithful_translation',
    instructions: [
      'Translate each source segment faithfully into English.',
      'Keep canonical terminology and preserve paragraph order.',
      'Return one JSON object per source segment, in source order, with the index and translation draft.',
    ],
    previousStages: { source_analysis: analysisSegments },
  });
}

function buildVoicePrompt(
  seed: TranslationWorkspaceSeed,
  sourceSegments: string[],
  analysisSegments: Array<{ index: number; text: string }>,
  faithfulSegments: Array<{ index: number; text: string }>,
): string {
  return buildStageInput({
    seed,
    sourceSegments,
    stageName: 'voice_adaptation',
    instructions: [
      'Adapt each draft for voice and rhythm without changing meaning.',
      'Preserve tension, dialogue friction, and the authorial tone described in the reference.',
      'Return one JSON object per source segment, in source order, with the index and voice-adapted text.',
    ],
    previousStages: {
      source_analysis: analysisSegments,
      faithful_translation: faithfulSegments,
    },
  });
}

function buildPolishPrompt(prompt: {
  seed: TranslationWorkspaceSeed;
  sourceSegments: string[];
  analysisSegments: Array<{ index: number; text: string }>;
  faithfulSegments: Array<{ index: number; text: string }>;
  voiceSegments: Array<{ index: number; text: string }>;
}): string {
  return buildStageInput({
    seed: prompt.seed,
    sourceSegments: prompt.sourceSegments,
    stageName: 'polish_pass',
    instructions: [
      'Polish the voice-adapted drafts for readability and literary cadence.',
      'Do not introduce new meaning, new imagery, or softened tension.',
      'Return one JSON object per source segment, in source order, with the index and polished text.',
    ],
    previousStages: {
      source_analysis: prompt.analysisSegments,
      faithful_translation: prompt.faithfulSegments,
      voice_adaptation: prompt.voiceSegments,
    },
  });
}

async function translateWithOpenAI(seed: TranslationWorkspaceSeed): Promise<SegmentDraft[]> {
  const sourceSegments = splitSourceText(seed.sourceText);
  const analysisSegments = await parseStageResponse(
    'source_analysis',
    buildAnalysisPrompt(seed, sourceSegments),
  );
  ensureStageCoverage('source_analysis', sourceSegments, analysisSegments);

  const faithfulSegments = await parseStageResponse(
    'faithful_translation',
    buildFaithfulPrompt(seed, sourceSegments, analysisSegments),
  );
  ensureStageCoverage('faithful_translation', sourceSegments, faithfulSegments);

  const voiceSegments = await parseStageResponse(
    'voice_adaptation',
    buildVoicePrompt(seed, sourceSegments, analysisSegments, faithfulSegments),
  );
  ensureStageCoverage('voice_adaptation', sourceSegments, voiceSegments);

  const polishedSegments = await parseStageResponse(
    'polish_pass',
    buildPolishPrompt({
      seed,
      sourceSegments,
      analysisSegments,
      faithfulSegments,
      voiceSegments,
    }),
  );
  ensureStageCoverage('polish_pass', sourceSegments, polishedSegments);

  return toDrafts({
    sourceSegments,
    analysisSegments,
    faithfulSegments,
    voiceSegments,
    polishedSegments,
  });
}

async function finalizeWithQa(
  seed: TranslationWorkspaceSeed,
  drafts: SegmentDraft[],
): Promise<SegmentDraft[]> {
  const sourceSegments = splitSourceText(seed.sourceText);
  const findings = await parseQaResponse(
    buildQaPrompt(
      seed,
      sourceSegments.map((segment, index) => ({
        index,
        sourceText: segment,
        sourceAnalysis: drafts[index]?.sourceAnalysis ?? buildSourceAnalysis(segment),
        finalText: drafts[index]?.finalText ?? '',
      })),
    ),
  );
  const findingsByIndex = new Map<number, SegmentDraft['qaFindings']>();

  for (const finding of findings) {
    const existing = findingsByIndex.get(finding.segmentIndex) ?? [];

    existing.push({
      id: `qa-openai-${finding.segmentIndex}-${existing.length + 1}`,
      severity: finding.severity,
      category: finding.category,
      sourceExcerpt: finding.sourceExcerpt,
      targetExcerpt: finding.targetExcerpt,
      issue: finding.issue,
      suggestion: finding.suggestion,
      resolved: false,
    });

    findingsByIndex.set(finding.segmentIndex, existing);
  }

  return drafts.map((draft, index) => ({
    ...draft,
    qaFindings: [
      ...buildSegmentQaFindings(draft.sourceText, draft.finalText, index),
      ...(findingsByIndex.get(index) ?? []),
    ],
  }));
}

export async function runTranslationWorkspace(
  seed: TranslationWorkspaceSeed,
): Promise<TranslationWorkspaceResponse> {
  try {
    if (!seed.sourceText.trim()) {
      throw new Error('Source text is required.');
    }

    if (!isOpenAIConfigured) {
      return {
        project: buildStudioShellProject(seed),
        mode: 'fallback',
        message: 'OpenAI key is not configured, using local fallback.',
      };
    }

    const openaiDrafts = await translateWithOpenAI(seed);
    const draftsWithQa = await finalizeWithQa(seed, openaiDrafts);

    return {
      project: buildStudioShellProject(seed, draftsWithQa),
      mode: 'openai',
    };
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : 'Translation pipeline failed. Falling back to local drafts.';

    return {
      project: buildStudioShellProject(seed),
      mode: 'fallback',
      message,
    };
  }
}

export { translationWorkspaceRequestSchema };
