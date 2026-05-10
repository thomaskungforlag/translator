import { demoWorkspaceSeed, demoGlossary, demoSourceText } from './demo-workspace';
import { buildStudioShellProject, exportProjectMarkdown } from './pipeline';

describe('buildStudioShellProject', () => {
  it('builds a reviewable project from the seeded source text', () => {
    const project = buildStudioShellProject(demoWorkspaceSeed);

    expect(project.segments).toHaveLength(3);
    expect(project.segments[0]?.finalText).toBe(
      'Snow had started to fall when she saw the light again.',
    );
    expect(project.qaFindings).toEqual([]);
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
  });

  it('uses supplied drafts when the pipeline is already generated', () => {
    const project = buildStudioShellProject(demoWorkspaceSeed, [
      {
        sourceText: 'En enda rad.',
        translationDraft: 'A single line.',
        voiceAdaptedDraft: 'A single, measured line.',
        polishedDraft: 'A single, measured line.',
        finalText: 'A single, measured line.',
      },
    ]);

    expect(project.segments).toHaveLength(1);
    expect(project.segments[0]?.finalText).toBe('A single, measured line.');
  });
});
