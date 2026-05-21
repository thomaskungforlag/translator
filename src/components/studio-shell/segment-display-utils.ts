import type { DocumentSegment } from '@/lib/domain';

export const segmentPassLabels = [
  'Faithful translation',
  'Voice adaptation',
  'Literary naturalness',
  'QA findings',
  'Final polish',
  'Professional literary copyedit',
  'Final approved text',
] as const;

export type SegmentPassIndex = 0 | 1 | 2 | 3 | 4 | 5 | 6;

export function countWords(value: string): number {
  return value
    .trim()
    .split(/\s+/)
    .filter((word) => word.length > 0).length;
}

export function buildSegmentPreview(value: string, maxLength = 180): string {
  const normalized = value.replace(/\s+/g, ' ').trim();

  if (normalized.length <= maxLength) {
    return normalized;
  }

  return `${normalized.slice(0, maxLength).trimEnd()}…`;
}

function formatQaFindings(segment: DocumentSegment): string {
  if (segment.qaFindings.length === 0) {
    return 'No QA findings for this segment.';
  }

  return segment.qaFindings
    .map((finding) => {
      const suggestion = finding.suggestion ? ` Suggestion: ${finding.suggestion}` : '';

      return `[${finding.severity}] ${finding.category}: ${finding.issue}${suggestion}`;
    })
    .join(' ');
}

export function getSegmentPassText(segment: DocumentSegment, activePass: SegmentPassIndex): string {
  switch (activePass) {
    case 0:
      return segment.translationDraft ?? 'No translation draft yet.';
    case 1:
      return segment.voiceAdaptedDraft ?? 'No voice-adapted draft yet.';
    case 2:
      return segment.literaryNaturalnessDraft ?? 'No literary naturalness draft yet.';
    case 3:
      return formatQaFindings(segment);
    case 4:
      return segment.polishedDraft ?? 'No polished draft yet.';
    case 5:
      return (
        segment.professionalLiteraryCopyeditDraft ?? 'No professional literary copyedit draft yet.'
      );
    case 6:
      return segment.finalText ?? 'No final text yet.';
    default:
      return segment.translationDraft ?? 'No translation draft yet.';
  }
}

export function getSegmentPassLabel(activePass: SegmentPassIndex): string {
  return segmentPassLabels[activePass];
}
