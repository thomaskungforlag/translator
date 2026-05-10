import type { QAFinding } from '@/lib/domain';

import { redTwinReference } from './reference-material';
import {
  buildSegmentQaFindings as buildCoreSegmentQaFindings,
  findLockedTerms,
} from './pipeline-qa';

export type SegmentDraft = {
  sourceText: string;
  sourceAnalysis: string;
  translationDraft: string;
  voiceAdaptedDraft: string;
  literaryNaturalnessDraft: string;
  polishedDraft: string;
  finalText: string;
  qaFindings: QAFinding[];
};

const paragraphSeparator = /\n{2,}/;

const knownTranslationMemory = new Map(
  redTwinReference.translationMemory.map((example) => [example.sourceText, example]),
);

const faithfulPhraseMap = new Map<string, string>([
  [
    'Det hade börjat snöa när hon såg ljuset igen.',
    'It had started to snow when she saw the light again.',
  ],
  ['Han visste att det var för sent att ringa tillbaka.', 'He knew it was too late to call back.'],
  [
    'Någonstans längre bort svarade Skuggskeppet i mörkret.',
    'Somewhere farther away, The Shadow Ship answered in the dark.',
  ],
]);

const voicePhraseMap = new Map<string, string>([
  [
    'It had started to snow when she saw the light again.',
    'Snow was beginning to fall when she saw the light again.',
  ],
  ['He knew it was too late to call back.', 'He knew it was already too late to call back.'],
  [
    'Somewhere farther away, The Shadow Ship answered in the dark.',
    'Somewhere farther away, The Shadow Ship answered from the dark.',
  ],
]);

const polishedPhraseMap = new Map<string, string>([
  [
    'Snow was beginning to fall when she saw the light again.',
    'Snow had begun to fall when she saw the light again.',
  ],
  [
    'Snow had started to fall when she saw the light again.',
    'Snow had begun to fall when she saw the light again.',
  ],
  [
    'He knew it was already too late to call back.',
    'He knew it was already too late to call back.',
  ],
  [
    'Somewhere farther away, The Shadow Ship answered from the dark.',
    'Somewhere farther away, The Shadow Ship answered from the dark.',
  ],
]);

const naturalnessPhraseMap = new Map<string, string>([
  [
    'Snow was beginning to fall when she saw the light again.',
    'Snow had started to fall when she saw the light again.',
  ],
  [
    'He knew it was already too late to call back.',
    'He knew it was already too late to call back.',
  ],
  [
    'Somewhere farther away, The Shadow Ship answered from the dark.',
    'Somewhere farther away, The Shadow Ship answered out of the dark.',
  ],
]);

function trimParagraph(paragraph: string): string {
  return paragraph.trim().replace(/\s+/g, ' ');
}

function countSentences(sourceText: string): number {
  const sentenceCount = sourceText
    .split(/[.!?]+/)
    .map((sentence) => sentence.trim())
    .filter(Boolean).length;

  return sentenceCount > 0 ? sentenceCount : 1;
}

function findMemoryExample(sourceText: string) {
  return knownTranslationMemory.get(sourceText);
}

function replaceExactPhrase(sourceText: string, phraseMap: Map<string, string>): string {
  const exactReplacement = phraseMap.get(sourceText);

  if (exactReplacement) {
    return exactReplacement;
  }

  return Array.from(phraseMap.entries()).reduce((translated, [sourcePhrase, targetPhrase]) => {
    if (!translated.includes(sourcePhrase)) {
      return translated;
    }

    return translated.replaceAll(sourcePhrase, targetPhrase);
  }, sourceText);
}

function buildFallbackFaithfulDraft(sourceText: string): string {
  return replaceExactPhrase(sourceText, faithfulPhraseMap);
}

function buildFallbackVoiceDraft(faithfulDraft: string): string {
  return replaceExactPhrase(faithfulDraft, voicePhraseMap);
}

function buildFallbackPolishedDraft(voiceDraft: string): string {
  return replaceExactPhrase(voiceDraft, polishedPhraseMap);
}

function buildFallbackLiteraryNaturalnessDraft(voiceDraft: string): string {
  return replaceExactPhrase(voiceDraft, naturalnessPhraseMap);
}

export function splitSourceText(sourceText: string): string[] {
  return sourceText.trim().split(paragraphSeparator).map(trimParagraph).filter(Boolean);
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

  return buildFallbackFaithfulDraft(sourceText);
}

export function buildVoiceDraft(sourceText: string, faithfulDraft: string): string {
  const memoryExample = findMemoryExample(sourceText);

  if (memoryExample?.englishText === faithfulDraft) {
    return replaceExactPhrase(faithfulDraft, voicePhraseMap);
  }

  return buildFallbackVoiceDraft(faithfulDraft);
}

export function buildLiteraryNaturalnessDraft(sourceText: string, voiceDraft: string): string {
  const memoryExample = findMemoryExample(sourceText);

  if (memoryExample?.englishText === voiceDraft) {
    return replaceExactPhrase(voiceDraft, naturalnessPhraseMap);
  }

  return buildFallbackLiteraryNaturalnessDraft(voiceDraft);
}

export function buildPolishedDraft(sourceText: string, naturalnessDraft: string): string {
  const memoryExample = findMemoryExample(sourceText);

  if (memoryExample?.englishText === naturalnessDraft) {
    return replaceExactPhrase(naturalnessDraft, polishedPhraseMap);
  }

  return buildFallbackPolishedDraft(naturalnessDraft);
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
  const finalText = polishedDraft;
  const qaFindings = buildSegmentQaFindings(sourceText, finalText, segmentIndex);

  return {
    sourceText,
    sourceAnalysis,
    translationDraft,
    voiceAdaptedDraft,
    literaryNaturalnessDraft,
    polishedDraft,
    finalText,
    qaFindings,
  };
}

export function createSegmentDrafts(sourceText: string): SegmentDraft[] {
  return splitSourceText(sourceText).map((paragraph, index) => buildSegmentDraft(paragraph, index));
}
