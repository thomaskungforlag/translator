import { render, screen } from '@testing-library/react';

import HomePage from './page';

describe('HomePage', () => {
  it('renders the landing page and links to the dedicated routes', () => {
    render(<HomePage />);

    expect(screen.getByRole('heading', { name: /choose a workspace/i })).toBeVisible();
    expect(screen.getByRole('link', { name: /^proofreading$/i })).toHaveAttribute(
      'href',
      '/proofreading',
    );
    expect(screen.getByRole('link', { name: /^translate$/i })).toHaveAttribute(
      'href',
      '/translate',
    );
    expect(screen.getByRole('link', { name: /open proofreading workspace/i })).toHaveAttribute(
      'href',
      '/proofreading',
    );
    expect(screen.getByRole('link', { name: /open translation workspace/i })).toHaveAttribute(
      'href',
      '/translate',
    );
    expect(screen.queryByLabelText(/translated text/i)).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /run pipeline/i })).not.toBeInTheDocument();
  });
});
