import pg from 'pg';
import { expect, test } from '@playwright/test';
import { resetLocalE2eAccount } from '../helpers/local-e2e';
import { appRuntimeUrl } from '../setup/app-runtime';
import { e2eUser } from '../fixtures/users';
import { SG2_SECTIONS } from '../../content/deep-dive/v1/see-clearly/sg2';

const base = '/deep-dive/see-clearly/what-i-expect-from-god';

test('SG2 guided expectation, review, deletion, and responsive recognition', async ({ page }, testInfo) => {
  const user = e2eUser('sg2-guided', testInfo.project.name);
  const pool = new pg.Pool({ connectionString: process.env.TEST_DATABASE_URL });
  await resetLocalE2eAccount(user.email);
  try {
    await page.goto(appRuntimeUrl('/sign-up'));
    await page.getByLabel('Email').fill(user.email);
    await page.getByLabel('Password').fill(user.password);
    await Promise.all([page.waitForURL(/\/dashboard$/), page.getByRole('button', { name: 'Create account' }).click()]);
    await page.goto(appRuntimeUrl(base));
    await expect(page).toHaveURL(/\/deep-dive\/see-clearly#see-god-heading$/);
    const owner = (await pool.query<{ id: string }>('select id from auth.users where email=$1', [user.email])).rows[0].id;
    const previous = (await pool.query<{ id: string }>(`insert into public.deep_dive_module_progress(user_id,curriculum_version_id,module_id,last_section_id,completed_at)
      values($1,'phase-1-v1','see-clearly.sg1','carry-forward',now()) returning id`, [owner])).rows[0].id;
    await pool.query(`insert into public.see_clearly_sg1_records(user_id,progress_id,learned_god_image) values($1,$2,'  He seemed distant.  ')`, [owner, previous]);
    await page.goto(appRuntimeUrl('/deep-dive/see-clearly'));
    await expect(page.getByRole('link', { name: 'Begin SG2' })).toBeVisible();
    await page.goto(appRuntimeUrl(`${base}?section=carry-forward`));
    await expect(page.getByRole('heading', { name: 'What I expect from God' })).toBeVisible();
    for (const section of SG2_SECTIONS.slice(1, 3)) {
      await page.getByRole('button', { name: section.id === 'examples' ? 'Begin' : 'Continue' }).click();
      await expect(page).toHaveURL(new RegExp(`section=${section.id}$`));
    }
    await expect(page.getByText('Look back at my SG1 picture (optional)')).toBeVisible();
    for (const width of [375, 768, 1536]) {
      await page.setViewportSize({ width, height: 900 });
      await expect(page.getByLabel('In that moment, I expected God to…')).toBeVisible();
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
      await page.screenshot({ path: testInfo.outputPath(`sg2-recognition-${width}.png`), fullPage: true });
    }
    await page.getByLabel('A real moment I noticed…').fill('  I was waiting for an answer.  ');
    await page.getByLabel('In that moment, I expected God to…').fill('  Stay silent.  ');
    await page.getByRole('button', { name: 'Save & continue' }).click();
    await expect(page).toHaveURL(/section=reflection$/);
    await page.getByRole('button', { name: 'Continue without writing' }).click();
    await page.getByRole('button', { name: 'Complete lesson' }).click();
    await expect(page.getByRole('link', { name: /SG3 is next/ })).toBeVisible();
    const query = `select p.completed_at,p.updated_at,r.situation,r.expectation from public.deep_dive_module_progress p
      left join public.see_clearly_sg2_records r on r.progress_id=p.id where p.user_id=$1 and p.module_id='see-clearly.sg2'`;
    const before = (await pool.query(query, [owner])).rows;
    expect(before[0]).toMatchObject({ situation: '  I was waiting for an answer.  ', expectation: '  Stay silent.  ' });
    expect(before[0].completed_at).toBeTruthy();
    await page.goto(appRuntimeUrl('/deep-dive/see-clearly'));
    await page.getByRole('link', { name: 'Review SG2' }).click();
    for (const section of SG2_SECTIONS.slice(1)) await page.getByRole('link', { name: 'Continue', exact: true }).click();
    expect((await pool.query(query, [owner])).rows).toEqual(before);
    await page.goto(appRuntimeUrl(`${base}?section=recognition`));
    await page.getByRole('button', { name: 'Delete saved expectation' }).click();
    await expect(page.getByLabel('In that moment, I expected God to…')).toHaveValue('');
    await page.reload();
    await expect(page.getByLabel('A real moment I noticed…')).toHaveValue('');
    expect((await pool.query(query, [owner])).rows[0]).toMatchObject({ situation: null, expectation: null, completed_at: before[0].completed_at });
  } finally { await pool.end(); await resetLocalE2eAccount(user.email); }
});
