import type { QAFinding } from '@/lib/domain';

import { buildCoreSegmentQaFindings, findLockedTerms } from './pipeline-qa-core';
import { buildSensorySegmentQaFindings } from './pipeline-qa-sensory';

export function buildSegmentQaFindings(
  sourceText: string,
  finalText: string,
  segmentIndex = 0,
): QAFinding[] {
  return [
    ...buildCoreSegmentQaFindings(sourceText, finalText, segmentIndex),
    ...buildSensorySegmentQaFindings(sourceText, finalText, segmentIndex),
  ];
}

export { findLockedTerms };
