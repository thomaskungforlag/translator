import type { QAFinding } from '@/lib/domain';

import { buildProofreadingFindings } from './proofreading';

describe('buildProofreadingFindings', () => {
  it('flags repeated words, weak modifiers, and passive constructions', () => {
    const findings: QAFinding[] = buildProofreadingFindings(
      'The the room was very quiet. It was closed by the guard.',
    );

    const repeatedFinding = findings.find((finding) => finding.targetExcerpt === 'The the');
    const weakModifierFinding = findings.find((finding) => finding.targetExcerpt === 'very');
    const passiveFinding = findings.find((finding) => finding.targetExcerpt === 'was closed');

    expect(repeatedFinding).toMatchObject({
      category: 'grammar',
      targetExcerpt: 'The the',
    });
    expect(repeatedFinding?.issue).toMatch(/repeated word/i);

    expect(weakModifierFinding).toMatchObject({
      category: 'style_drift',
      targetExcerpt: 'very',
    });
    expect(weakModifierFinding?.issue).toMatch(/weak modifier/i);

    expect(passiveFinding).toMatchObject({
      category: 'translation_stiffness',
      targetExcerpt: 'was closed',
    });
    expect(passiveFinding?.issue).toMatch(/passive/i);
  });

  it('returns no findings for empty text', () => {
    expect(buildProofreadingFindings('')).toEqual([]);
  });
});
