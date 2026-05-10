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
  title: 'Röd Tvilling',
  stylePrinciples: [
    'Keep the prose grounded, concrete, and emotionally direct.',
    'Preserve the tension between domestic realism and speculative imagery.',
    'Maintain terse dialogue and avoid smoothing away friction or class conflict.',
    'Use terminology consistently, especially named entities and recurring sci-fi motifs.',
  ],
  qaPrinciples: [
    'Flag lowercase or variant spellings of locked terminology.',
    'Flag voice drift that softens anger, urgency, or social tension.',
    'Flag translations that collapse paragraph rhythm or remove scene beats.',
    'Treat the English PDF as a partial draft, not as an authoritative final translation.',
  ],
  lockedTerms: [
    {
      id: 'ref-shadow-ship',
      sourceTerm: 'Skuggskeppet',
      targetTerm: 'The Shadow Ship',
      category: 'worldbuilding',
      notes: 'Canonical recurring term from the Swedish corpus.',
      locked: true,
    },
  ],
  translationMemory: [
    {
      sourceText: 'Det hade börjat snöa när hon såg ljuset igen.',
      englishText: 'It had started to snow when she saw the light again.',
      status: 'reviewed',
      note: 'Opening chapter line; good candidate for reuse.',
    },
    {
      sourceText: 'Han visste att det var för sent att ringa tillbaka.',
      englishText: 'He knew it was too late to call back.',
      status: 'reviewed',
      note: 'Short, direct line that keeps the pacing intact.',
    },
    {
      sourceText: 'Någonstans längre bort svarade Skuggskeppet i mörkret.',
      englishText: 'Somewhere farther away, The Shadow Ship answered in the dark.',
      status: 'needs_qa',
      note: 'Useful seed translation, but it should still be QA reviewed against the Swedish source.',
    },
  ],
};

export function buildDefaultStyleProfile(): StyleProfile {
  return {
    id: 'style-red-twin-default',
    name: 'Röd Tvilling',
    description:
      'Default Thomas Kung author voice profile for grounded, emotionally direct speculative fiction.',
    voicePrinciples: [
      'Keep the prose grounded, concrete, and emotionally direct.',
      'Preserve the tension between domestic realism and speculative imagery.',
      'Maintain terse dialogue and avoid smoothing away friction or class conflict.',
      'Use terminology consistently, especially named entities and recurring sci-fi motifs.',
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
