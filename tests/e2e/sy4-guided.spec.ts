import pg from 'pg';
import { expect, test } from '@playwright/test';
import { resetLocalE2eAccount } from '../helpers/local-e2e';
import { appRuntimeUrl } from '../setup/app-runtime';
import { e2eUser } from '../fixtures/users';
import { SY4_SECTIONS } from '../../content/deep-dive/v1/see-clearly/sy4';

const base = '/deep-dive/see-clearly/what-is-actually-true-about-me';
const reflection = 'What makes it difficult to let what God says carry more authority than the story you have learned?';

async function signUp(page: import('@playwright/test').Page, email: string, password: string) {
  await page.goto(appRuntimeUrl('/sign-up'));
  await page.getByLabel('Email').fill(email); await page.getByLabel('Password').fill(password);
  await Promise.all([page.waitForURL(/\/dashboard$/), page.getByRole('button', { name: 'Create account' }).click()]);
}

test('SY4 guided truth, owned SY3 link, deletion, review, and movement handoff', async ({ page }, testInfo) => {
  const user = e2eUser('sy4-guided', testInfo.project.name);
  const pool = new pg.Pool({ connectionString: process.env.TEST_DATABASE_URL });
  await resetLocalE2eAccount(user.email);
  try {
    await signUp(page, user.email, user.password);
    await page.goto(appRuntimeUrl(`${base}?section=carry-forward`));
    await expect(page.getByRole('heading', { name: 'What gets to define me?' })).toBeVisible();
    for (const section of SY4_SECTIONS.slice(1, 4)) {
      await page.getByRole('button', { name: section.id === 'formation' ? 'Begin' : 'Continue' }).click();
      await expect(page).toHaveURL(new RegExp(`section=${section.id}$`));
    }
    await page.goto(appRuntimeUrl(`${base}?section=carry-forward`));
    await expect(page.getByRole('heading', { name: 'What has authority?' })).toBeVisible();
    await expect(page.getByText('You can continue without a saved SY3 story.')).toBeVisible();
    const input = page.getByLabel('A truth I want to learn to live from is…');
    await input.fill('  I want to live from what God has made new.  ');
    await page.getByRole('button', { name: 'Save & continue' }).click();
    await expect(page).toHaveURL(/section=reflection$/);
    await page.goto(appRuntimeUrl(base));
    await expect(page.getByRole('heading', { name: 'Pause before the verdict' })).toBeVisible();
    await page.getByRole('link', { name: /Back/ }).click();
    await expect(input).toHaveValue('  I want to live from what God has made new.  ');
    await page.getByRole('button', { name: 'Continue without saving a statement' }).click();
    await page.getByLabel(reflection).fill('  I often trust the familiar story first.  ');
    await page.getByRole('button', { name: 'Save & continue' }).click();
    await page.getByRole('button', { name: 'Complete lesson' }).click();
    await expect(page.getByRole('link', { name: /See God Clearly is next/ })).toBeVisible();
    const query = `select p.last_section_id,p.completed_at,p.updated_at,r.truth_to_live_from,r.source_sy3_record_id,r.source_was_linked,f.body
      from public.deep_dive_module_progress p left join public.see_clearly_sy4_records r on r.progress_id=p.id
      left join public.deep_dive_reflections f on f.progress_id=p.id and f.prompt_id='sy4-reflection'
      where p.user_id=(select id from auth.users where email=$1) and p.module_id='see-clearly.sy4'`;
    const before = (await pool.query(query, [user.email])).rows;
    expect(before).toEqual([expect.objectContaining({ truth_to_live_from: '  I want to live from what God has made new.  ', source_sy3_record_id: null, body: '  I often trust the familiar story first.  ' })]);
    expect(before[0].completed_at).toBeTruthy();
    const owner = (await pool.query<{id: string}>('select id from auth.users where email=$1', [user.email])).rows[0].id;
    const sy3Progress = (await pool.query<{id: string}>(`insert into public.deep_dive_module_progress(user_id,curriculum_version_id,module_id,last_section_id,completed_at)
      values($1,'phase-1-v1','see-clearly.sy3','carry-forward',now()) returning id`, [owner])).rows[0].id;
    const source = (await pool.query<{id: string}>(`insert into public.see_clearly_sy3_records(user_id,progress_id,self_story_hypothesis)
      values($1,$2,'I may have learned to earn acceptance.') returning id`, [owner, sy3Progress])).rows[0].id;
    await page.goto(appRuntimeUrl('/deep-dive/see-clearly'));
    await expect(page.getByText('Up next: SG1 — The God I Learned')).toBeVisible();
    await page.getByRole('link', { name: 'Review SY4' }).click();
    for (const section of SY4_SECTIONS.slice(1)) {
      await page.getByRole('link', { name: 'Continue', exact: true }).click();
      await expect(page).toHaveURL(new RegExp(`section=${section.id}$`));
    }
    expect((await pool.query(query, [user.email])).rows).toEqual(before);
    await page.goto(appRuntimeUrl(`${base}?section=look-again`));
    await page.getByLabel('Look at my SY3 story').check();
    await expect(page.getByRole('complementary', { name: 'Your SY3 story' })).toContainText('I may have learned to earn acceptance.');
    await page.getByRole('button', { name: 'Save changes' }).click();
    if (await page.getByRole('alert').filter({ hasText: 'Your session ended.' }).count()) {
      await expect(page.getByLabel('A truth I want to learn to live from is…')).toHaveValue('  I want to live from what God has made new.  ');
      await expect(page.getByLabel('Look at my SY3 story')).toBeChecked();
      await page.getByRole('link', { name: 'Sign in' }).click();
      await page.getByLabel('Email').fill(user.email);
      await page.getByLabel('Password').fill(user.password);
      await Promise.all([page.waitForURL(/\/dashboard$/), page.getByRole('button', { name: 'Sign in' }).click()]);
      await page.goto(appRuntimeUrl(`${base}?section=look-again`));
      await page.getByLabel('Look at my SY3 story').check();
      await page.getByRole('button', { name: 'Save changes' }).click();
    }
    await expect(page.getByRole('status')).toContainText('Your words were saved.');
    expect((await pool.query(query, [user.email])).rows[0]).toMatchObject({ source_sy3_record_id: source, source_was_linked: true });
    await pool.query('delete from public.see_clearly_sy3_records where id=$1', [source]);
    await page.reload();
    await expect(page.getByRole('status')).toContainText('Your earlier SY3 story is no longer available.');
    expect((await pool.query(query, [user.email])).rows[0]).toMatchObject({ truth_to_live_from: before[0].truth_to_live_from, source_sy3_record_id: null, completed_at: before[0].completed_at });
    await page.goto(appRuntimeUrl(`${base}?section=reflection`));
    await page.getByRole('button', { name: 'Delete reflection' }).click();
    await expect(page.getByLabel(reflection)).toHaveValue('');
    expect((await pool.query(query, [user.email])).rows[0]).toMatchObject({ body: null, completed_at: before[0].completed_at });
    await page.goto(appRuntimeUrl(`${base}?section=look-again`));
    await page.getByLabel('A truth I want to learn to live from is…').fill('  I can receive before I perform.  ');
    await page.getByRole('button', { name: 'Save changes' }).click();
    await expect(page.getByRole('status').filter({ hasText: 'Your words were saved.' })).toBeVisible();
    expect((await pool.query(query, [user.email])).rows[0]).toMatchObject({
      truth_to_live_from: '  I can receive before I perform.  ', completed_at: before[0].completed_at,
    });
  } finally { await pool.end(); await resetLocalE2eAccount(user.email); }
});

test('SY4 optional no-source path and focused responsive truth surface', async ({ page }, testInfo) => {
  const user = e2eUser('sy4-responsive', testInfo.project.name);
  await resetLocalE2eAccount(user.email);
  try {
    await signUp(page, user.email, user.password);
    await page.goto(appRuntimeUrl(base));
    for (const section of SY4_SECTIONS.slice(1, 4)) {
      await page.getByRole('button', { name: section.id === 'formation' ? 'Begin' : 'Continue' }).click();
    }
    for (const width of [375, 768, 1536]) {
      await page.setViewportSize({ width, height: 900 });
      await expect(page.getByRole('heading', { name: 'What has authority?' })).toBeVisible();
      await expect(page.getByLabel('A truth I want to learn to live from is…')).toBeVisible();
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
      await page.screenshot({ path: testInfo.outputPath(`sy4-look-again-${width}.png`), fullPage: true });
    }
    await page.getByLabel('A truth I want to learn to live from is…').focus();
    await expect(page.getByLabel('A truth I want to learn to live from is…')).toBeFocused();
    await page.getByLabel('A truth I want to learn to live from is…').fill('A truth with long participant wording '.repeat(24));
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
    await page.getByRole('button', { name: 'Continue without saving a statement' }).click();
    await page.getByRole('button', { name: 'Continue without writing' }).click();
    await page.getByRole('button', { name: 'Complete lesson' }).click();
    await expect(page.getByRole('link', { name: /See God Clearly is next/ })).toBeVisible();
  } finally { await resetLocalE2eAccount(user.email); }
});
