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

  it('flags grammar-flow issue in grass swayed ... brushed her bare legs phrasing', () => {
    const findings = buildSegmentQaFindings(
      'Graset svajade i en svag vind och smekte hennes nakna ben.',
      'The grass swayed in a faint breeze, brushed her bare legs.',
      7,
    );

    expect(findings).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          category: 'grammar_flow',
          suggestion: expect.stringContaining('brushing against her bare legs'),
        }),
      ]),
    );
  });

  it('flags motion image drift for pulled him without directional continuation', () => {
    const findings = buildSegmentQaFindings(
      'Hon drog honom genom dorren.',
      'She pulled him, through the door.',
      8,
    );

    expect(findings).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          category: 'motion_image_drift',
          suggestion: expect.stringContaining('pulled him along'),
        }),
      ]),
    );
  });

  it('flags emotional intensity drift for called out desperately in silent context', () => {
    const findings = buildSegmentQaFindings(
      'Hon skrek utan ljud, hennes lappar rorde sig men inget hordes.',
      'She called out desperately, but no sound came.',
      9,
    );

    expect(findings).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          category: 'emotional_intensity_drift',
          suggestion: expect.stringContaining('cried out desperately'),
        }),
      ]),
    );
  });

  it('flags punctuation-flow issue in lifted from the ground and disappeared sequence', () => {
    const findings = buildSegmentQaFindings(
      'Hon steg upp fran marken och forsvann.',
      'She rose, lifted from the ground and disappeared.',
      10,
    );

    expect(findings).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          category: 'punctuation_flow',
          suggestion: expect.stringContaining('lifted from the ground, and disappeared'),
        }),
      ]),
    );
  });

  it('flags image drift for On a hill Uncle Bold bathed in ...', () => {
    const findings = buildSegmentQaFindings(
      'Uppe pa en kulle stod Farbror Bold badad i vitt ljus.',
      'On a hill Uncle Bold bathed in a pillar of white light.',
      11,
    );

    expect(findings).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          category: 'image_drift',
          suggestion: expect.stringContaining('stood bathed in'),
        }),
      ]),
    );
  });
});
