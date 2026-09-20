import { test, expect } from '@playwright/test';
import { assertNoLiveAiCredentials } from '../setup/e2e';

assertNoLiveAiCredentials();

test('browser harness serves the Overview authority at the configured viewport', async ({ page }, testInfo) => {
  await page.goto('/overview/');
  await expect(page.getByRole('heading', { name: 'A High-Level Overview' })).toBeVisible();
  expect(await page.evaluate(() => window.innerWidth)).toBe(testInfo.project.use.viewport?.width);
});
