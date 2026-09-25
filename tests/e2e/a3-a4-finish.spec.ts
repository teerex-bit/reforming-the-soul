import pg from 'pg';
import { expect, test } from '@playwright/test';
import { resetLocalE2eAccount } from '../helpers/local-e2e';
import { appRuntimeUrl } from '../setup/app-runtime';
import { e2eUser } from '../fixtures/users';

test('A3 and A4 form a concise, persistent Awaken handoff', async ({ page }, testInfo) => {
  const user = e2eUser('a3-a4-stage', testInfo.project.name);
  const pool = new pg.Pool({ connectionString: process.env.TEST_DATABASE_URL });
  await resetLocalE2eAccount(user.email);
  try {
    await page.goto(appRuntimeUrl('/sign-up'));
    await page.getByLabel('Email').fill(user.email);
    await page.getByLabel('Password').fill(user.password);
    await Promise.all([page.waitForURL(/\/dashboard$/), page.getByRole('button', { name: 'Create account' }).click()]);
    for (const [slug, moduleId, reflection] of [
      ['your-reactions-have-a-history', 'awaken.your-reactions-have-a-history', 'I may have learned to withdraw when conflict felt unsafe.'],
      ['formation-is-not-identity', 'awaken.formation-is-not-identity', 'Withdrawal is learned; it is not the whole truth of me.'],
    ] as const) {
      const base = `/deep-dive/awaken/${slug}`;
      await page.goto(appRuntimeUrl(base));
      await expect(page.getByRole('region', { name: /A[34] lesson progress/ })).toBeVisible();
      await page.getByRole('button', { name: 'Continue' }).click();
      await expect(page).toHaveURL(/section=teaching$/);
      await page.getByRole('button', { name: 'Continue' }).click();
      if (slug === 'your-reactions-have-a-history') {
        await page.getByLabel('Recurring response').selectOption('Withdrawal');
        await page.getByLabel('Possible source').selectOption("I'm not sure");
        await expect(page.getByRole('region', { name: 'Your working thread' })).toContainText('Withdrawal');
      } else {
        await page.getByLabel('A pattern you recognize').fill('withdraw');
        await expect(page.getByRole('region', { name: 'Your working reframe' })).toContainText('not the whole truth');
      }
      const widths = await page.evaluate(() => ({ viewport: innerWidth, document: document.documentElement.scrollWidth }));
      expect(widths.document).toBeLessThanOrEqual(widths.viewport);
      await page.screenshot({ path: testInfo.outputPath(`${slug}-${testInfo.project.name}.png`), fullPage: true });
      await page.getByRole('button', { name: 'Continue' }).click();
      await page.getByRole('textbox', { name: /Where might|Which pattern/i }).fill(reflection);
      await page.getByRole('button', { name: 'Save & continue' }).click();
      await expect(page).toHaveURL(/section=practice$/);
      await page.goto(appRuntimeUrl(base));
      await expect(page.getByRole('heading', { level: 1, name: /Notice one possible connection|Notice without forcing an answer/ })).toBeVisible();
      await page.getByRole('button', { name: 'Continue' }).click();
      if (slug === 'formation-is-not-identity') {
        await expect(page.getByRole('heading', { level: 1, name: 'Ready to see clearly' })).toBeVisible();
        await expect(page.getByText('ASK · OPTIONAL')).toBeVisible();
      }
      await page.getByRole('button', { name: 'Complete lesson' }).click();
      await expect(page).toHaveURL(appRuntimeUrl('/deep-dive'));
      await page.getByRole('link', { name: new RegExp(`${slug === 'formation-is-not-identity' ? 'Formation Is Not Identity' : 'Your Reactions Have a History'} · A[34]`) }).click();
      await expect(page).toHaveURL(/section=entry$/);
      await page.goto(appRuntimeUrl(`${base}?section=reflection`));
      await expect(page.getByRole('region', { name: 'Your saved reflection' })).toContainText(reflection);
      const record = await pool.query('select p.last_section_id,p.completed_at,r.body from public.deep_dive_module_progress p join public.deep_dive_reflections r on (p.id,p.user_id)=(r.progress_id,r.user_id) where p.user_id=(select id from auth.users where email=$1) and p.module_id=$2', [user.email, moduleId]);
      expect(record.rows).toEqual([expect.objectContaining({ last_section_id: 'carry-forward', body: reflection })]);
      expect(record.rows[0].completed_at).toBeTruthy();
    }
  } finally { await pool.end(); await resetLocalE2eAccount(user.email); }
});

test('A3 and A4 can skip an empty reflection and resume at practice', async ({ page }, testInfo) => {
  const user = e2eUser('a3-a4-skip', testInfo.project.name);
  await resetLocalE2eAccount(user.email);
  try {
    await page.goto(appRuntimeUrl('/sign-up'));
    await page.getByLabel('Email').fill(user.email);
    await page.getByLabel('Password').fill(user.password);
    await Promise.all([page.waitForURL(/\/dashboard$/), page.getByRole('button', { name: 'Create account' }).click()]);
    for (const slug of ['your-reactions-have-a-history', 'formation-is-not-identity']) {
      const base = `/deep-dive/awaken/${slug}`;
      await page.goto(appRuntimeUrl(`${base}?section=reflection`));
      await page.getByRole('textbox', { name: /Where might|Which pattern/i }).fill('   ');
      await expect(page.getByRole('button', { name: 'Save & continue' })).toBeDisabled();
      await page.getByRole('button', { name: 'Continue without writing' }).click();
      await expect(page).toHaveURL(/section=practice$/);
      await page.goto(appRuntimeUrl(base));
      await expect(page).toHaveURL(/formation-is-not-identity$|your-reactions-have-a-history$/);
      await expect(page.getByRole('heading', { level: 1, name: /Notice one possible connection|Notice without forcing an answer/ })).toBeVisible();
    }
  } finally { await resetLocalE2eAccount(user.email); }
});
