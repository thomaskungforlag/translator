import { render, screen } from '@testing-library/react';

import TranslatePage from './page';

describe('TranslatePage', () => {
  it('renders the dedicated translation route', () => {
    render(<TranslatePage />);

    expect(screen.getByTestId('app-shell-ready')).toBeVisible();
    expect(
      screen.getByRole('heading', { name: /thomas kung author translation studio/i }),
    ).toBeVisible();
    expect(screen.getAllByRole('button', { name: /run pipeline/i })[0]).toBeVisible();
    expect(screen.getByRole('link', { name: /^proofreading$/i })).toHaveAttribute(
      'href',
      '/proofreading',
    );
    expect(screen.getByLabelText(/source text/i)).toBeVisible();
  });
});
