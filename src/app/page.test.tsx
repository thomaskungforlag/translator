import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import HomePage from './page';

describe('HomePage', () => {
  it('renders the workspace and lets the source metadata be changed', async () => {
    const user = userEvent.setup();

    render(<HomePage />);

    expect(
      screen.getByRole('heading', { name: /thomas kung author translation studio/i }),
    ).toBeVisible();
    expect(screen.getAllByRole('button', { name: /run pipeline/i })[0]).toBeVisible();
    expect(screen.getAllByRole('button', { name: /export markdown/i })[0]).toBeVisible();
    expect(screen.getByLabelText(/source text/i)).toHaveValue('');

    await user.click(screen.getByRole('combobox', { name: /content type/i }));
    await user.click(screen.getByRole('option', { name: /website copy/i }));
    expect(screen.getByRole('combobox', { name: /content type/i })).toHaveTextContent(
      /website copy/i,
    );

    await user.click(screen.getByRole('combobox', { name: /target language/i }));
    await user.click(screen.getByRole('option', { name: /french/i }));
    expect(screen.getByRole('combobox', { name: /target language/i })).toHaveTextContent(/french/i);
  });
});
