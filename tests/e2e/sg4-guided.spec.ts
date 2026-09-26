import pg from 'pg';
import { expect, test } from '@playwright/test';
import { resetLocalE2eAccount } from '../helpers/local-e2e';
import { appRuntimeUrl } from '../setup/app-runtime';
import { e2eUser } from '../fixtures/users';
import { SG4_SECTIONS } from '../../content/deep-dive/v1/see-clearly/sg4';

const base = '/deep-dive/see-clearly/can-i-trust-god-here';
const prerequisites = ['awaken.pay-attention', 'awaken.catch-yourself-being-you', 'awaken.your-reactions-have-a-history',
  'awaken.formation-is-not-identity', 'see-clearly.sc1', 'see-clearly.sy2', 'see-clearly.sy3', 'see-clearly.sy4',
  'see-clearly.sg1', 'see-clearly.sg2', 'see-clearly.sg3'];

async function signUp(page: import('@playwright/test').Page, email: string, password: string) {
  await page.goto(appRuntimeUrl('/sign-up'));
  await page.getByLabel('Email').fill(email); await page.getByLabel('Password').fill(password);
  await Promise.all([page.waitForURL(/\/dashboard$/), page.getByRole('button', { name: 'Create account' }).click()]);
}
async function seedPrerequisites(pool: pg.Pool, owner: string) {
  await pool.query(`insert into public.deep_dive_module_progress(user_id,curriculum_version_id,module_id,last_section_id,completed_at)
    select $1,'phase-1-v1',id,'carry-forward',now() from unnest($2::text[]) id`, [owner, prerequisites]);
  const sg2 = (await pool.query<{ id: string }>(`select id from public.deep_dive_module_progress where user_id=$1 and module_id='see-clearly.sg2'`, [owner])).rows[0].id;
  const sg3 = (await pool.query<{ id: string }>(`select id from public.deep_dive_module_progress where user_id=$1 and module_id='see-clearly.sg3'`, [owner])).rows[0].id;
  await pool.query(`insert into public.see_clearly_sg2_records(user_id,progress_id,situation,expectation)
    values($1,$2,'  Waiting for an answer.  ','  I expected silence.  ')`, [owner, sg2]);
  await pool.query(`insert into public.see_clearly_sg3_records(user_id,progress_id,observation)
    values($1,$2,'  Jesus remained with Peter.  ')`, [owner, sg3]);
}

test('SG4 guided trust question, review and independent deletion', async ({ page }, testInfo) => {
  const user = e2eUser('sg4-guided', testInfo.project.name);
  const pool = new pg.Pool({ connectionString: process.env.TEST_DATABASE_URL });
  await resetLocalE2eAccount(user.email);
  try {
    await signUp(page, user.email, user.password);
    await page.goto(appRuntimeUrl(base));
    await expect(page).toHaveURL(/\/deep-dive\/see-clearly#see-god-heading$/);
    const owner = (await pool.query<{ id: string }>('select id from auth.users where email=$1', [user.email])).rows[0].id;
    await seedPrerequisites(pool, owner);
    await page.goto(appRuntimeUrl('/deep-dive/see-clearly'));
    await expect(page.getByRole('link', { name: 'Begin SG4' })).toBeVisible();
    await page.goto(appRuntimeUrl(`${base}?section=carry-forward`));
    await expect(page.getByRole('heading', { name: 'Can I trust God here?' })).toBeVisible();
    for (const section of SG4_SECTIONS.slice(1, 4)) {
      await page.getByRole('button', { name: section.id === 'uncertainty' ? 'Begin' : 'Continue' }).click();
      await expect(page).toHaveURL(new RegExp(`section=${section.id}$`));
    }
    await expect(page.getByText('My SG3 observation (optional)')).toBeVisible();
    await page.getByText('My SG3 observation (optional)').click();
    await expect(page.getByText('  Jesus remained with Peter.  ')).toBeVisible();
    for (const width of [375, 768, 1536]) {
      await page.setViewportSize({ width, height: 900 });
      await expect(page.getByLabel('In this situation, trusting God would mean…')).toBeVisible();
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
      await page.screenshot({ path: testInfo.outputPath(`sg4-trust-${width}.png`), fullPage: true });
    }
    const situation = page.getByLabel('One unresolved situation…');
    const trust = page.getByLabel('In this situation, trusting God would mean…');
    await trust.focus(); await expect(trust).toBeFocused();
    await situation.fill('  Waiting for a decision.  ');
    await trust.fill('  I may take my next step without securing the result.  ');
    await page.getByRole('button', { name: 'Save & continue' }).click();
    await expect(page).toHaveURL(/section=reflection$/);
    await page.goto(appRuntimeUrl(base));
    await expect(page.getByRole('heading', { name: 'What remains yours to do?' })).toBeVisible();
    await page.getByRole('link', { name: /Back/ }).click();
    await expect(trust).toHaveValue('  I may take my next step without securing the result.  ');
    await page.getByRole('button', { name: 'Continue without saving' }).click();
    await page.getByLabel('What remains yours to do while the outcome is open?').fill('  I can make the call.  ');
    await page.getByRole('button', { name: 'Save & continue' }).click();
    await page.getByRole('button', { name: 'Complete lesson' }).click();
    await expect(page.getByRole('link', { name: /Become is next/ })).toBeVisible();
    const query = `select p.completed_at,p.updated_at,r.situation,r.trust_meaning,f.body from public.deep_dive_module_progress p
      left join public.see_clearly_sg4_records r on r.progress_id=p.id
      left join public.deep_dive_reflections f on f.progress_id=p.id and f.prompt_id='sg4-reflection'
      where p.user_id=$1 and p.module_id='see-clearly.sg4'`;
    const before = (await pool.query(query, [owner])).rows;
    expect(before[0]).toMatchObject({ situation: '  Waiting for a decision.  ', trust_meaning: '  I may take my next step without securing the result.  ', body: '  I can make the call.  ' });
    expect(before[0].completed_at).toBeTruthy();
    await page.goto(appRuntimeUrl('/deep-dive/see-clearly'));
    await expect(page.getByText('See Clearly complete · Become is next')).toBeVisible();
    await page.getByRole('link', { name: 'Review SG4' }).click();
    for (const section of SG4_SECTIONS.slice(1)) await page.getByRole('link', { name: 'Continue', exact: true }).click();
    expect((await pool.query(query, [owner])).rows).toEqual(before);
    await page.goto(appRuntimeUrl(`${base}?section=trust-question`));
    await trust.fill('  I may ask for help while I wait.  ');
    await page.getByRole('button', { name: 'Save changes' }).click();
    await expect(page.getByRole('status')).toContainText('Your words were saved.');
    await page.getByRole('button', { name: 'Delete saved trust question' }).click();
    await expect(situation).toHaveValue(''); await expect(trust).toHaveValue('');
    await page.reload(); await expect(trust).toHaveValue('');
    await pool.query(`delete from public.see_clearly_sg3_records where user_id=$1`, [owner]);
    await page.reload();
    await expect(page.getByText('My SG3 observation (optional)')).toHaveCount(0);
    expect((await pool.query(query, [owner])).rows[0]).toMatchObject({ situation: null, trust_meaning: null, body: before[0].body, completed_at: before[0].completed_at });
    await page.goto(appRuntimeUrl(`${base}?section=reflection`));
    await page.getByRole('button', { name: 'Delete reflection' }).click();
    await expect(page.getByLabel('What remains yours to do while the outcome is open?')).toHaveValue('');
    expect((await pool.query(query, [owner])).rows[0]).toMatchObject({ body: null, completed_at: before[0].completed_at });
  } finally { await pool.end(); await resetLocalE2eAccount(user.email); }
});

test('SG4 optional trust and reflection can be skipped', async ({ page }, testInfo) => {
  const user = e2eUser('sg4-skip', testInfo.project.name);
  const pool = new pg.Pool({ connectionString: process.env.TEST_DATABASE_URL });
  await resetLocalE2eAccount(user.email);
  try {
    await signUp(page, user.email, user.password);
    const owner = (await pool.query<{ id: string }>('select id from auth.users where email=$1', [user.email])).rows[0].id;
    await seedPrerequisites(pool, owner);
    await page.goto(appRuntimeUrl(base));
    for (const section of SG4_SECTIONS.slice(1, 4)) await page.getByRole('button', { name: section.id === 'uncertainty' ? 'Begin' : 'Continue' }).click();
    await page.getByRole('button', { name: 'Continue without saving' }).click();
    await page.getByRole('button', { name: 'Continue without writing' }).click();
    await page.getByRole('button', { name: 'Complete lesson' }).click();
    await expect(page.getByRole('link', { name: /Become is next/ })).toBeVisible();
    expect((await pool.query(`select count(*)::integer as n from public.see_clearly_sg4_records where user_id=$1`, [owner])).rows[0].n).toBe(0);
  } finally { await pool.end(); await resetLocalE2eAccount(user.email); }
});
