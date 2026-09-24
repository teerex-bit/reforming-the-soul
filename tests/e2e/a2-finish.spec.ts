import pg from 'pg';
import { expect, test } from '@playwright/test';
import { resetLocalE2eAccount } from '../helpers/local-e2e';
import { appRuntimeUrl } from '../setup/app-runtime';
import { e2eUser } from '../fixtures/users';

test('A2 saves, resumes, and completes with an isolated account on mobile and desktop', async ({ page }, testInfo) => {
  const user = e2eUser('a2-catch-yourself', testInfo.project.name);
  const reflection = 'I often withdraw when I think someone is disappointed in me.';
  const pool = new pg.Pool({ connectionString: process.env.TEST_DATABASE_URL });
  await resetLocalE2eAccount(user.email);

  try {
    await page.goto(appRuntimeUrl('/sign-up'));
    await page.getByLabel('Email').fill(user.email);
    await page.getByLabel('Password').fill(user.password);
    await Promise.all([
      page.waitForURL(/\/dashboard$/),
      page.getByRole('button', { name: 'Create account' }).click(),
    ]);

    await page.goto(appRuntimeUrl('/deep-dive/awaken/catch-yourself-being-you'));
    await expect(page.getByRole('heading', { level: 1, name: 'Catch Yourself Being You' })).toBeVisible();
    await expect(page.getByRole('progressbar', { name: 'Section 1 of 7' })).toHaveJSProperty('value', 1);
    await page.getByRole('button', { name: 'Begin' }).click();
    await expect(page).toHaveURL(/section=patterns$/);
    await page.getByRole('button', { name: 'Continue' }).click();
    await expect(page.getByRole('heading', { level: 1, name: 'Seeing clearly' })).toBeVisible();
    await expect(page.getByRole('figure', { name: 'James 1:23–24 Scripture passage' })).toBeVisible();
    await page.getByRole('button', { name: 'Continue' }).click();
    await expect(page.getByRole('heading', { level: 1, name: 'What are you beginning to recognize?' })).toBeVisible();
    await page.getByLabel(/write about any of these questions/i).fill(reflection);
    await page.getByRole('button', { name: 'Save reflection' }).click();
    await expect(page.getByRole('status')).toHaveText('Reflection saved.');
    await page.getByRole('button', { name: 'Keep going' }).click();
    await expect(page.getByRole('heading', { level: 1, name: 'Try finishing a few sentences' })).toBeVisible();
    await page.getByRole('button', { name: 'Continue' }).click();
    await expect(page.getByRole('heading', { level: 1, name: 'Notice the next repetition' })).toBeVisible();
    await page.getByRole('button', { name: 'Continue' }).click();
    await expect(page.getByRole('heading', { level: 1, name: 'A pattern is something you can notice' })).toBeVisible();

    const widths = await page.evaluate(() => ({ viewport: window.innerWidth, document: document.documentElement.scrollWidth }));
    expect(widths.document).toBeLessThanOrEqual(widths.viewport);
    await page.screenshot({ path: testInfo.outputPath(`a2-${testInfo.project.name}.png`), fullPage: true });

    await Promise.all([
      page.waitForURL(/\/sign-in$/),
      page.getByRole('button', { name: 'Sign out' }).click(),
    ]);
    await page.getByLabel('Email').fill(user.email);
    await page.getByLabel('Password').fill(user.password);
    await Promise.all([
      page.waitForURL(/\/dashboard$/),
      page.getByRole('button', { name: 'Sign in' }).click(),
    ]);
    await page.goto(appRuntimeUrl('/deep-dive/awaken/catch-yourself-being-you'));
    await expect(page.getByRole('progressbar', { name: 'Section 7 of 7' })).toHaveJSProperty('value', 7);
    await expect(page.getByRole('heading', { level: 1, name: 'A pattern is something you can notice' })).toBeVisible();
    await page.getByRole('button', { name: 'Complete lesson' }).click();
    await expect(page).toHaveURL(appRuntimeUrl('/deep-dive'));

    const persisted = await pool.query(
      `select p.last_section_id, p.completed_at, r.body
       from public.deep_dive_module_progress p
       join public.deep_dive_reflections r on (r.progress_id,r.user_id)=(p.id,p.user_id)
       where p.user_id=(select id from auth.users where email=$1)
         and p.module_id='awaken.catch-yourself-being-you' and r.prompt_id='first-response'`,
      [user.email],
    );
    expect(persisted.rows).toEqual([expect.objectContaining({ last_section_id: 'carry-forward', body: reflection })]);
    expect(persisted.rows[0].completed_at).toBeTruthy();
    const a1 = await pool.query(
      `select id from public.deep_dive_module_progress
       where user_id=(select id from auth.users where email=$1) and module_id='awaken.pay-attention'`,
      [user.email],
    );
    expect(a1.rows).toEqual([]);
  } finally {
    await pool.end();
    await resetLocalE2eAccount(user.email);
  }
});
