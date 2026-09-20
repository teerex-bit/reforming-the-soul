import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { assertNoLiveAiCredentials } from '../setup/e2e';

assertNoLiveAiCredentials();

test('@a11y Overview authority has no critical or serious automated violations', async ({ page }) => {
  await page.goto('/overview/');
  const results = await new AxeBuilder({ page }).analyze();
  const blockers = results.violations.filter(violation => ['critical', 'serious'].includes(violation.impact ?? ''));
  expect(blockers).toEqual([]);
});
