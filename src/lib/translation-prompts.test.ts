import { demoWorkspaceSeed } from './demo-workspace';
import { buildQaPrompt, buildStageInput } from './translation-prompts';

describe('translation-prompts', () => {
  it('includes explicit source and target language parameters in stage prompts', async () => {
    const prompt = await buildStageInput({
      seed: demoWorkspaceSeed,
      sourceSegments: ['En mening.'],
      stageName: 'faithful_translation',
      instructions: ['Translate.'],
      previousStages: {},
    });

    const payload = JSON.parse(prompt) as {
      project: {
        sourceLanguageCode: string;
        targetLanguageCode: string;
        targetLanguageLabel: string;
      };
      glossary: Array<{
        sourceTerm: string;
        targetTerm: string;
        locked: boolean;
      }>;
      styleProfile: {
        name: string;
      };
      reference: string;
      instructions: string[];
    };

    expect(payload.project.sourceLanguageCode).toBe('sv');
    expect(payload.project.targetLanguageCode).toBe('en');
    expect(payload.project.targetLanguageLabel).toBe('English');
    expect(payload.styleProfile.name).toBe('Private Author Corpus');
    expect(payload.glossary).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          sourceTerm: 'Auroraporten',
          targetTerm: 'Aurora Gate',
          locked: true,
        }),
      ]),
    );
    expect(payload.reference).toContain('Project glossary:');
    expect(payload.instructions).toEqual(
      expect.arrayContaining([
        expect.stringContaining('Treat locked glossary entries as hard constraints'),
        expect.stringContaining('canonical target term exactly as written'),
      ]),
    );
  });

  it('includes explicit source and target language parameters in QA prompts', async () => {
    const prompt = await buildQaPrompt(demoWorkspaceSeed, [
      {
        index: 0,
        sourceText: 'En mening.',
        sourceAnalysis: 'Kort test.',
        finalText: 'One sentence.',
      },
    ]);

    const payload = JSON.parse(prompt) as {
      project: {
        sourceLanguageCode: string;
        targetLanguageCode: string;
        targetLanguageLabel: string;
      };
      glossary: Array<{
        sourceTerm: string;
        targetTerm: string;
        locked: boolean;
      }>;
      reference: string;
      instructions: string[];
    };

    expect(payload.project.sourceLanguageCode).toBe('sv');
    expect(payload.project.targetLanguageCode).toBe('en');
    expect(payload.project.targetLanguageLabel).toBe('English');
    expect(payload.reference).toContain('Style profile: Private Author Corpus');
    expect(payload.reference).toContain('Project glossary:');
    expect(payload.glossary).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          sourceTerm: 'Södra kajen',
          targetTerm: 'South Quay',
          locked: true,
        }),
      ]),
    );
    expect(payload.instructions).toEqual(
      expect.arrayContaining([
        expect.stringContaining('Check glossary compliance'),
        expect.stringContaining('glossary source terms'),
      ]),
    );
  });

  it('includes translation stiffness guidance in QA prompts', async () => {
    const prompt = await buildQaPrompt(demoWorkspaceSeed, [
      {
        index: 0,
        sourceText: 'En mening.',
        sourceAnalysis: 'Kort test.',
        finalText: 'One sentence.',
      },
    ]);

    expect(prompt).toContain('translation_stiffness');
    expect(prompt).toContain('literal syntax transfer');
    expect(prompt).toContain('tense_aspect_drift');
    expect(prompt).toContain('image_drift');
    expect(prompt).toContain('motion_image_drift');
    expect(prompt).toContain('emotional_intensity_drift');
    expect(prompt).toContain('grammar_flow');
    expect(prompt).toContain('punctuation_flow');
    expect(prompt).toContain('family_term_naturalness');
    expect(prompt).toContain('cultural_texture_drift');
    expect(prompt).toContain('hope, expectation, remembered belief, or childlike certainty');
  });
});
