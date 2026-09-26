// Retired Phase 1 participant UI remains covered at its data/service boundary.
// Current navigation is tested in current-journey.spec.ts.
import { expect, test } from '@playwright/test';
import { resetLocalE2eAccount } from '../helpers/local-e2e';
import { appRuntimeUrl } from '../setup/app-runtime';

test.skip('Awaken through fake AI Reflect enters See Clearly and resumes at Become', async ({ page }, testInfo) => {
  const email = `see-clearly-${testInfo.project.name}@rts.test`;
  const password = 'local-e2e-only-password';
  await resetLocalE2eAccount(email);
  try {
    await page.goto(appRuntimeUrl('/sign-up'));
    await page.getByLabel('Email').fill(email); await page.getByLabel('Password').fill(password);
    await Promise.all([page.waitForURL(/\/dashboard$/), page.getByRole('button', { name: 'Create account' }).click()]);
    await page.goto(appRuntimeUrl('/formation/awaken.pay-attention.observe'));
    await page.getByLabel('What happened?').fill('The meeting ended early.');
    await page.getByLabel('What happened inside me?').fill('I felt dismissed.');
    await page.getByLabel('What did you notice in your body?').fill('Tight shoulders.');
    await page.getByRole('button', { name: 'Save and continue' }).click();
    await page.getByRole('button', { name: 'Reflect with AI' }).click();
    await expect(page.getByText('What did you notice just before your body responded?')).toBeVisible();
    await page.getByLabel('What would you like to save in your own words?').fill('I expected not to be heard.');
    await page.getByRole('button', { name: 'Save my added insight' }).click();
    await page.getByRole('link', { name: 'Continue' }).click();
    await page.getByLabel('What is the observable fact?').fill('The meeting ended ten minutes early.');
    await page.getByLabel('What is my interpretation?').fill('My contribution was unwanted.');
    await page.getByRole('radio', { name: 'expectation' }).check();
    await page.locator('textarea[name="belief_expectation_text"]').fill('I expect people to dismiss me.');
    await page.getByRole('button', { name: 'Save and continue' }).click();
    await expect(page).toHaveURL(/\/formation\/bridge\.see-clearly-become$/);
    await expect(page.getByRole('heading', { name: 'Become in the present moment' })).toBeVisible();
    await page.getByRole('button', { name: 'Sign out' }).click();
    await page.getByLabel('Email').fill(email); await page.getByLabel('Password').fill(password);
    await Promise.all([page.waitForURL(/\/dashboard$/), page.getByRole('button', { name: 'Sign in' }).click()]);
    await expect(page.getByRole('link', { name: 'Resume' })).toHaveAttribute('href','/formation/bridge.see-clearly-become');
  } finally { await resetLocalE2eAccount(email); }
});
