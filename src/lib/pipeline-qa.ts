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

function buildTenseAspectDriftFinding(
  sourceText: string,
  finalText: string,
  segmentIndex: number,
): QAFinding | null {
  const sourceSignalsExpectation = /allt\s+blev\s+b[aä]ttre\s+nu/i.test(sourceText);
  const targetUsesProgressive = /\beverything\s+was\s+getting\s+better\s+now\b/i.test(finalText);

  if (!sourceSignalsExpectation || !targetUsesProgressive) {
    return null;
  }

  return {
    id: `qa-tense-${segmentIndex}-${sourceText.length}`,
    severity: 'warning',
    category: 'tense_aspect_drift',
    sourceExcerpt: 'Allt blev battre nu.',
    targetExcerpt: 'Everything was getting better now.',
    issue:
      "Tense/aspect shifts close-perspective hope into ongoing action, weakening the character's felt expectation.",
    suggestion: 'Use future-oriented expectation, e.g. "Everything was going to be better now."',
    resolved: false,
  };
}

function buildImageDriftFinding(
  sourceText: string,
  finalText: string,
  segmentIndex: number,
): QAFinding | null {
  if (/tuyas\s+oron\s+skar|tuyas\s+o?ron\s+skar/i.test(sourceText)) {
    if (/ears\s+stung/i.test(finalText)) {
      return {
        id: `qa-image-${segmentIndex}-${sourceText.length}-ears-stung`,
        severity: 'warning',
        category: 'image_drift',
        sourceExcerpt: 'Tuyas oron skar ...',
        targetExcerpt: "Tuya's ears stung ...",
        issue:
          'The sensory image is softened; "stung" weakens the sharp physical shock in the source.',
        suggestion:
          'Use a sharper sensory rendering, e.g. "The sound cut through Tuya\'s ears ..."',
        resolved: false,
      };
    }

    if (/ears\s+rang/i.test(finalText)) {
      return {
        id: `qa-image-${segmentIndex}-${sourceText.length}-ears-rang`,
        severity: 'info',
        category: 'image_drift',
        sourceExcerpt: 'Tuyas oron skar ...',
        targetExcerpt: "Tuya's ears rang ...",
        issue:
          'The rendering is acceptable but may still blunt the source image; review whether a sharper phrasing is needed.',
        suggestion: 'Consider a sharper sensory option if context supports it.',
        resolved: false,
      };
    }
  }

  if (
    /smekte\s+hennes\s+nakna\s+ben/i.test(sourceText) &&
    /caressed\s+her\s+bare\s+legs/i.test(finalText)
  ) {
    return {
      id: `qa-image-${segmentIndex}-${sourceText.length}-caressed`,
      severity: 'warning',
      category: 'image_drift',
      sourceExcerpt: 'smekte hennes nakna ben',
      targetExcerpt: 'caressed her bare legs',
      issue: 'The verb reads more sensual than the source image in this context.',
      suggestion: 'Prefer "brushed her bare legs" or "brushed against her bare legs."',
      resolved: false,
    };
  }

  if (/statlig\.\s+oradd\./i.test(sourceText) && /proud\.\s+unafraid\./i.test(finalText)) {
    return {
      id: `qa-image-${segmentIndex}-${sourceText.length}-majestic`,
      severity: 'warning',
      category: 'image_drift',
      sourceExcerpt: 'Statlig. Oradd.',
      targetExcerpt: 'Proud. Unafraid.',
      issue: 'The image loses force and tonal elevation compared with the source.',
      suggestion:
        'Prefer "Majestic. Fearless." unless context clearly requires another equivalent.',
      resolved: false,
    };
  }

  return null;
}

function buildTranslationStiffnessFinding(
  sourceText: string,
  finalText: string,
  segmentIndex: number,
): QAFinding | null {
  if (
    /var\s+pa\s+vag\s+fran\s+himmelen|var\s+pa\s+vag\s+fran\s+himlen/i.test(sourceText) &&
    /\b(was\s+)?coming\s+from\s+the\s+sky\b/i.test(finalText)
  ) {
    return {
      id: `qa-stiffness-${segmentIndex}-${sourceText.length}-sky`,
      severity: 'warning',
      category: 'translation_stiffness',
      sourceExcerpt: 'var pa vag fran himmelen',
      targetExcerpt: 'was coming from the sky',
      issue: 'The phrase feels literal and mechanically transferred from Swedish syntax.',
      suggestion: 'Prefer "descending from the sky" or "came down from the sky."',
      resolved: false,
    };
  }

  if (/\bcalled\s+out\s+desperately\b/i.test(finalText)) {
    return {
      id: `qa-stiffness-${segmentIndex}-${sourceText.length}-called-out`,
      severity: 'info',
      category: 'translation_stiffness',
      targetExcerpt: 'called out desperately',
      issue: 'The phrasing can read literal or flat in literary narration depending on context.',
      suggestion: 'Consider "cried out desperately" when emotional force should be sharper.',
      resolved: false,
    };
  }

  return null;
}

function buildFamilyTermNaturalnessFinding(
  sourceText: string,
  finalText: string,
  segmentIndex: number,
): QAFinding | null {
  const sourceHasFamilyTerms = /\b(mor|far|lillebror)\b/i.test(sourceText);
  const literalPattern = /\b(next to|beside|with)\s+mother\s+and\s+little\s+brother\b/i;

  if (!sourceHasFamilyTerms || !literalPattern.test(finalText)) {
    return null;
  }

  return {
    id: `qa-family-${segmentIndex}-${sourceText.length}`,
    severity: 'warning',
    category: 'family_term_naturalness',
    targetExcerpt: 'next to mother and little brother',
    issue:
      'Literal family-term rendering sounds awkward in English narration and weakens close perspective.',
    suggestion:
      'Prefer "beside her mother and little brother" (or context-equivalent phrasing). Keep "father" where emotional distance matters; do not auto-convert to "Dad."',
    resolved: false,
  };
}

function buildCulturalTextureFinding(
  sourceText: string,
  finalText: string,
  segmentIndex: number,
): QAFinding | null {
  if (!/hela\s+slakten/i.test(sourceText) || !/\ball\s+the\s+relatives\b/i.test(finalText)) {
    return null;
  }

  return {
    id: `qa-culture-${segmentIndex}-${sourceText.length}`,
    severity: 'warning',
    category: 'cultural_texture_drift',
    sourceExcerpt: 'med hela slakten',
    targetExcerpt: 'with all the relatives',
    issue: 'The wording is accurate but flattens communal warmth and memory texture.',
    suggestion:
      'Consider "with the whole clan" or a context-sensitive equivalent with social warmth.',
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
    buildTenseAspectDriftFinding(sourceText, finalText, segmentIndex),
    buildImageDriftFinding(sourceText, finalText, segmentIndex),
    buildTranslationStiffnessFinding(sourceText, finalText, segmentIndex),
    buildFamilyTermNaturalnessFinding(sourceText, finalText, segmentIndex),
    buildCulturalTextureFinding(sourceText, finalText, segmentIndex),
  ].filter((finding): finding is QAFinding => finding !== null);
}

export function findLockedTerms(sourceText: string, lockedTerms: GlossaryEntry[]): GlossaryEntry[] {
  return lockedTerms.filter((entry) => sourceText.includes(entry.sourceTerm));
}
