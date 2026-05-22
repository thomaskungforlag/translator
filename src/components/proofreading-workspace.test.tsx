import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import { ProofreadingWorkspace } from './proofreading-workspace';

describe('ProofreadingWorkspace', () => {
  it('highlights suspicious phrases after the user pastes translated text', async () => {
    const user = userEvent.setup();

    render(<ProofreadingWorkspace />);

    await user.type(
      screen.getByLabelText(/translated text/i),
      'The the room was very quiet. It was closed by the guard.',
    );

    expect(screen.getByText(/proofreading guidance/i)).toBeVisible();
    expect(screen.getAllByTestId('proofreading-highlight')).toHaveLength(3);
    expect(screen.getByText(/repeated word/i)).toBeVisible();
    expect(screen.getByText(/weak modifier/i)).toBeVisible();
    expect(screen.getByText(/passive construction/i)).toBeVisible();
  });
});
