import { buildSegmentQaFindings } from './pipeline-qa';

describe('pipeline-qa Tuya fixture regression', () => {
  it('flags tense/aspect drift from expected hope to progressive action', () => {
    const findings = buildSegmentQaFindings(
      'Allt blev battre nu.',
      'Everything was getting better now.',
      0,
    );

    expect(findings).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          category: 'tense_aspect_drift',
          targetExcerpt: 'Everything was getting better now.',
          suggestion: expect.stringContaining('Everything was going to be better now.'),
        }),
      ]),
    );
  });

  it('flags cultural texture drift for hela slakten -> all the relatives', () => {
    const findings = buildSegmentQaFindings('med hela slakten', 'with all the relatives', 1);

    expect(findings).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          category: 'cultural_texture_drift',
          suggestion: expect.stringContaining('whole clan'),
        }),
      ]),
    );
  });

  it('flags literal sky-motion wording as translation stiffness', () => {
    const findings = buildSegmentQaFindings(
      'var pa vag fran himmelen',
      'was coming from the sky',
      2,
    );

    expect(findings).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          category: 'translation_stiffness',
          suggestion: expect.stringContaining('descending from the sky'),
        }),
      ]),
    );
  });

  it('flags weaker ear-image renderings for review', () => {
    const findings = buildSegmentQaFindings('Tuyas oron skar', "Tuya's ears rang", 3);

    expect(findings).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          category: 'image_drift',
          targetExcerpt: "Tuya's ears rang ...",
        }),
      ]),
    );
  });

  it('does not flag Majestic. Fearless. for Statlig. Oradd.', () => {
    const findings = buildSegmentQaFindings('Statlig. Oradd.', 'Majestic. Fearless.', 4);

    expect(findings.some((finding) => finding.category === 'image_drift')).toBe(false);
  });

  it('flags sensual drift in caressed her bare legs', () => {
    const findings = buildSegmentQaFindings('smekte hennes nakna ben', 'caressed her bare legs', 5);

    expect(findings).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          category: 'image_drift',
          suggestion: expect.stringContaining('brushed her bare legs'),
        }),
      ]),
    );
  });

  it('flags family-term naturalness for literal mother/little brother phrasing', () => {
    const findings = buildSegmentQaFindings(
      'bredvid mor och lillebror',
      'next to mother and little brother',
      6,
    );

    expect(findings).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          category: 'family_term_naturalness',
          suggestion: expect.stringContaining('beside her mother and little brother'),
        }),
      ]),
    );
  });
});
