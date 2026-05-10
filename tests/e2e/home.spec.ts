import { expect, test } from '@playwright/test';

test.describe('translation studio smoke', () => {
  test('renders the home screen and runs the pipeline', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    await expect(page.getByTestId('studio-shell-ready')).toHaveAttribute('data-hydrated', 'true');

    await expect(
      page.getByRole('heading', { name: /thomas kung author translation studio/i }),
    ).toBeVisible();
    await expect(page.getByRole('button', { name: /run pipeline/i }).first()).toBeVisible();
    await expect(page.getByRole('button', { name: /export markdown/i }).first()).toBeVisible();

    await page.getByLabel(/source text/i).fill('Det hade börjat snöa när hon såg ljuset igen.');
    await page
      .getByRole('button', { name: /run pipeline/i })
      .first()
      .click();

    await expect(page.getByTestId('selected-segment-text')).toHaveText(
      'Det hade börjat snöa när hon såg ljuset igen.',
    );
  });
});
