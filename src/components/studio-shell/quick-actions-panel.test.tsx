import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import { QuickActionsPanel } from './quick-actions-panel';

describe('QuickActionsPanel', () => {
  it('renders copy actions and triggers callbacks', async () => {
    const user = userEvent.setup();
    const onCopyFinalText = jest.fn();
    const onCopyQaSummary = jest.fn();

    render(
      <QuickActionsPanel onCopyFinalText={onCopyFinalText} onCopyQaSummary={onCopyQaSummary} />,
    );

    await user.click(screen.getByRole('button', { name: /copy final text/i }));
    await user.click(screen.getByRole('button', { name: /copy qa summary/i }));

    expect(onCopyFinalText).toHaveBeenCalledTimes(1);
    expect(onCopyQaSummary).toHaveBeenCalledTimes(1);
  });
});
