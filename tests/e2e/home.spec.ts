import { expect, test } from '@playwright/test';

test.describe('route-based editorial smoke', () => {
  test('navigates from home into proofreading and shows highlights', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    await expect(page.getByRole('heading', { name: /choose a workspace/i })).toBeVisible();
    await expect(page.getByRole('link', { name: /open proofreading workspace/i })).toBeVisible();
    await expect(page.getByRole('link', { name: /open translation workspace/i })).toBeVisible();

    await page.getByRole('link', { name: /open proofreading workspace/i }).click();

    await expect(page).toHaveURL(/\/proofreading$/);
    await expect(page.getByTestId('app-shell-ready')).toBeVisible();
    await expect(page.getByRole('heading', { name: /visual proofing guidance/i })).toBeVisible();

    await page
      .getByLabel(/translated text/i)
      .fill('The the room was very quiet. It was closed by the guard.');

    await expect(page.getByTestId('proofreading-highlight')).toHaveCount(3);
    await expect(page.getByText(/repeated word detected/i)).toBeVisible();
    await expect(page.getByText(/weak modifier detected/i)).toBeVisible();
    await expect(page.getByText(/passive construction detected/i)).toBeVisible();
  });

  test('opens the translation route from the home screen', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    await page.getByRole('link', { name: /open translation workspace/i }).click();

    await expect(page).toHaveURL(/\/translate$/);
    await expect(
      page.getByRole('heading', { name: /thomas kung author translation studio/i }),
    ).toBeVisible();
    await expect(
      page.getByTestId('workspace-actions-toolbar').getByRole('button', {
        name: /run pipeline/i,
      }),
    ).toBeVisible();
    await expect(page.getByTestId('app-shell-ready')).toBeVisible();
  });
});
