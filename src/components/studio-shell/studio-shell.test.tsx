import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import { buildStudioShellProject } from '@/lib/pipeline';
import { demoWorkspaceSeed } from '@/lib/demo-workspace';

import { StudioShell } from '../studio-shell';

function setMatchMedia(matches: boolean): void {
  Object.defineProperty(window, 'matchMedia', {
    configurable: true,
    writable: true,
    value: jest.fn().mockImplementation((query: string) => ({
      matches,
      media: query,
      onchange: null,
      addListener: jest.fn(),
      removeListener: jest.fn(),
      addEventListener: jest.fn(),
      removeEventListener: jest.fn(),
      dispatchEvent: jest.fn(),
    })),
  });
}

describe('StudioShell', () => {
  it('shows the permanent workspace drawer on desktop layouts', () => {
    setMatchMedia(true);
    const project = buildStudioShellProject(demoWorkspaceSeed);

    render(
      <StudioShell
        apiKeyConfigured
        activeRuntimeModelLabel="Poe • Claude"
        project={project}
        selectedRecoverySegmentIndex={null}
        onCopyFinalText={jest.fn()}
      />,
    );

    expect(screen.getByTestId('workspace-panels-drawer')).toBeVisible();
    expect(screen.queryByRole('button', { name: /workspace panels/i })).not.toBeInTheDocument();
  });

  it('opens the temporary workspace drawer on mobile layouts', async () => {
    setMatchMedia(false);
    const user = userEvent.setup();
    const project = buildStudioShellProject(demoWorkspaceSeed);
    const onCopyFinalText = jest.fn();

    render(
      <StudioShell
        apiKeyConfigured
        activeRuntimeModelLabel="Poe • Claude"
        project={project}
        selectedRecoverySegmentIndex={null}
        onCopyFinalText={onCopyFinalText}
      />,
    );

    await user.click(screen.getByRole('button', { name: /workspace panels/i }));

    expect(screen.getByTestId('workspace-panels-drawer')).toBeVisible();
    await user.click(screen.getByTestId('pinned-copy-final-text-button'));
    expect(onCopyFinalText).toHaveBeenCalledTimes(1);
  });
});
