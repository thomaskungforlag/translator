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
});
