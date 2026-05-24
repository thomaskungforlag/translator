import { render, screen } from '@testing-library/react';

import { buildStudioShellProject } from '@/lib/pipeline';
import { demoWorkspaceSeed } from '@/lib/demo-workspace';

import { WorkspacePanelsDrawer } from './workspace-panels-drawer';

describe('WorkspacePanelsDrawer', () => {
  it('creates a bounded scroll container for the permanent drawer', () => {
    const project = buildStudioShellProject(demoWorkspaceSeed);

    const { container } = render(
      <WorkspacePanelsDrawer project={project} open variant="permanent" />,
    );

    const drawer = screen.getByTestId('workspace-panels-drawer');
    const aside = container.querySelector('aside');

    expect(aside).toBeTruthy();
    expect(aside).toHaveStyle({
      display: 'flex',
      flexDirection: 'column',
      height: 'calc(100vh - 48px)',
      overflow: 'hidden',
    });
    expect(drawer).toHaveStyle({
      flex: '1',
      minHeight: '0',
      overflowY: 'auto',
    });
  });
});
