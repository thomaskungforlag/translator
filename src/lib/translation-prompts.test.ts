import { demoWorkspaceSeed } from './demo-workspace';
import { buildQaPrompt, buildStageInput } from './translation-prompts';

describe('translation-prompts', () => {
  it('includes explicit source and target language parameters in stage prompts', () => {
    const prompt = buildStageInput({
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
    };

    expect(payload.project.sourceLanguageCode).toBe('sv');
    expect(payload.project.targetLanguageCode).toBe('en');
    expect(payload.project.targetLanguageLabel).toBe('English');
  });

  it('includes explicit source and target language parameters in QA prompts', () => {
    const prompt = buildQaPrompt(demoWorkspaceSeed, [
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
    };

    expect(payload.project.sourceLanguageCode).toBe('sv');
    expect(payload.project.targetLanguageCode).toBe('en');
    expect(payload.project.targetLanguageLabel).toBe('English');
  });

  it('includes translation stiffness guidance in QA prompts', () => {
    const prompt = buildQaPrompt(demoWorkspaceSeed, [
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
