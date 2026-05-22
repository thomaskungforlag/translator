import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import { WorkspaceAccordion } from './workspace-accordion';

describe('WorkspaceAccordion', () => {
  it('does not emit a warning when the default expanded prop changes after mount', async () => {
    const user = userEvent.setup();
    const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => undefined);

    const { rerender } = render(
      <WorkspaceAccordion title="QA findings" defaultExpanded={false}>
        <div>Accordion content</div>
      </WorkspaceAccordion>,
    );

    expect(screen.getByRole('button', { name: /qa findings/i })).toHaveAttribute(
      'aria-expanded',
      'false',
    );

    rerender(
      <WorkspaceAccordion title="QA findings" defaultExpanded>
        <div>Accordion content</div>
      </WorkspaceAccordion>,
    );

    expect(consoleErrorSpy).not.toHaveBeenCalled();
    expect(screen.getByRole('button', { name: /qa findings/i })).toHaveAttribute(
      'aria-expanded',
      'false',
    );

    await user.click(screen.getByRole('button', { name: /qa findings/i }));

    expect(screen.getByRole('button', { name: /qa findings/i })).toHaveAttribute(
      'aria-expanded',
      'true',
    );
    expect(screen.getByText('Accordion content')).toBeVisible();

    consoleErrorSpy.mockRestore();
  });
});
