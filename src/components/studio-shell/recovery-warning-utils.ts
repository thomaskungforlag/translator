const recoveryWarningPattern =
  /^(?<stage>.+?) recovered (?:with local fallback|without model findings) for source segment index\(es\): (?<range>[^.]+)\. Reason: (?<reason>.+?)(?:\.)?$/;

type ParsedRecoveryWarning = {
  stageLabel: string;
  impactedSegmentsLabel: string;
  firstImpactedSegmentIndex: number | null;
  reason: string;
  guidance: string;
};

function formatStageLabel(value: string): string {
  const preservedWords = new Set(['qa', 'api', 'pdf', 'ui', 'llm', 'json']);

  return value
    .split('_')
    .filter((part) => part.length > 0)
    .map((part) => {
      const lower = part.toLowerCase();

      if (preservedWords.has(lower)) {
        return lower.toUpperCase();
      }

      return lower.charAt(0).toUpperCase() + lower.slice(1);
    })
    .join(' ');
}

function formatSegmentRange(range: string): {
  label: string;
  firstIndex: number | null;
} {
  const match = range.match(/^(\d+)-(\d+)$/);

  if (!match) {
    return {
      label: range,
      firstIndex: null,
    };
  }

  const start = Number(match[1]);
  const end = Number(match[2]);
  const firstIndex = Number.isFinite(start) ? start : null;
  const displayStart = firstIndex === null ? start : start + 1;
  const displayEnd = Number.isFinite(end) ? end + 1 : displayStart;

  return {
    label:
      displayStart === displayEnd
        ? `Segment ${displayStart}`
        : `Segments ${displayStart}-${displayEnd}`,
    firstIndex,
  };
}

export function parsePipelineWarning(warning: string): ParsedRecoveryWarning {
  const match = warning.match(recoveryWarningPattern);

  if (!match?.groups) {
    return {
      stageLabel: 'Pipeline warning',
      impactedSegmentsLabel: 'Review required',
      firstImpactedSegmentIndex: null,
      reason: warning,
      guidance: 'Review the affected segment(s) before publishing.',
    };
  }

  const segmentRange = formatSegmentRange(match.groups.range);

  return {
    stageLabel: formatStageLabel(match.groups.stage),
    impactedSegmentsLabel: segmentRange.label,
    firstImpactedSegmentIndex: segmentRange.firstIndex,
    reason: match.groups.reason.trim(),
    guidance:
      'The translated text in this segment was rebuilt locally, so compare it against the source and re-run if you want a fresh provider pass.',
  };
}
