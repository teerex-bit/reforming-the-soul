import pg from 'pg';
import { expect, test } from '@playwright/test';
import { resetLocalE2eAccount } from '../helpers/local-e2e';
import { appRuntimeUrl } from '../setup/app-runtime';
import { e2eUser } from '../fixtures/users';
import { SG3_SECTIONS } from '../../content/deep-dive/v1/see-clearly/sg3';

const base = '/deep-dive/see-clearly/jesus-shows-us-the-father';
const prerequisites = ['awaken.pay-attention', 'awaken.catch-yourself-being-you', 'awaken.your-reactions-have-a-history',
  'awaken.formation-is-not-identity', 'see-clearly.sc1', 'see-clearly.sy2', 'see-clearly.sy3', 'see-clearly.sy4',
  'see-clearly.sg1', 'see-clearly.sg2'];

async function signUp(page: import('@playwright/test').Page, email: string, password: string) {
  await page.goto(appRuntimeUrl('/sign-up'));
  await page.getByLabel('Email').fill(email); await page.getByLabel('Password').fill(password);
  await Promise.all([page.waitForURL(/\/dashboard$/), page.getByRole('button', { name: 'Create account' }).click()]);
}
async function seedPrerequisites(pool: pg.Pool, owner: string) {
  await pool.query(`insert into public.deep_dive_module_progress(user_id,curriculum_version_id,module_id,last_section_id,completed_at)
    select $1,'phase-1-v1',id,'carry-forward',now() from unnest($2::text[]) id`, [owner, prerequisites]);
  const sg2 = (await pool.query<{ id: string }>(`select id from public.deep_dive_module_progress where user_id=$1 and module_id='see-clearly.sg2'`, [owner])).rows[0].id;
  await pool.query(`insert into public.see_clearly_sg2_records(user_id,progress_id,situation,expectation)
    values($1,$2,'  Waiting for an answer.  ','  I expected silence.  ')`, [owner, sg2]);
}

test('SG3 guided observation, review and deletion preserve exact participant state', async ({ page }, testInfo) => {
  const user = e2eUser('sg3-guided', testInfo.project.name);
  const pool = new pg.Pool({ connectionString: process.env.TEST_DATABASE_URL });
  await resetLocalE2eAccount(user.email);
  try {
    await signUp(page, user.email, user.password);
    await page.goto(appRuntimeUrl(base));
    await expect(page).toHaveURL(/\/deep-dive\/see-clearly#see-god-heading$/);
    const owner = (await pool.query<{ id: string }>('select id from auth.users where email=$1', [user.email])).rows[0].id;
    await seedPrerequisites(pool, owner);
    await page.goto(appRuntimeUrl('/deep-dive/see-clearly'));
    await expect(page.getByRole('link', { name: 'Begin SG3' })).toBeVisible();
    await page.goto(appRuntimeUrl(`${base}?section=carry-forward`));
    await expect(page.getByRole('heading', { name: 'Look at Jesus' })).toBeVisible();
    for (const section of SG3_SECTIONS.slice(1, 4)) {
      await page.getByRole('button', { name: section.id === 'scripture' ? 'Begin' : 'Continue' }).click();
      await expect(page).toHaveURL(new RegExp(`section=${section.id}$`));
    }
    await expect(page.getByText('My earlier expectation (optional)')).toBeVisible();
    await page.getByText('My earlier expectation (optional)').click();
    await expect(page.getByText('  I expected silence.  ')).toBeVisible();
    for (const width of [375, 768, 1536]) {
      await page.setViewportSize({ width, height: 900 });
      await expect(page.getByLabel('When I look at Jesus here, what do I notice about God?')).toBeVisible();
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
      await page.screenshot({ path: testInfo.outputPath(`sg3-observation-${width}.png`), fullPage: true });
    }
    const field = page.getByLabel('When I look at Jesus here, what do I notice about God?');
    await field.focus(); await expect(field).toBeFocused();
    await field.fill('  Jesus stayed with Peter after his failure.  ');
    await page.getByRole('button', { name: 'Save & continue' }).click();
    await expect(page).toHaveURL(/section=reflection$/);
    await page.goto(appRuntimeUrl(base));
    await expect(page.getByRole('heading', { name: 'Notice the difference' })).toBeVisible();
    await page.getByRole('link', { name: /Back/ }).click();
    await expect(field).toHaveValue('  Jesus stayed with Peter after his failure.  ');
    await page.getByRole('button', { name: 'Continue without saving' }).click();
    await page.getByLabel('What feels familiar or surprising as you look at Jesus?').fill('  Mercy and truth appear together.  ');
    await page.getByRole('button', { name: 'Save & continue' }).click();
    await page.getByRole('button', { name: 'Complete lesson' }).click();
    await expect(page.getByRole('link', { name: /SG4 is next/ })).toBeVisible();
    const query = `select p.completed_at,p.updated_at,r.observation,f.body from public.deep_dive_module_progress p
      left join public.see_clearly_sg3_records r on r.progress_id=p.id
      left join public.deep_dive_reflections f on f.progress_id=p.id and f.prompt_id='sg3-reflection'
      where p.user_id=$1 and p.module_id='see-clearly.sg3'`;
    const before = (await pool.query(query, [owner])).rows;
    expect(before[0]).toMatchObject({ observation: '  Jesus stayed with Peter after his failure.  ', body: '  Mercy and truth appear together.  ' });
    expect(before[0].completed_at).toBeTruthy();
    await page.goto(appRuntimeUrl('/deep-dive/see-clearly'));
    await page.getByRole('link', { name: 'Review SG3' }).click();
    for (const section of SG3_SECTIONS.slice(1)) await page.getByRole('link', { name: 'Continue', exact: true }).click();
    expect((await pool.query(query, [owner])).rows).toEqual(before);
    await page.goto(appRuntimeUrl(`${base}?section=observation`));
    await field.fill('  Jesus restores without denying failure.  ');
    await page.getByRole('button', { name: 'Save changes' }).click();
    await expect(page.getByRole('status')).toContainText('Your observation was saved.');
    await page.getByRole('button', { name: 'Delete saved observation' }).click();
    await expect(field).toHaveValue('');
    await page.reload(); await expect(field).toHaveValue('');
    await pool.query(`delete from public.see_clearly_sg2_records where user_id=$1`, [owner]);
    await page.reload();
    await expect(page.getByText('My earlier expectation (optional)')).toHaveCount(0);
    expect((await pool.query(query, [owner])).rows[0]).toMatchObject({ observation: null, body: before[0].body, completed_at: before[0].completed_at });
    await page.goto(appRuntimeUrl(`${base}?section=reflection`));
    await page.getByRole('button', { name: 'Delete reflection' }).click();
    await expect(page.getByLabel('What feels familiar or surprising as you look at Jesus?')).toHaveValue('');
    expect((await pool.query(query, [owner])).rows[0]).toMatchObject({ body: null, completed_at: before[0].completed_at });
  } finally { await pool.end(); await resetLocalE2eAccount(user.email); }
});

test('SG3 optional observation and reflection can both be skipped', async ({ page }, testInfo) => {
  const user = e2eUser('sg3-skip', testInfo.project.name);
  const pool = new pg.Pool({ connectionString: process.env.TEST_DATABASE_URL });
  await resetLocalE2eAccount(user.email);
  try {
    await signUp(page, user.email, user.password);
    const owner = (await pool.query<{ id: string }>('select id from auth.users where email=$1', [user.email])).rows[0].id;
    await seedPrerequisites(pool, owner);
    await page.goto(appRuntimeUrl(base));
    for (const section of SG3_SECTIONS.slice(1, 4)) await page.getByRole('button', { name: section.id === 'scripture' ? 'Begin' : 'Continue' }).click();
    await page.getByRole('button', { name: 'Continue without saving' }).click();
    await page.getByRole('button', { name: 'Continue without writing' }).click();
    await page.getByRole('button', { name: 'Complete lesson' }).click();
    await expect(page.getByRole('link', { name: /SG4 is next/ })).toBeVisible();
    expect((await pool.query(`select count(*)::integer as n from public.see_clearly_sg3_records where user_id=$1`, [owner])).rows[0].n).toBe(0);
  } finally { await pool.end(); await resetLocalE2eAccount(user.email); }
});
