import type { GlossaryEntry, StyleProfile } from '@/lib/domain';

export type ReferenceExampleStatus = 'reviewed' | 'needs_qa';

export type ReferenceExample = {
  sourceText: string;
  englishText: string;
  status: ReferenceExampleStatus;
  note: string;
};

export type ReferenceMaterial = {
  title: string;
  stylePrinciples: string[];
  qaPrinciples: string[];
  lockedTerms: GlossaryEntry[];
  translationMemory: ReferenceExample[];
};

export const redTwinReference: ReferenceMaterial = {
  title: 'Private Author Corpus',
  stylePrinciples: [
    'Keep the prose grounded, concrete, and emotionally direct.',
    'Preserve atmospheric specificity without inflating the prose.',
    'Maintain restrained dialogue and avoid smoothing away tension or contrast.',
    'Use terminology consistently, especially named entities and recurring motifs.',
  ],
  qaPrinciples: [
    'Flag lowercase or variant spellings of locked terminology.',
    'Flag voice drift that softens urgency, atmosphere, or narrative tension.',
    'Flag translations that collapse paragraph rhythm or remove scene beats.',
    'Treat checked-in examples as placeholders; keep real corpus material outside the public repo.',
  ],
  lockedTerms: [
    {
      id: 'ref-aurora-gate',
      sourceTerm: 'Auroraporten',
      targetTerm: 'Aurora Gate',
      category: 'worldbuilding',
      notes: 'Placeholder locked term for public-safe demos and tests.',
      locked: true,
    },
  ],
  translationMemory: [
    {
      sourceText: 'Morgonljuset låg kallt över kajen.',
      englishText: 'Morning light lay cold over the quay.',
      status: 'reviewed',
      note: 'Public-safe placeholder example for fallback reuse.',
    },
    {
      sourceText: 'Hon väntade vid räcket tills dimman lättade.',
      englishText: 'She waited by the railing until the fog lifted.',
      status: 'reviewed',
      note: 'Public-safe placeholder example for fallback reuse.',
    },
    {
      sourceText: 'Långt ute blinkade Auroraporten en gång.',
      englishText: 'Far offshore, the Aurora Gate flashed once.',
      status: 'needs_qa',
      note: 'Example placeholder seed that should still be QA reviewed before reuse.',
    },
  ],
};

export function buildDefaultStyleProfile(): StyleProfile {
  return {
    id: 'style-private-author-default',
    name: 'Private Author Corpus',
    description:
      'Default public-safe author voice profile for grounded, emotionally direct speculative fiction.',
    voicePrinciples: [
      'Keep the prose grounded, concrete, and emotionally direct.',
      'Preserve atmospheric specificity without inflating the prose.',
      'Maintain restrained dialogue and avoid smoothing away tension or contrast.',
      'Use terminology consistently, especially named entities and recurring motifs.',
    ],
    preferredTone: ['Grounded', 'Direct', 'Taut', 'Emotionally restrained'],
    avoidPatterns: [
      'Genericized voice',
      'Over-explained subtext',
      'Softened tension',
      'Flat literal syntax transfer',
    ],
    sentenceRhythmNotes: [
      'Keep sentences compact when the Swedish is compact.',
      'Preserve pauses and sentence cadence around key emotional beats.',
    ],
    genreNotes: [
      'Sci-fi should stay tactile and socially specific.',
      'Do not dilute speculative imagery into vague abstraction.',
    ],
    sampleTexts: [],
  };
}

export function buildReferencePromptContext(styleProfile: StyleProfile): string {
  const styleBlock = redTwinReference.stylePrinciples
    .map((principle) => `- ${principle}`)
    .join('\n');
  const qaBlock = redTwinReference.qaPrinciples.map((principle) => `- ${principle}`).join('\n');
  const glossaryBlock = redTwinReference.lockedTerms
    .map((entry) => `- ${entry.sourceTerm} -> ${entry.targetTerm}`)
    .join('\n');
  const memoryBlock = redTwinReference.translationMemory
    .map(
      (example) =>
        `- ${example.sourceText}\n  English draft: ${example.englishText}\n  Status: ${example.status}\n  Note: ${example.note}`,
    )
    .join('\n');

  const profileVoiceBlock = styleProfile.voicePrinciples
    .map((principle) => `- ${principle}`)
    .join('\n');
  const profileToneBlock = styleProfile.preferredTone.map((tone) => `- ${tone}`).join('\n');
  const profileAvoidBlock = styleProfile.avoidPatterns.map((pattern) => `- ${pattern}`).join('\n');
  const profileRhythmBlock = styleProfile.sentenceRhythmNotes.map((note) => `- ${note}`).join('\n');
  const profileGenreBlock = styleProfile.genreNotes.map((note) => `- ${note}`).join('\n');
  const profileSampleBlock =
    styleProfile.sampleTexts.length > 0
      ? styleProfile.sampleTexts
          .map((sample) => {
            const translatedText = sample.translatedText
              ? `\n  English draft: ${sample.translatedText}`
              : '';

            return `- ${sample.sourceText}${translatedText}\n  Priority: ${sample.isPriority}`;
          })
          .join('\n')
      : '- No sample texts yet.';

  return [
    `Reference title: ${redTwinReference.title}`,
    'Style principles:',
    styleBlock,
    `Style profile: ${styleProfile.name}`,
    `Profile description: ${styleProfile.description}`,
    'Voice principles:',
    profileVoiceBlock,
    'Preferred tone:',
    profileToneBlock,
    'Avoid patterns:',
    profileAvoidBlock,
    'Sentence rhythm notes:',
    profileRhythmBlock,
    'Genre notes:',
    profileGenreBlock,
    'Sample texts:',
    profileSampleBlock,
    'QA principles:',
    qaBlock,
    'Locked terminology:',
    glossaryBlock,
    'Translation memory examples:',
    memoryBlock,
  ].join('\n');
}
