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

function buildGrammarFlowFinding(
  sourceText: string,
  finalText: string,
  segmentIndex: number,
): QAFinding | null {
  if (
    /gr[aä]set\s+svajade|gr[aä]set\s+r[oö]rde/i.test(sourceText) &&
    /\bthe\s+grass\s+swayed\s+in\s+a\s+faint\s+breeze,\s*brushed\s+her\s+bare\s+legs\b/i.test(
      finalText,
    )
  ) {
    return {
      id: `qa-grammar-${segmentIndex}-${sourceText.length}`,
      severity: 'warning',
      category: 'grammar_flow',
      targetExcerpt: 'the grass swayed in a faint breeze, brushed her bare legs',
      issue: 'Verb agreement/flow is awkward after the comma and reads translated.',
      suggestion: 'Use "...swayed in a faint breeze, brushing against her bare legs."',
      resolved: false,
    };
  }

  return null;
}

function buildPunctuationFlowFinding(
  _sourceText: string,
  finalText: string,
  segmentIndex: number,
): QAFinding | null {
  if (!/,\s*lifted\s+from\s+the\s+ground\s+and\s+disappeared/i.test(finalText)) {
    return null;
  }

  return {
    id: `qa-punct-${segmentIndex}-${finalText.length}`,
    severity: 'info',
    category: 'punctuation_flow',
    targetExcerpt: ', lifted from the ground and disappeared',
    issue: 'Series punctuation rhythm is uneven for literary copy flow.',
    suggestion: 'Use ", lifted from the ground, and disappeared" for balanced cadence.',
    resolved: false,
  };
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

export function buildCoreSegmentQaFindings(
  sourceText: string,
  finalText: string,
  segmentIndex = 0,
): QAFinding[] {
  return [
    buildLockedTermFinding(sourceText, finalText, segmentIndex),
    buildMemoryReviewFinding(sourceText, finalText, segmentIndex),
    buildFormattingFinding(sourceText, finalText, segmentIndex),
    buildTenseAspectDriftFinding(sourceText, finalText, segmentIndex),
    buildGrammarFlowFinding(sourceText, finalText, segmentIndex),
    buildPunctuationFlowFinding(sourceText, finalText, segmentIndex),
    buildTranslationStiffnessFinding(sourceText, finalText, segmentIndex),
    buildFamilyTermNaturalnessFinding(sourceText, finalText, segmentIndex),
    buildCulturalTextureFinding(sourceText, finalText, segmentIndex),
  ].filter((finding): finding is QAFinding => finding !== null);
}

export function findLockedTerms(sourceText: string, lockedTerms: GlossaryEntry[]): GlossaryEntry[] {
  return lockedTerms.filter((entry) => sourceText.includes(entry.sourceTerm));
}
