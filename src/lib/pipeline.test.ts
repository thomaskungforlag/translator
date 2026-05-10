import { demoWorkspaceSeed, demoGlossary, demoSourceText } from './demo-workspace';
import {
  buildFaithfulDraft,
  buildPolishedDraft,
  buildSourceAnalysis,
  buildStudioShellProject,
  buildVoiceDraft,
  exportProjectMarkdown,
  splitSourceText,
} from './pipeline';

describe('buildStudioShellProject', () => {
  it('builds a reviewable project from the seeded source text', () => {
    const project = buildStudioShellProject(demoWorkspaceSeed);

    expect(project.segments).toHaveLength(3);
    expect(project.segments[0]?.sourceAnalysis).toContain('Source prep: 1 paragraph');
    expect(project.segments[0]?.finalText).toBe(
      'Snow had begun to fall when she saw the light again.',
    );
    expect(project.qaFindings).toHaveLength(1);
    expect(project.glossary).toHaveLength(demoGlossary.length);
    expect(project.targetLanguage.label).toBe('English');
  });

  it('exports markdown for the current project', () => {
    const project = buildStudioShellProject({
      ...demoWorkspaceSeed,
      sourceText: demoSourceText,
    });

    expect(exportProjectMarkdown(project)).toContain('# Chapter 03 - The Signal in the Ice');
    expect(exportProjectMarkdown(project)).toContain('## Segments');
    expect(exportProjectMarkdown(project)).toContain('Source analysis:');
  });

  it('builds explicit multi-pass drafts for the seeded text', () => {
    const sourceSegments = splitSourceText(demoSourceText);

    expect(buildSourceAnalysis(sourceSegments[0] ?? '')).toContain('Reviewed translation memory');
    expect(buildFaithfulDraft(sourceSegments[0] ?? '')).toBe(
      'It had started to snow when she saw the light again.',
    );
    expect(
      buildVoiceDraft(
        sourceSegments[0] ?? '',
        'It had started to snow when she saw the light again.',
      ),
    ).toBe('Snow was beginning to fall when she saw the light again.');
    expect(
      buildPolishedDraft(
        sourceSegments[0] ?? '',
        'Snow was beginning to fall when she saw the light again.',
      ),
    ).toBe('Snow had begun to fall when she saw the light again.');
  });

  it('uses supplied drafts when the pipeline is already generated', () => {
    const project = buildStudioShellProject(
      {
        ...demoWorkspaceSeed,
        sourceText: 'En enda rad.',
      },
      [
        {
          sourceText: 'En enda rad.',
          sourceAnalysis: 'Source prep: one short sentence.',
          translationDraft: 'A single line.',
          voiceAdaptedDraft: 'A single, measured line.',
          polishedDraft: 'A single, measured line.',
          finalText: 'A single, measured line.',
          qaFindings: [],
        },
      ],
    );

    expect(project.segments).toHaveLength(1);
    expect(project.segments[0]?.finalText).toBe('A single, measured line.');
  });

  it('treats resolved QA findings as complete for progress', () => {
    const project = buildStudioShellProject(
      {
        ...demoWorkspaceSeed,
        sourceText: 'En enda rad.',
      },
      [
        {
          sourceText: 'En enda rad.',
          sourceAnalysis: 'Source prep: one short sentence.',
          translationDraft: 'A single line.',
          voiceAdaptedDraft: 'A single, measured line.',
          polishedDraft: 'A single, measured line.',
          finalText: 'A single, measured line.',
          qaFindings: [
            {
              id: 'resolved-1',
              severity: 'warning',
              category: 'tone_shift',
              issue: 'Minor tone shift.',
              resolved: true,
            },
          ],
        },
      ],
    );

    expect(project.progress).toBe(100);
    expect(project.pipelineStages.find((stage) => stage.label === 'QA')?.status).toBe('approved');
    expect(project.segments[0]?.status).toBe('approved');
  });

  it('keeps progress complete when final text exists but QA has unresolved findings', () => {
    const project = buildStudioShellProject(
      {
        ...demoWorkspaceSeed,
        sourceText: 'En enda rad.',
      },
      [
        {
          sourceText: 'En enda rad.',
          sourceAnalysis: 'Source prep: one short sentence.',
          translationDraft: 'A single line.',
          voiceAdaptedDraft: 'A single, measured line.',
          polishedDraft: 'A single, measured line.',
          finalText: 'A single, measured line.',
          qaFindings: [
            {
              id: 'open-1',
              severity: 'warning',
              category: 'tone_shift',
              issue: 'Minor tone shift.',
              resolved: false,
            },
          ],
        },
      ],
    );

    expect(project.progress).toBe(100);
    expect(project.pipelineStages.find((stage) => stage.label === 'QA')?.status).toBe('reviewed');
    expect(project.segments[0]?.status).toBe('reviewed');
  });
});
