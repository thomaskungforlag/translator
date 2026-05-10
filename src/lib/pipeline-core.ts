import type { QAFinding } from '@/lib/domain';
import type { SegmentationStrategy } from './workspace';

import {
  buildFallbackFaithfulDraft as buildFallbackFaithfulDraftFromText,
  buildFallbackLiteraryNaturalnessDraft as buildFallbackLiteraryNaturalnessDraftFromText,
  buildFallbackPolishedDraft as buildFallbackPolishedDraftFromText,
  buildFallbackProfessionalLiteraryCopyeditDraft as buildFallbackProfessionalLiteraryCopyeditDraftFromText,
  buildFallbackVoiceDraft as buildFallbackVoiceDraftFromText,
  countSentences,
  findMemoryExample,
  hasSceneMarkers,
  splitByParagraphs as splitByParagraphsFromText,
  splitBySceneMarkers as splitBySceneMarkersFromText,
} from './pipeline-text';
import {
  buildSegmentQaFindings as buildCoreSegmentQaFindings,
  findLockedTerms,
} from './pipeline-qa';
import { redTwinReference } from './reference-material';

export type SegmentDraft = {
  sourceText: string;
  sourceAnalysis: string;
  translationDraft: string;
  voiceAdaptedDraft: string;
  literaryNaturalnessDraft: string;
  polishedDraft: string;
  professionalLiteraryCopyeditDraft: string;
  finalText: string;
  qaFindings: QAFinding[];
};

export function splitSourceText(
  sourceText: string,
  segmentationStrategy: SegmentationStrategy = 'paragraph',
): string[] {
  if (segmentationStrategy === 'scene_markers') {
    return splitBySceneMarkersFromText(sourceText);
  }

  if (segmentationStrategy === 'hybrid') {
    return hasSceneMarkers(sourceText)
      ? splitBySceneMarkersFromText(sourceText)
      : splitByParagraphsFromText(sourceText);
  }

  return splitByParagraphsFromText(sourceText);
}

export function buildSourceAnalysis(sourceText: string): string {
  const paragraphs = splitSourceText(sourceText);
  const memoryExample = findMemoryExample(sourceText);
  const lockedTerms = findLockedTerms(sourceText, redTwinReference.lockedTerms);
  const sentenceCount = countSentences(sourceText);
  const paragraphCount = paragraphs.length;
  const sentenceLabel = sentenceCount === 1 ? 'sentence' : 'sentences';
  const paragraphLabel = paragraphCount === 1 ? 'paragraph' : 'paragraphs';
  const lockedTermSummary =
    lockedTerms.length > 0
      ? `Locked terminology: ${lockedTerms.map((entry) => entry.targetTerm).join(', ')}.`
      : 'No locked terminology detected in this segment.';
  const memorySummary = memoryExample
    ? memoryExample.status === 'reviewed'
      ? `Reviewed translation memory is available: "${memoryExample.englishText}".`
      : `Translation memory seed exists, but it still needs QA: "${memoryExample.englishText}".`
    : 'No direct translation memory match found.';

  return [
    `Source prep: ${paragraphCount} ${paragraphLabel}, ${sentenceCount} ${sentenceLabel}.`,
    'Keep the prose grounded, concrete, and emotionally direct.',
    'Preserve the balance between domestic realism and speculative imagery.',
    lockedTermSummary,
    memorySummary,
  ].join(' ');
}

export function buildFaithfulDraft(sourceText: string): string {
  const memoryExample = findMemoryExample(sourceText);

  if (memoryExample) {
    return memoryExample.englishText;
  }

  return buildFallbackFaithfulDraftFromText(sourceText);
}

export function buildVoiceDraft(_sourceText: string, faithfulDraft: string): string {
  return buildFallbackVoiceDraftFromText(faithfulDraft);
}

export function buildLiteraryNaturalnessDraft(_sourceText: string, voiceDraft: string): string {
  return buildFallbackLiteraryNaturalnessDraftFromText(voiceDraft);
}

export function buildPolishedDraft(_sourceText: string, naturalnessDraft: string): string {
  return buildFallbackPolishedDraftFromText(naturalnessDraft);
}

export function buildProfessionalLiteraryCopyeditDraft(
  sourceText: string,
  polishedDraft: string,
): string {
  return buildFallbackProfessionalLiteraryCopyeditDraftFromText(sourceText, polishedDraft);
}

export function buildSegmentQaFindings(
  sourceText: string,
  finalText: string,
  segmentIndex = 0,
): QAFinding[] {
  return buildCoreSegmentQaFindings(sourceText, finalText, segmentIndex);
}

function buildSegmentDraft(sourceText: string, segmentIndex: number): SegmentDraft {
  const sourceAnalysis = buildSourceAnalysis(sourceText);
  const translationDraft = buildFaithfulDraft(sourceText);
  const voiceAdaptedDraft = buildVoiceDraft(sourceText, translationDraft);
  const literaryNaturalnessDraft = buildLiteraryNaturalnessDraft(sourceText, voiceAdaptedDraft);
  const polishedDraft = buildPolishedDraft(sourceText, literaryNaturalnessDraft);
  const professionalLiteraryCopyeditDraft = buildProfessionalLiteraryCopyeditDraft(
    sourceText,
    polishedDraft,
  );
  const finalText = professionalLiteraryCopyeditDraft;
  const qaFindings = buildSegmentQaFindings(sourceText, finalText, segmentIndex);

  return {
    sourceText,
    sourceAnalysis,
    translationDraft,
    voiceAdaptedDraft,
    literaryNaturalnessDraft,
    polishedDraft,
    professionalLiteraryCopyeditDraft,
    finalText,
    qaFindings,
  };
}

export function createSegmentDrafts(
  sourceText: string,
  segmentationStrategy: SegmentationStrategy = 'paragraph',
): SegmentDraft[] {
  return splitSourceText(sourceText, segmentationStrategy).map((paragraph, index) =>
    buildSegmentDraft(paragraph, index),
  );
}
