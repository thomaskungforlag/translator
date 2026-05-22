import { render, screen } from '@testing-library/react';

import ProofreadingPage from './page';

describe('ProofreadingPage', () => {
  it('renders the dedicated proofreading route', () => {
    render(<ProofreadingPage />);

    expect(screen.getByTestId('app-shell-ready')).toBeVisible();
    expect(screen.getByRole('heading', { name: /visual proofing guidance/i })).toBeVisible();
    expect(screen.getByLabelText(/translated text/i)).toBeVisible();
    expect(screen.getByRole('link', { name: /^translate$/i })).toHaveAttribute(
      'href',
      '/translate',
    );
    expect(screen.queryByRole('button', { name: /run pipeline/i })).not.toBeInTheDocument();
  });
});
