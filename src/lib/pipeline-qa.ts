import type { GlossaryEntry, QAFinding } from '@/lib/domain';

import { redTwinReference } from './reference-material';

function findMemoryExample(sourceText: string) {
  return redTwinReference.translationMemory.find((example) => example.sourceText === sourceText);
}

function buildLockedTermFinding(
  sourceText: string,
  targetText: string,
  segmentIndex: number,
): QAFinding | null {
  const lockedTerm = redTwinReference.lockedTerms.find((entry) =>
    sourceText.includes(entry.sourceTerm),
  );

  if (!lockedTerm) {
    return null;
  }

  const targetTerm = lockedTerm.targetTerm;
  const targetTermRegex = new RegExp(`\\b${targetTerm.replaceAll(' ', '\\s+')}\\b`, 'i');

  if (targetTermRegex.test(targetText)) {
    if (targetText.includes(targetTerm)) {
      return null;
    }

    return {
      id: `qa-lock-${segmentIndex}-${lockedTerm.id}`,
      severity: 'warning',
      category: 'terminology',
      sourceExcerpt: lockedTerm.sourceTerm,
      targetExcerpt: targetTerm,
      issue: `Locked term "${lockedTerm.sourceTerm}" should use the canonical capitalization "${targetTerm}".`,
      suggestion: `Normalize to "${targetTerm}".`,
      resolved: false,
    };
  }

  return {
    id: `qa-lock-${segmentIndex}-${lockedTerm.id}`,
    severity: 'critical',
    category: 'terminology',
    sourceExcerpt: lockedTerm.sourceTerm,
    issue: `Locked term "${lockedTerm.sourceTerm}" is missing from the English draft.`,
    suggestion: `Use the canonical translation "${targetTerm}".`,
    resolved: false,
  };
}

function buildMemoryReviewFinding(
  sourceText: string,
  finalText: string,
  segmentIndex: number,
): QAFinding | null {
  const memoryExample = findMemoryExample(sourceText);

  if (!memoryExample || memoryExample.status !== 'needs_qa') {
    return null;
  }

  return {
    id: `qa-memory-${segmentIndex}-${sourceText.length}`,
    severity: 'warning',
    category: 'style_drift',
    sourceExcerpt: sourceText,
    targetExcerpt: finalText,
    issue: 'This translation memory example is useful, but it still needs QA before approval.',
    suggestion: memoryExample.note,
    resolved: false,
  };
}

function buildFormattingFinding(
  sourceText: string,
  finalText: string,
  segmentIndex: number,
): QAFinding | null {
  const sourceParagraphs = splitParagraphs(sourceText).length;
  const targetParagraphs = splitParagraphs(finalText).length;

  if (sourceParagraphs === targetParagraphs) {
    return null;
  }

  return {
    id: `qa-format-${segmentIndex}-${sourceText.length}`,
    severity: 'warning',
    category: 'formatting',
    sourceExcerpt: sourceText,
    targetExcerpt: finalText,
    issue: 'Paragraph structure changed between source and translation.',
    suggestion:
      'Preserve paragraph breaks unless the source requires a deliberate structural change.',
    resolved: false,
  };
}

function splitParagraphs(sourceText: string): string[] {
  return sourceText
    .trim()
    .split(/\n{2,}/)
    .map((paragraph) => paragraph.trim().replace(/\s+/g, ' '))
    .filter(Boolean);
}

export function buildSegmentQaFindings(
  sourceText: string,
  finalText: string,
  segmentIndex = 0,
): QAFinding[] {
  return [
    buildLockedTermFinding(sourceText, finalText, segmentIndex),
    buildMemoryReviewFinding(sourceText, finalText, segmentIndex),
    buildFormattingFinding(sourceText, finalText, segmentIndex),
  ].filter((finding): finding is QAFinding => finding !== null);
}

export function findLockedTerms(sourceText: string, lockedTerms: GlossaryEntry[]): GlossaryEntry[] {
  return lockedTerms.filter((entry) => sourceText.includes(entry.sourceTerm));
}
