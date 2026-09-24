import pg from 'pg';
import { expect, test } from '@playwright/test';
import { resetLocalE2eAccount } from '../helpers/local-e2e';
import { appRuntimeUrl } from '../setup/app-runtime';
import { e2eUser } from '../fixtures/users';

test('Awaken introduction and A1 complete responsively with confirmed reflection and resume', async ({ page }, testInfo) => {
  const user = e2eUser('a1-finish', testInfo.project.name);
  const reflection = 'I felt dismissed before I knew why.';
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

    await page.goto(appRuntimeUrl('/deep-dive'));
    await page.getByRole('link', { name: 'Begin', exact: true }).click();
    await expect(page.getByRole('heading', { level: 1, name: 'Awaken' })).toBeVisible();
    await expect(page.getByText(/Awareness comes before correction or change/)).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Pay Attention' })).not.toBeVisible();
    await page.getByRole('link', { name: 'Begin Pay Attention' }).click();
    await expect(page.getByRole('heading', { level: 1, name: 'Pay Attention' })).toBeVisible();
    await expect(page.getByRole('img', { name: 'Reforming the Soul' })).toHaveAttribute('src', '/assets/logos/rts-tree-wordmark.png');
    await expect(page.getByRole('progressbar', { name: 'Section 1 of 9' })).toHaveJSProperty('value', 1);

    await page.getByRole('button', { name: 'Begin' }).click();
    await expect(page).toHaveURL(/section=moment$/);
    await page.getByRole('button', { name: 'Notice it' }).click();
    await page.getByRole('button', { name: 'Keep going' }).click();
    await page.getByRole('button', { name: 'Continue' }).click();
    await page.getByRole('button', { name: 'Continue' }).click();

    await expect(page.getByRole('heading', { level: 1, name: 'Notice a real moment' })).toBeVisible();
    await page.getByLabel(/What happened\?/).fill(reflection);
    await page.getByRole('button', { name: 'Save reflection' }).click();
    await expect(page.getByRole('status')).toHaveText('Reflection saved.');

    await page.getByRole('button', { name: 'Continue' }).click();
    await expect(page.getByRole('heading', { level: 1, name: 'Outside and inside' })).toBeVisible();
    await page.getByRole('button', { name: 'Continue' }).click();
    await expect(page.getByRole('heading', { level: 1, name: 'Take this into your day' })).toBeVisible();
    await page.getByRole('button', { name: 'Continue' }).click();
    await expect(page.getByRole('heading', { level: 1, name: 'Keep noticing' })).toBeVisible();

    const widths = await page.evaluate(() => ({ viewport: window.innerWidth, document: document.documentElement.scrollWidth }));
    expect(widths.document).toBeLessThanOrEqual(widths.viewport);
    await page.screenshot({ path: testInfo.outputPath(`a1-${testInfo.project.name}.png`), fullPage: true });

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
    await page.goto(appRuntimeUrl('/deep-dive'));
    await page.getByRole('link', { name: 'Continue where I left off' }).click();
    await expect(page).toHaveURL(/section=carry-forward$/);
    await expect(page.getByRole('heading', { level: 1, name: 'Keep noticing' })).toBeVisible();
    await page.getByRole('button', { name: 'Complete lesson' }).click();
    await expect(page).toHaveURL(appRuntimeUrl('/deep-dive'));
    await expect(page.getByRole('link', { name: 'Open lesson' })).toBeVisible();

    const persisted = await pool.query(
      `select p.last_section_id, p.completed_at, r.body
       from public.deep_dive_module_progress p
       left join public.deep_dive_reflections r on (r.progress_id,r.user_id)=(p.id,p.user_id)
       where p.user_id=(select id from auth.users where email=$1)
         and p.module_id='awaken.pay-attention' and r.prompt_id='real-moment'`,
      [user.email],
    );
    expect(persisted.rows).toEqual([expect.objectContaining({ last_section_id: 'carry-forward', body: reflection })]);
    expect(persisted.rows[0].completed_at).toBeTruthy();
  } finally {
    await pool.end();
    await resetLocalE2eAccount(user.email);
  }
});
