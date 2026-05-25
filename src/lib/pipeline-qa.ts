import type { QAFinding } from '@/lib/domain';

import { buildCoreSegmentQaFindings, findLockedTerms } from './pipeline-qa-core';
import { buildSensorySegmentQaFindings } from './pipeline-qa-sensory';
import type { GlossaryEntry } from '@/lib/domain';

export function buildSegmentQaFindings(
  sourceText: string,
  finalText: string,
  segmentIndex = 0,
  glossary: GlossaryEntry[] = [],
): QAFinding[] {
  return [
    ...buildCoreSegmentQaFindings(sourceText, finalText, segmentIndex, glossary),
    ...buildSensorySegmentQaFindings(sourceText, finalText, segmentIndex),
  ];
}

export { findLockedTerms };
