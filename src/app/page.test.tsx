import { render, screen } from '@testing-library/react';

import HomePage from './page';
import { demoSourceText } from '@/lib/demo-workspace';

describe('HomePage', () => {
  it('renders the workspace and core actions', () => {
    render(<HomePage />);

    expect(
      screen.getByRole('heading', { name: /thomas kung author translation studio/i }),
    ).toBeVisible();
    expect(screen.getAllByRole('button', { name: /run pipeline/i })[0]).toBeVisible();
    expect(screen.getAllByRole('button', { name: /export markdown/i })[0]).toBeVisible();
    expect(screen.getByLabelText(/source text/i)).toHaveValue(demoSourceText);
  });
});
