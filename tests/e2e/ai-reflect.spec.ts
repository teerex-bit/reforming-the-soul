import { expect, test } from '@playwright/test';
import { resetLocalE2eAccount } from '../helpers/local-e2e';
import { appRuntimeUrl } from '../setup/app-runtime';

test('current-entry AI Reflect asks a bounded question and saves only confirmed user wording', async ({ page }, testInfo) => {
  const email = `ai-reflect-${testInfo.project.name}@rts.test`;
  const password = 'local-e2e-only-password';
  await resetLocalE2eAccount(email);
  try {
    await page.goto(appRuntimeUrl('/sign-up'));
    await page.getByLabel('Email').fill(email);
    await page.getByLabel('Password').fill(password);
    await Promise.all([page.waitForURL(/\/dashboard$/), page.getByRole('button', { name: 'Create account' }).click()]);
    await page.goto(appRuntimeUrl('/formation/awaken.pay-attention.observe'));
    await page.getByLabel('What happened?').fill('A plan changed during the meeting.');
    await page.getByLabel('What happened inside me?').fill('I felt overlooked.');
    await page.getByLabel('What did you notice in your body?').fill('My jaw tightened.');
    await page.getByRole('button', { name: 'Save and continue' }).click();
    await page.getByRole('button', { name: 'Reflect with AI' }).click();
    await expect(page.getByText('What did you notice just before your body responded?')).toBeVisible();
    await expect(page.getByText('AI reflection')).toBeVisible();
    await page.getByLabel('What would you like to save in your own words?').fill('  I was bracing for rejection.  ');
    await page.getByRole('button', { name: 'Save my added insight' }).click();
    await expect(page).toHaveURL(/\/formation\/bridge\.awaken-see-clearly$/);
  } finally {
    await resetLocalE2eAccount(email);
  }
});
