import { render, screen } from '@testing-library/react';

import HomePage from './page';

describe('HomePage', () => {
  it('renders the studio shell and core actions', () => {
    render(<HomePage />);

    expect(
      screen.getByRole('heading', { name: /thomas kung author translation studio/i }),
    ).toBeVisible();
    expect(screen.getByRole('button', { name: /run pipeline/i })).toBeVisible();
    expect(screen.getByRole('button', { name: /export markdown/i })).toBeVisible();
    expect(
      screen.getByText(
        /locked glossary term skuggskeppet must remain capitalized as the shadow ship/i,
      ),
    ).toBeVisible();
  });
});
