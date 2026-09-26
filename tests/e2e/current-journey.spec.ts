import { test, expect } from '@playwright/test';
import { appRuntimeUrl } from '../setup/app-runtime';
import { e2eUser } from '../fixtures/users';
import { resetLocalE2eAccount } from '../helpers/local-e2e';

test('dashboard resumes the guided curriculum and historical lesson links redirect into it', async ({ page }, testInfo) => {
  const { email, password } = e2eUser('current-journey', testInfo.project.name);
  await resetLocalE2eAccount(email);
  await page.goto(appRuntimeUrl('/sign-up'));
  await page.getByLabel('Email').fill(email);
  await page.getByLabel('Password').fill(password);
  await Promise.all([page.waitForURL(/\/dashboard$/), page.getByRole('button', { name: 'Create account' }).click()]);
  await expect(page.getByRole('link', { name: 'Resume' })).toHaveAttribute('href', '/deep-dive/awaken/pay-attention');
  await page.goto(appRuntimeUrl('/formation/see-clearly.fact'));
  await expect(page).toHaveURL(/\/deep-dive\/awaken\/pay-attention$/);
  await expect(page.getByRole('heading', { name: 'Pay Attention' })).toBeVisible();
  await page.goto(appRuntimeUrl('/'));
  await expect(page).toHaveURL(/\/deep-dive$/);
  await page.goto(appRuntimeUrl('/overview/'));
  await expect(page.getByRole('heading', { name: 'A High-Level Overview' })).toBeVisible();
});
