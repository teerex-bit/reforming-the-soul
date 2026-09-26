import pg from 'pg';
import { expect, test } from '@playwright/test';
import { resetLocalE2eAccount } from '../helpers/local-e2e';
import { appRuntimeUrl } from '../setup/app-runtime';
import { e2eUser } from '../fixtures/users';
import { SY2_SECTIONS } from '../../content/deep-dive/v1/see-clearly/sy2';

test('SY2 saves a partial participant trace, resumes, and reviews without changing progress', async ({ page }, testInfo) => {
  const user = e2eUser('sy2-guided', testInfo.project.name);
  const base = '/deep-dive/see-clearly/follow-the-formation-chain';
  const pool = new pg.Pool({ connectionString: process.env.TEST_DATABASE_URL });
  await resetLocalE2eAccount(user.email);
  try {
    await page.goto(appRuntimeUrl('/sign-up'));
    await page.getByLabel('Email').fill(user.email);
    await page.getByLabel('Password').fill(user.password);
    await Promise.all([page.waitForURL(/\/dashboard$/), page.getByRole('button', { name: 'Create account' }).click()]);
    await page.goto(appRuntimeUrl(base));
    await expect(page.getByRole('heading', { name: 'Follow the Formation Chain' })).toBeVisible();
    for (const section of SY2_SECTIONS.slice(1, 4)) {
      await page.getByRole('button', { name: section.id === 'chain' ? 'Begin' : 'Continue' }).click();
      await expect(page).toHaveURL(new RegExp(`section=${section.id}$`));
    }
    await expect(page.getByText(/You do not need a saved SY1 moment/)).toBeVisible();
    await page.getByLabel('What was I seeing in this moment?').fill('  The room became quiet.  ');
    await page.getByRole('button', { name: 'Next link' }).click();
    await page.getByLabel('What did that make me believe was true?').fill('I had said too much.');
    await page.getByRole('button', { name: 'Save & continue' }).click();
    await expect(page).toHaveURL(/section=distinction$/);
    await page.goto(appRuntimeUrl(base));
    await expect(page.getByRole('heading', { name: 'Belief and desire are different' })).toBeVisible();
    await page.goto(appRuntimeUrl(`${base}?section=trace`));
    await expect(page.getByLabel('What was I seeing in this moment?')).toHaveValue('  The room became quiet.  ');
    await page.getByRole('button', { name: 'Continue without saving this trace' }).click();
    for (const section of SY2_SECTIONS.slice(5)) {
      if (section.id === 'reflection') {
        await page.getByRole('button', { name: 'Continue' }).click();
        await expect(page).toHaveURL(/section=reflection$/);
        await page.getByLabel('What became clearer when you followed the reaction backward?').fill('  I expected rejection.  ');
        await page.getByRole('button', { name: 'Save & continue' }).click();
      } else if (section.id === 'practice') {
        await expect(page).toHaveURL(/section=practice$/);
        await page.getByRole('button', { name: 'Continue' }).click();
      } else {
        await page.getByRole('button', { name: 'Complete lesson' }).click();
        await expect(page).toHaveURL(/section=carry-forward$/);
      }
    }
    const query = `select p.last_section_id,p.completed_at,p.updated_at,r.perception,r.belief,r.source_sc1_record_id,r.updated_at as record_updated_at,
      f.body,f.updated_at as reflection_updated_at from public.deep_dive_module_progress p
      join public.see_clearly_sy2_records r on (p.id,p.user_id,p.module_id)=(r.progress_id,r.user_id,r.module_id)
      join public.deep_dive_reflections f on (p.id,p.user_id)=(f.progress_id,f.user_id)
      where p.user_id=(select id from auth.users where email=$1) and p.module_id='see-clearly.sy2' and f.prompt_id='sy2-reflection'`;
    const before = (await pool.query(query, [user.email])).rows;
    expect(before).toEqual([expect.objectContaining({ last_section_id: 'carry-forward', perception: '  The room became quiet.  ', belief: 'I had said too much.', source_sc1_record_id: null, body: '  I expected rejection.  ' })]);
    expect(before[0].completed_at).toBeTruthy();
    const owner = (await pool.query<{ id: string }>('select id from auth.users where email=$1', [user.email])).rows[0].id;
    const sy1Progress = (await pool.query<{ id: string }>(`insert into public.deep_dive_module_progress(user_id,curriculum_version_id,module_id,last_section_id,completed_at)
      values($1,'phase-1-v1','see-clearly.sc1','carry-forward',now()) returning id`, [owner])).rows[0].id;
    await page.goto(appRuntimeUrl('/deep-dive/see-clearly'));
    await page.getByRole('link', { name: 'Review SY2' }).click();
    for (const section of SY2_SECTIONS.slice(1)) {
      await page.getByRole('link', { name: 'Continue', exact: true }).click();
      await expect(page).toHaveURL(new RegExp(`section=${section.id}$`));
      if (section.id === 'trace') await expect(page.getByLabel('What was I seeing in this moment?')).toHaveValue('  The room became quiet.  ');
    }
    expect((await pool.query(query, [user.email])).rows).toEqual(before);
    const source = (await pool.query<{ id: string }>(`insert into public.see_clearly_sc1_records(user_id,progress_id,event_facts,automatic_interpretation)
      values($1,$2,'The message arrived.','I thought it meant a change.') returning id`, [owner, sy1Progress])).rows[0].id;
    await page.goto(appRuntimeUrl(`${base}?section=trace`));
    await page.getByLabel('Use my SY1 moment').check();
    await expect(page.getByRole('complementary', { name: 'Your SY1 moment' })).toContainText('The message arrived.');
    await page.getByRole('button', { name: 'Save changes' }).click();
    await expect(page.getByRole('status')).toContainText('Your trace was saved.');
    expect((await pool.query(query, [user.email])).rows[0]).toMatchObject({ source_sc1_record_id: source });
    await pool.query('delete from public.see_clearly_sc1_records where id=$1', [source]);
    await page.reload();
    await expect(page.getByRole('status')).toContainText('Your earlier SY1 source is no longer available.');
    expect((await pool.query(query, [user.email])).rows[0]).toMatchObject({ perception: '  The room became quiet.  ', source_sc1_record_id: null,
      completed_at: before[0].completed_at, updated_at: before[0].updated_at });
  } finally { await pool.end(); await resetLocalE2eAccount(user.email); }
});
