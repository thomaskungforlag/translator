import { demoWorkspaceSeed } from './demo-workspace';
import {
  buildStudioShellProject,
  exportProjectJson,
  exportProjectQaReportMarkdown,
} from './pipeline';

describe('pipeline project exports', () => {
  it('exports a QA report markdown summary for unresolved findings', () => {
    const project = buildStudioShellProject(demoWorkspaceSeed);
    const report = exportProjectQaReportMarkdown(project);

    expect(report).toContain(`# QA Report: ${demoWorkspaceSeed.title}`);
    expect(report).toContain('Open findings: 1');
    expect(report).toContain('## Findings by Category');
    expect(report).toContain('style_drift: 1');
    expect(report).toContain('## Open Findings');
    expect(report).toContain('still needs QA before approval');
  });

  it('exports a JSON project snapshot with source, drafts, and style profile data', () => {
    const project = buildStudioShellProject(demoWorkspaceSeed);
    const json = exportProjectJson(project);
    const parsed = JSON.parse(json) as {
      version: number;
      exportedAt: string;
      project: {
        title: string;
        sourceText: string;
        sourceSegments: string[];
        segments: Array<{
          sourceText: string;
          finalText: string;
        }>;
        styleProfile: {
          name: string;
          voicePrinciples: string[];
        };
      };
    };

    expect(parsed.version).toBe(1);
    expect(parsed.exportedAt).toEqual(expect.any(String));
    expect(parsed.project.title).toBe(demoWorkspaceSeed.title);
    expect(parsed.project.sourceText).toContain('Det hade börjat snöa');
    expect(parsed.project.sourceSegments).toHaveLength(project.segments.length);
    expect(parsed.project.segments[0]?.finalText).toBe(
      'Snow had begun to fall when she saw the light again.',
    );
    expect(parsed.project.styleProfile.name).toBe('Röd Tvilling');
    expect(parsed.project.styleProfile.voicePrinciples).toContain(
      'Keep the prose grounded, concrete, and emotionally direct.',
    );
  });
});
