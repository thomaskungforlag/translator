/** @jest-environment node */

import { buildStudioShellProject } from '@/lib/pipeline';

import { demoWorkspaceSeed } from '@/lib/demo-workspace';

import { buildTranslationWorkspaceRunRequest } from './translation-workspace-utils';

describe('buildTranslationWorkspaceRunRequest', () => {
  it('drops incomplete glossary drafts before submitting the pipeline request', () => {
    const project = {
      ...buildStudioShellProject(demoWorkspaceSeed),
      glossary: [
        {
          id: 'gl-valid',
          sourceTerm: '  Auroraporten  ',
          targetTerm: '  Aurora Gate  ',
          category: 'worldbuilding' as const,
          locked: true,
        },
        {
          id: 'gl-empty',
          sourceTerm: '',
          targetTerm: '',
          category: 'other' as const,
          locked: false,
        },
        {
          id: 'gl-space-only',
          sourceTerm: '   ',
          targetTerm: 'South Quay',
          category: 'place' as const,
          locked: false,
        },
      ],
    };

    const request = buildTranslationWorkspaceRunRequest({
      initialSeed: demoWorkspaceSeed,
      currentProject: project,
      sourceText: 'Morgonljuset låg kallt över kajen.',
      segmentationStrategy: 'paragraph',
      provider: 'openai',
      model: 'gpt-5-mini',
    });

    expect(request.glossary).toEqual([
      {
        id: 'gl-valid',
        sourceTerm: 'Auroraporten',
        targetTerm: 'Aurora Gate',
        category: 'worldbuilding',
        locked: true,
      },
    ]);
    expect(request.provider).toBe('openai');
    expect(request.model).toBe('gpt-5-mini');
    expect(request.title).toBe(project.title);
  });
});
