import type { QAFinding, QAFindingCategory, QAFindingSeverity } from '@/lib/domain';

type HighlightFinding = QAFinding & {
  targetRange?: {
    start: number;
    end: number;
  };
};

type Rule = {
  category: QAFindingCategory;
  severity: QAFindingSeverity;
  issue: string;
  suggestion: string;
  pattern: RegExp;
};

const weakModifierRules: Rule[] = [
  {
    category: 'style_drift',
    severity: 'info',
    issue: 'Weak modifier detected.',
    suggestion: 'Try a more specific adjective or stronger verb.',
    pattern: /\bvery\b/gi,
  },
  {
    category: 'style_drift',
    severity: 'info',
    issue: 'Weak modifier detected.',
    suggestion: 'Try a more specific adjective or stronger verb.',
    pattern: /\breally\b/gi,
  },
  {
    category: 'style_drift',
    severity: 'info',
    issue: 'Weak modifier detected.',
    suggestion: 'Consider removing the intensifier for cleaner prose.',
    pattern: /\bjust\b/gi,
  },
  {
    category: 'style_drift',
    severity: 'info',
    issue: 'Weak modifier detected.',
    suggestion: 'Consider removing the intensifier for cleaner prose.',
    pattern: /\bquite\b/gi,
  },
  {
    category: 'style_drift',
    severity: 'info',
    issue: 'Weak modifier detected.',
    suggestion: 'Consider removing the intensifier for cleaner prose.',
    pattern: /\brather\b/gi,
  },
  {
    category: 'style_drift',
    severity: 'info',
    issue: 'Weak modifier detected.',
    suggestion: 'Consider removing the intensifier for cleaner prose.',
    pattern: /\bslowly\b/gi,
  },
  {
    category: 'style_drift',
    severity: 'info',
    issue: 'Weak modifier detected.',
    suggestion: 'Consider removing the intensifier for cleaner prose.',
    pattern: /\bsuddenly\b/gi,
  },
  {
    category: 'style_drift',
    severity: 'info',
    issue: 'Weak modifier detected.',
    suggestion: 'Consider removing the intensifier for cleaner prose.',
    pattern: /\bmaybe\b/gi,
  },
  {
    category: 'style_drift',
    severity: 'info',
    issue: 'Weak modifier detected.',
    suggestion: 'Consider removing the intensifier for cleaner prose.',
    pattern: /\bperhaps\b/gi,
  },
];

const passiveVoiceRule: Rule = {
  category: 'translation_stiffness',
  severity: 'warning',
  issue: 'Passive construction detected.',
  suggestion: 'Consider an active rewrite if the actor matters.',
  pattern: /\b(?:was|were|is|are|be|been|being)\s+[A-Za-z][A-Za-z'-]*(?:ed|en)\b/gi,
};

function createFinding(args: {
  id: string;
  category: QAFindingCategory;
  severity: QAFindingSeverity;
  issue: string;
  suggestion: string;
  excerpt: string;
  start: number;
  end: number;
}): HighlightFinding {
  const { id, category, severity, issue, suggestion, excerpt, start, end } = args;

  return {
    id,
    severity,
    category,
    targetExcerpt: excerpt,
    targetRange: {
      start,
      end,
    },
    issue,
    suggestion,
    resolved: false,
  };
}

function findAllMatches(text: string, pattern: RegExp): Array<{ index: number; match: string }> {
  const matches: Array<{ index: number; match: string }> = [];

  for (const match of text.matchAll(pattern)) {
    if (typeof match.index !== 'number') {
      continue;
    }

    matches.push({
      index: match.index,
      match: match[0],
    });
  }

  return matches;
}

function buildRepeatedWordFindings(text: string): HighlightFinding[] {
  const findings: HighlightFinding[] = [];
  const pattern = /\b([A-Za-z][A-Za-z'-]*)\s+\1\b/gi;

  for (const match of text.matchAll(pattern)) {
    if (typeof match.index !== 'number') {
      continue;
    }

    const excerpt = match[0];

    findings.push(
      createFinding({
        id: `proofread-repeated-${match.index}`,
        category: 'grammar',
        severity: 'warning',
        issue: 'Repeated word detected.',
        suggestion: 'Remove the duplicate word.',
        excerpt,
        start: match.index,
        end: match.index + excerpt.length,
      }),
    );
  }

  return findings;
}

function buildRuleFindings(text: string, rule: Rule): HighlightFinding[] {
  return findAllMatches(text, rule.pattern).map(({ index, match }) =>
    createFinding({
      id: `proofread-${rule.category}-${rule.pattern.source}-${index}`,
      category: rule.category,
      severity: rule.severity,
      issue: rule.issue,
      suggestion: rule.suggestion,
      excerpt: match,
      start: index,
      end: index + match.length,
    }),
  );
}

function isEmptyText(value: string): boolean {
  return value.trim().length === 0;
}

export function buildProofreadingFindings(text: string): QAFinding[] {
  if (isEmptyText(text)) {
    return [];
  }

  const normalizedText = text.replace(/\r\n?/g, '\n');
  const findings = [
    ...buildRepeatedWordFindings(normalizedText),
    ...weakModifierRules.flatMap((rule) => buildRuleFindings(normalizedText, rule)),
    ...buildRuleFindings(normalizedText, passiveVoiceRule),
  ];

  findings.sort((left, right) => (left.targetRange?.start ?? 0) - (right.targetRange?.start ?? 0));

  return findings;
}

export function buildProofreadingSummary(text: string): string {
  const findings = buildProofreadingFindings(text);

  if (findings.length === 0) {
    return 'No obvious proofing issues detected.';
  }

  const repeatedWordCount = findings.filter((finding) => finding.category === 'grammar').length;
  const styleCount = findings.filter((finding) => finding.category === 'style_drift').length;
  const passiveCount = findings.filter(
    (finding) => finding.category === 'translation_stiffness',
  ).length;

  return [
    `${findings.length} issue${findings.length === 1 ? '' : 's'} flagged.`,
    repeatedWordCount > 0
      ? `${repeatedWordCount} repetition${repeatedWordCount === 1 ? '' : 's'}.`
      : null,
    styleCount > 0 ? `${styleCount} style cue${styleCount === 1 ? '' : 's'}.` : null,
    passiveCount > 0
      ? `${passiveCount} passive construction${passiveCount === 1 ? '' : 's'}.`
      : null,
  ]
    .filter((value): value is string => value !== null)
    .join(' ');
}
