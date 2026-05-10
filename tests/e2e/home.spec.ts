import { expect, test } from '@playwright/test';

test.describe('translation studio smoke', () => {
  test('renders the home screen and supports segment switching', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    await expect(page.getByTestId('studio-shell-ready')).toHaveAttribute('data-hydrated', 'true');

    await expect(
      page.getByRole('heading', { name: /thomas kung author translation studio/i }),
    ).toBeVisible();
    await expect(page.getByRole('button', { name: /run pipeline/i })).toBeVisible();
    await expect(page.getByRole('button', { name: /export markdown/i })).toBeVisible();

    await page.getByTestId('segment-select-3').dispatchEvent('click');

    await expect(page.getByTestId('selected-segment-text')).toHaveText(
      'Någonstans längre bort svarade Skuggskeppet i mörkret.',
    );
  });
});
