import type { GlossaryEntry } from '@/lib/domain';

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

export function buildReferencePromptContext(): string {
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

  return [
    `Reference title: ${redTwinReference.title}`,
    'Style principles:',
    styleBlock,
    'QA principles:',
    qaBlock,
    'Locked terminology:',
    glossaryBlock,
    'Translation memory examples:',
    memoryBlock,
  ].join('\n');
}
