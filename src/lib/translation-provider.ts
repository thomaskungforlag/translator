import {
  buildFaithfulDraft,
  buildLiteraryNaturalnessDraft,
  buildPolishedDraft,
  buildProfessionalLiteraryCopyeditDraft,
  buildSegmentQaFindings,
  buildSourceAnalysis,
  buildStudioShellProject,
  splitSourceText,
  type SegmentDraft,
  buildVoiceDraft,
} from './pipeline';
import { buildQaPrompt, buildStageInput } from './translation-prompts';
import { translationWorkspaceRequestSchema } from './translation-schemas';
import {
  activeProviderMode,
  ensureStageCoverage,
  getSuspiciousStageIndexes,
  isLlmConfigured,
  parseQaResponse,
  parseStageResponse,
  toDrafts,
  type TranslationWorkspaceResponse,
} from './translation-provider-utils';
import type { TranslationWorkspaceSeed } from './workspace';

type IndexedTextSegment = { index: number; text: string };

type ChunkDescriptor = {
  start: number;
  segments: string[];
};

type TranslationStageName =
  | 'source_analysis'
  | 'faithful_translation'
  | 'voice_adaptation'
  | 'literary_naturalness'
  | 'polish_pass'
  | 'professional_literary_copyedit';

const stageChunkSize = 8;

function formatWarningMessage(warnings: string[]): string | undefined {
  if (warnings.length === 0) {
    return undefined;
  }

  const uniqueWarnings = Array.from(new Set(warnings));
  const preview = uniqueWarnings.slice(0, 2).join(' ');

  if (uniqueWarnings.length === 1) {
    return `${preview} Review impacted segments before publishing.`;
  }

  return `${preview} ${uniqueWarnings.length - 2 > 0 ? `(${uniqueWarnings.length - 2} additional warning${uniqueWarnings.length - 2 > 1 ? 's' : ''}.) ` : ''}Review impacted segments before publishing.`;
}

function previewChunkSegments(segments: string[]): string[] {
  return segments.slice(0, 2).map((segment) => segment.slice(0, 180));
}

function logChunkFallback(args: {
  stageName: TranslationStageName;
  chunkStart: number;
  chunkSize: number;
  sourceSegments: string[];
  reason: string;
  recoveredByFallback: boolean;
  suspiciousIndexes?: number[];
}): void {
  const chunkEnd = args.chunkStart + args.chunkSize - 1;

  console.warn('[translation] stage fallback', {
    provider: activeProviderMode,
    stageName: args.stageName,
    chunkRange: `${args.chunkStart}-${chunkEnd}`,
    chunkSize: args.chunkSize,
    sourcePreview: previewChunkSegments(args.sourceSegments),
    recoveredByFallback: args.recoveredByFallback,
    suspiciousIndexes: args.suspiciousIndexes ?? [],
    reason: args.reason,
  });
}

function splitIntoChunks(sourceSegments: string[], chunkSize = stageChunkSize): ChunkDescriptor[] {
  const chunks: ChunkDescriptor[] = [];

  for (let start = 0; start < sourceSegments.length; start += chunkSize) {
    chunks.push({
      start,
      segments: sourceSegments.slice(start, start + chunkSize),
    });
  }

  return chunks;
}

function toLocalIndexedSegments(
  segments: IndexedTextSegment[],
  chunkStart: number,
  chunkLength: number,
): IndexedTextSegment[] {
  return segments.slice(chunkStart, chunkStart + chunkLength).map((segment, localIndex) => ({
    index: localIndex,
    text: segment.text,
  }));
}

async function runChunkedStage(args: {
  stageName: TranslationStageName;
  sourceSegments: string[];
  buildChunkPrompt: (chunk: ChunkDescriptor) => Promise<string>;
  fallbackSegmentText: (sourceText: string, absoluteIndex: number) => string;
  onWarning?: (warning: string) => void;
  ensureTranslated?: boolean;
}): Promise<IndexedTextSegment[]> {
  const chunks = splitIntoChunks(args.sourceSegments);
  const chunkedResults = await Promise.all(
    chunks.map(async (chunk) => {
      try {
        const prompt = await args.buildChunkPrompt(chunk);
        const stageSegments = await parseStageResponse(args.stageName, prompt);

        ensureStageCoverage(args.stageName, activeProviderMode, chunk.segments, stageSegments);

        if (args.ensureTranslated) {
          const suspiciousIndexes = getSuspiciousStageIndexes(chunk.segments, stageSegments);

          if (suspiciousIndexes.length > 0) {
            const suspiciousIndexSet = new Set(suspiciousIndexes);
            const reason = `Model output for ${args.stageName} appears untranslated in segment index(es): ${suspiciousIndexes.slice(0, 8).join(', ')}.`;

            logChunkFallback({
              stageName: args.stageName,
              chunkStart: chunk.start,
              chunkSize: chunk.segments.length,
              sourceSegments: chunk.segments,
              reason,
              recoveredByFallback: true,
              suspiciousIndexes,
            });

            args.onWarning?.(
              `${args.stageName} recovered with local fallback for source segment index(es): ${chunk.start}-${chunk.start + chunk.segments.length - 1}. Reason: ${reason}`,
            );

            return stageSegments.map((segment) => {
              const absoluteIndex = segment.index + chunk.start;

              if (!suspiciousIndexSet.has(segment.index)) {
                return {
                  index: absoluteIndex,
                  text: segment.text,
                };
              }

              const sourceText = chunk.segments[segment.index] ?? '';

              return {
                index: absoluteIndex,
                text: args.fallbackSegmentText(sourceText, absoluteIndex),
              };
            });
          }
        }

        return stageSegments.map((segment) => ({
          index: segment.index + chunk.start,
          text: segment.text,
        }));
      } catch (error) {
        const reason = error instanceof Error ? error.message : String(error);

        logChunkFallback({
          stageName: args.stageName,
          chunkStart: chunk.start,
          chunkSize: chunk.segments.length,
          sourceSegments: chunk.segments,
          reason,
          recoveredByFallback: true,
        });

        args.onWarning?.(
          `${args.stageName} recovered with local fallback for source segment index(es): ${chunk.start}-${chunk.start + chunk.segments.length - 1}. Reason: ${reason}`,
        );

        return chunk.segments.map((sourceText, localIndex) => {
          const absoluteIndex = chunk.start + localIndex;

          return {
            index: absoluteIndex,
            text: args.fallbackSegmentText(sourceText, absoluteIndex),
          };
        });
      }
    }),
  );

  return chunkedResults
    .flat()
    .sort((left, right) => left.index - right.index)
    .map((segment, index) => ({
      index,
      text: segment.text,
    }));
}

function buildAnalysisPrompt(
  seed: TranslationWorkspaceSeed,
  sourceSegments: string[],
): Promise<string> {
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
): Promise<string> {
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
): Promise<string> {
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

function buildLiteraryNaturalnessPrompt(prompt: {
  seed: TranslationWorkspaceSeed;
  sourceSegments: string[];
  analysisSegments: Array<{ index: number; text: string }>;
  faithfulSegments: Array<{ index: number; text: string }>;
  voiceSegments: Array<{ index: number; text: string }>;
}): Promise<string> {
  return buildStageInput({
    seed: prompt.seed,
    sourceSegments: prompt.sourceSegments,
    stageName: 'literary_naturalness',
    instructions: [
      'Revise each voice-adapted segment into natural literary English while preserving source meaning and paragraph structure.',
      'Preserve emotional restraint, Scandinavian tonal quality, sci-fi atmosphere, character perspective, and intentional rhythm, ambiguity, and subtext.',
      "When revising, pay special attention to Swedish tense/aspect and close third-person perspective. Some Swedish past-tense constructions express a character's expectation, hope, or emotional certainty about what will happen next. Do not flatten these into English progressive constructions. Choose English tense/aspect that preserves the character's felt meaning.",
      'Improve stiffness from literal transfer: Swedish-like syntax, awkward articles/pronouns, unnatural collocations, flat literal choices, weak verbs, and accidental melodrama.',
      'Do not add meaning, explain subtext, genericize voice, or smooth away intentional starkness.',
      'Return one JSON object per source segment, in source order, with the index and naturalness-revised text.',
    ],
    previousStages: {
      source_analysis: prompt.analysisSegments,
      faithful_translation: prompt.faithfulSegments,
      voice_adaptation: prompt.voiceSegments,
    },
  });
}

function buildPolishPrompt(prompt: {
  seed: TranslationWorkspaceSeed;
  sourceSegments: string[];
  analysisSegments: Array<{ index: number; text: string }>;
  faithfulSegments: Array<{ index: number; text: string }>;
  voiceSegments: Array<{ index: number; text: string }>;
  naturalnessSegments: Array<{ index: number; text: string }>;
}): Promise<string> {
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
      literary_naturalness: prompt.naturalnessSegments,
    },
  });
}

function buildProfessionalCopyeditPrompt(prompt: {
  seed: TranslationWorkspaceSeed;
  sourceSegments: string[];
  analysisSegments: Array<{ index: number; text: string }>;
  faithfulSegments: Array<{ index: number; text: string }>;
  voiceSegments: Array<{ index: number; text: string }>;
  naturalnessSegments: Array<{ index: number; text: string }>;
  polishedSegments: Array<{ index: number; text: string }>;
}): Promise<string> {
  return buildStageInput({
    seed: prompt.seed,
    sourceSegments: prompt.sourceSegments,
    stageName: 'professional_literary_copyedit',
    instructions: [
      'Perform a minimal professional literary copyedit on each polished segment.',
      'Apply only high-value precision edits: grammar flow, punctuation flow, idiomatic sharpness, and removal of residual translation stiffness.',
      'Preserve source meaning, paragraph structure, emotional restraint, and Thomas Kung voice.',
      'Do not add new imagery, simplify away subtext, or rewrite aggressively.',
      'Return one JSON object per source segment, in source order, with the index and copyedited text.',
    ],
    previousStages: {
      source_analysis: prompt.analysisSegments,
      faithful_translation: prompt.faithfulSegments,
      voice_adaptation: prompt.voiceSegments,
      literary_naturalness: prompt.naturalnessSegments,
      polish_pass: prompt.polishedSegments,
    },
  });
}

async function translateWithProvider(seed: TranslationWorkspaceSeed): Promise<{
  drafts: SegmentDraft[];
  warnings: string[];
}> {
  const warnings: string[] = [];
  const pushWarning = (warning: string): void => {
    warnings.push(warning);
  };
  const sourceSegments = splitSourceText(seed.sourceText, seed.segmentationStrategy);
  const analysisSegments = await runChunkedStage({
    stageName: 'source_analysis',
    sourceSegments,
    buildChunkPrompt: (chunk) => buildAnalysisPrompt(seed, chunk.segments),
    fallbackSegmentText: (sourceText) => buildSourceAnalysis(sourceText),
    onWarning: pushWarning,
  });

  const faithfulSegments = await runChunkedStage({
    stageName: 'faithful_translation',
    sourceSegments,
    buildChunkPrompt: (chunk) =>
      buildFaithfulPrompt(
        seed,
        chunk.segments,
        toLocalIndexedSegments(analysisSegments, chunk.start, chunk.segments.length),
      ),
    fallbackSegmentText: (sourceText) => buildFaithfulDraft(sourceText),
    onWarning: pushWarning,
    ensureTranslated: true,
  });

  const voiceSegments = await runChunkedStage({
    stageName: 'voice_adaptation',
    sourceSegments,
    buildChunkPrompt: (chunk) =>
      buildVoicePrompt(
        seed,
        chunk.segments,
        toLocalIndexedSegments(analysisSegments, chunk.start, chunk.segments.length),
        toLocalIndexedSegments(faithfulSegments, chunk.start, chunk.segments.length),
      ),
    fallbackSegmentText: (sourceText, absoluteIndex) =>
      buildVoiceDraft(
        sourceText,
        faithfulSegments[absoluteIndex]?.text ?? buildFaithfulDraft(sourceText),
      ),
    onWarning: pushWarning,
    ensureTranslated: true,
  });

  const naturalnessSegments = await runChunkedStage({
    stageName: 'literary_naturalness',
    sourceSegments,
    buildChunkPrompt: (chunk) =>
      buildLiteraryNaturalnessPrompt({
        seed,
        sourceSegments: chunk.segments,
        analysisSegments: toLocalIndexedSegments(
          analysisSegments,
          chunk.start,
          chunk.segments.length,
        ),
        faithfulSegments: toLocalIndexedSegments(
          faithfulSegments,
          chunk.start,
          chunk.segments.length,
        ),
        voiceSegments: toLocalIndexedSegments(voiceSegments, chunk.start, chunk.segments.length),
      }),
    fallbackSegmentText: (sourceText, absoluteIndex) =>
      buildLiteraryNaturalnessDraft(
        sourceText,
        voiceSegments[absoluteIndex]?.text ??
          buildVoiceDraft(
            sourceText,
            faithfulSegments[absoluteIndex]?.text ?? buildFaithfulDraft(sourceText),
          ),
      ),
    onWarning: pushWarning,
    ensureTranslated: true,
  });

  const polishedSegments = await runChunkedStage({
    stageName: 'polish_pass',
    sourceSegments,
    buildChunkPrompt: (chunk) =>
      buildPolishPrompt({
        seed,
        sourceSegments: chunk.segments,
        analysisSegments: toLocalIndexedSegments(
          analysisSegments,
          chunk.start,
          chunk.segments.length,
        ),
        faithfulSegments: toLocalIndexedSegments(
          faithfulSegments,
          chunk.start,
          chunk.segments.length,
        ),
        voiceSegments: toLocalIndexedSegments(voiceSegments, chunk.start, chunk.segments.length),
        naturalnessSegments: toLocalIndexedSegments(
          naturalnessSegments,
          chunk.start,
          chunk.segments.length,
        ),
      }),
    fallbackSegmentText: (sourceText, absoluteIndex) =>
      buildPolishedDraft(
        sourceText,
        naturalnessSegments[absoluteIndex]?.text ??
          buildLiteraryNaturalnessDraft(
            sourceText,
            voiceSegments[absoluteIndex]?.text ??
              buildVoiceDraft(
                sourceText,
                faithfulSegments[absoluteIndex]?.text ?? buildFaithfulDraft(sourceText),
              ),
          ),
      ),
    onWarning: pushWarning,
    ensureTranslated: true,
  });

  const professionalCopyeditSegments = await runChunkedStage({
    stageName: 'professional_literary_copyedit',
    sourceSegments,
    buildChunkPrompt: (chunk) =>
      buildProfessionalCopyeditPrompt({
        seed,
        sourceSegments: chunk.segments,
        analysisSegments: toLocalIndexedSegments(
          analysisSegments,
          chunk.start,
          chunk.segments.length,
        ),
        faithfulSegments: toLocalIndexedSegments(
          faithfulSegments,
          chunk.start,
          chunk.segments.length,
        ),
        voiceSegments: toLocalIndexedSegments(voiceSegments, chunk.start, chunk.segments.length),
        naturalnessSegments: toLocalIndexedSegments(
          naturalnessSegments,
          chunk.start,
          chunk.segments.length,
        ),
        polishedSegments: toLocalIndexedSegments(
          polishedSegments,
          chunk.start,
          chunk.segments.length,
        ),
      }),
    fallbackSegmentText: (sourceText, absoluteIndex) =>
      buildProfessionalLiteraryCopyeditDraft(
        sourceText,
        polishedSegments[absoluteIndex]?.text ??
          buildPolishedDraft(
            sourceText,
            naturalnessSegments[absoluteIndex]?.text ??
              buildLiteraryNaturalnessDraft(
                sourceText,
                voiceSegments[absoluteIndex]?.text ??
                  buildVoiceDraft(
                    sourceText,
                    faithfulSegments[absoluteIndex]?.text ?? buildFaithfulDraft(sourceText),
                  ),
              ),
          ),
      ),
    onWarning: pushWarning,
    ensureTranslated: true,
  });

  return {
    drafts: toDrafts({
      sourceSegments,
      analysisSegments,
      faithfulSegments,
      voiceSegments,
      naturalnessSegments,
      polishedSegments,
      professionalCopyeditSegments,
    }),
    warnings,
  };
}

async function finalizeWithQa(
  seed: TranslationWorkspaceSeed,
  drafts: SegmentDraft[],
  warnings: string[],
): Promise<SegmentDraft[]> {
  const sourceSegments = splitSourceText(seed.sourceText, seed.segmentationStrategy);
  const qaChunks = splitIntoChunks(sourceSegments);
  const findings = (
    await Promise.allSettled(
      qaChunks.map(async (chunk) => {
        const prompt = await buildQaPrompt(
          seed,
          chunk.segments.map((segment, localIndex) => {
            const index = chunk.start + localIndex;

            return {
              index: localIndex,
              sourceText: segment,
              sourceAnalysis: drafts[index]?.sourceAnalysis ?? buildSourceAnalysis(segment),
              finalText: drafts[index]?.finalText ?? '',
            };
          }),
        );
        const chunkFindings = await parseQaResponse(prompt);

        return chunkFindings.map((finding) => ({
          ...finding,
          segmentIndex: finding.segmentIndex + chunk.start,
        }));
      }),
    )
  ).flatMap((result, chunkIndex) => {
    if (result.status === 'fulfilled') {
      return result.value;
    }

    const chunk = qaChunks[chunkIndex];
    const reason =
      result.reason instanceof Error ? result.reason.message : String(result.reason ?? 'Unknown');

    warnings.push(
      `qa_review recovered without model findings for source segment index(es): ${chunk.start}-${chunk.start + chunk.segments.length - 1}. Reason: ${reason}`,
    );

    return [];
  });
  const findingsByIndex = new Map<number, SegmentDraft['qaFindings']>();

  for (const finding of findings) {
    const existing = findingsByIndex.get(finding.segmentIndex) ?? [];

    existing.push({
      id: `qa-provider-${finding.segmentIndex}-${existing.length + 1}`,
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

    if (!isLlmConfigured) {
      return {
        project: buildStudioShellProject(seed),
        mode: 'fallback',
        message:
          'The configured model provider is unavailable. Showing demo fallback drafts only; do not treat them as production translation.',
      };
    }

    const { drafts, warnings } = await translateWithProvider(seed);
    const draftsWithQa = await finalizeWithQa(seed, drafts, warnings);

    return {
      project: buildStudioShellProject(seed, draftsWithQa),
      mode: activeProviderMode,
      message: formatWarningMessage(warnings),
    };
  } catch (error) {
    console.error('[translation] pipeline failed, returning fallback', {
      provider: activeProviderMode,
      projectId: seed.projectId,
      title: seed.title,
      sourceLength: seed.sourceText.length,
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
    });

    const message =
      error instanceof Error
        ? error.message
        : 'Translation pipeline failed. Falling back to local drafts.';

    return {
      project: buildStudioShellProject(seed),
      mode: 'fallback',
      message: `${message} Showing demo fallback drafts only; review before use.`,
    };
  }
}

export { translationWorkspaceRequestSchema };
