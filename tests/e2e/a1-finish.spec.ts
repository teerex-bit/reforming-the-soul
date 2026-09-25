import pg from 'pg';
import { expect, test } from '@playwright/test';
import { resetLocalE2eAccount } from '../helpers/local-e2e';
import { appRuntimeUrl } from '../setup/app-runtime';
import { e2eUser } from '../fixtures/users';

async function advance(page: import('@playwright/test').Page, action: string, sectionNumber: number) {
  await page.getByRole('button', { name: action }).click();
  await expect(page.getByRole('progressbar', { name: `Section ${sectionNumber} of 9` })).toBeVisible();
}

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
    await expect(page.getByRole('region', { name: 'A1 lesson progress' })).toBeVisible();
    await expect(page.locator('.deep-dive-lesson-meta')).toHaveCount(0);

    await advance(page, 'Begin', 2);
    await expect(page).toHaveURL(/section=moment$/);
    await expect(page.getByRole('group', { name: 'A message on your phone' })).toBeVisible();
    await page.screenshot({ path: testInfo.outputPath(`a1-pause-${testInfo.project.name}.png`), fullPage: true });
    await advance(page, 'Notice it', 3);
    await expect(page.getByRole('group', { name: 'What happened around you' })).toBeVisible();
    await expect(page.getByRole('group', { name: 'What happened inside you' })).toBeVisible();
    await page.screenshot({ path: testInfo.outputPath(`a1-outside-inside-${testInfo.project.name}.png`), fullPage: true });
    await advance(page, 'Keep going', 4);
    await advance(page, 'Continue', 5);
    await advance(page, 'Continue', 6);

    await expect(page.getByRole('heading', { level: 1, name: 'Notice a real moment' })).toBeVisible();
    await page.getByLabel(/What happened\?/).fill(reflection);
    await page.getByRole('button', { name: 'Save & continue' }).click();
    await expect(page).toHaveURL(/section=go-deeper$/);
    await expect(page.getByRole('progressbar', { name: 'Section 7 of 9' })).toBeVisible();
    await expect(page.getByRole('heading', { level: 1, name: 'Outside and inside' })).toBeVisible();
    await advance(page, 'Continue', 8);
    await expect(page.getByRole('heading', { level: 1, name: 'Take this into your day' })).toBeVisible();
    await advance(page, 'Continue', 9);
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
    await expect(page.getByRole('link', { name: 'Pay Attention' })).toBeVisible();
    await page.getByRole('link', { name: 'Pay Attention' }).click();
    await expect(page.getByRole('link', { name: '← Back' })).toBeVisible();
    await expect(page.getByRole('link', { name: /Review lesson from beginning/ })).toHaveCount(0);

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

test('A1 continues without writing and resumes at the next section', async ({ page }, testInfo) => {
  const user = e2eUser('a1-no-reflection', testInfo.project.name);
  const pool = new pg.Pool({ connectionString: process.env.TEST_DATABASE_URL });
  await resetLocalE2eAccount(user.email);
  try {
    await page.goto(appRuntimeUrl('/sign-up'));
    await page.getByLabel('Email').fill(user.email);
    await page.getByLabel('Password').fill(user.password);
    await Promise.all([page.waitForURL(/\/dashboard$/), page.getByRole('button', { name: 'Create account' }).click()]);
    await page.goto(appRuntimeUrl('/deep-dive/awaken/pay-attention?section=reflection'));
    await expect(page.getByRole('button', { name: 'Save & continue' })).toBeDisabled();
    await page.getByRole('textbox').fill('   ');
    await expect(page.getByRole('button', { name: 'Save & continue' })).toBeDisabled();
    await page.getByRole('button', { name: 'Continue without writing' }).click();
    await expect(page).toHaveURL(/section=go-deeper$/);
    await page.goto(appRuntimeUrl('/deep-dive/awaken/pay-attention'));
    await expect(page).toHaveURL(/pay-attention$/);
    await expect(page.getByRole('heading', { name: 'Outside and inside' })).toBeVisible();
    const state = await pool.query(`select p.last_section_id, r.body from public.deep_dive_module_progress p left join public.deep_dive_reflections r on (r.progress_id,r.user_id)=(p.id,p.user_id) where p.user_id=(select id from auth.users where email=$1) and p.module_id='awaken.pay-attention'`, [user.email]);
    expect(state.rows).toEqual([expect.objectContaining({ last_section_id: 'go-deeper', body: null })]);
  } finally {
    await pool.end();
    await resetLocalE2eAccount(user.email);
  }
});
