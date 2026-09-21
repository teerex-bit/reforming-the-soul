import { expect, test } from '@playwright/test';
import { resetLocalE2eAccount } from '../helpers/local-e2e';
import { appRuntimeUrl } from '../setup/app-runtime';

test('Awaken observation resumes at the last incomplete interaction after signing in again', async ({ page }, testInfo) => {
  const email = `awaken-resume-${testInfo.project.name}@rts.test`;
  const password = 'local-e2e-only-password';
  await resetLocalE2eAccount(email);
  try {
    await page.goto(appRuntimeUrl('/sign-up'));
    await page.getByLabel('Email').fill(email);
    await page.getByLabel('Password').fill(password);
    await Promise.all([
      page.waitForURL(/\/dashboard$/),
      page.getByRole('button', { name: 'Create account' }).click(),
    ]);
    await page.goto(appRuntimeUrl('/formation/awaken.pay-attention.observe'));
    await page.getByLabel('What happened?').fill('  an event\nwith exact spacing  ');
    await page.getByLabel('What happened inside me?').fill('a response');
    await page.getByLabel('What did you notice in your body?').fill('tight shoulders');
    await page.getByRole('button', { name: 'Save and continue' }).click();
    await expect(page).toHaveURL(/\/formation\/awaken\.pay-attention\.reflect$/);
    await Promise.all([
      page.waitForURL(/\/sign-in$/),
      page.getByRole('button', { name: 'Sign out' }).click(),
    ]);
    await page.getByLabel('Email').fill(email);
    await page.getByLabel('Password').fill(password);
    await Promise.all([
      page.waitForURL(/\/dashboard$/),
      page.getByRole('button', { name: 'Sign in' }).click(),
    ]);
    await expect(page.getByRole('link', { name: 'Resume' })).toHaveAttribute('href', '/formation/awaken.pay-attention.reflect');
  } finally {
    await resetLocalE2eAccount(email);
  }
});
