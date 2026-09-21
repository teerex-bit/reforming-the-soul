import { expect, test } from '@playwright/test';
import { appRuntimeUrl } from '../setup/app-runtime';

test('anonymous visitors are redirected away from protected application routes', async ({ page }) => {
  await page.goto(appRuntimeUrl('/dashboard'));

  await expect(page).toHaveURL(/\/sign-in\?next=%2Fdashboard$/);
  await expect(page.getByRole('heading', { name: 'Sign in' })).toBeVisible();
});
