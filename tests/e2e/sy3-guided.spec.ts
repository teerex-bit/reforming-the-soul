import pg from 'pg';
import { expect, test } from '@playwright/test';
import { resetLocalE2eAccount } from '../helpers/local-e2e';
import { appRuntimeUrl } from '../setup/app-runtime';
import { e2eUser } from '../fixtures/users';
import { SY3_SECTIONS } from '../../content/deep-dive/v1/see-clearly/sy3';

test('SY3 story, optional source, resume, review, deletion lineage, and handoff', async ({ page }, testInfo) => {
  const user = e2eUser('sy3-guided', testInfo.project.name);
  const base = '/deep-dive/see-clearly/the-learned-self-story';
  const pool = new pg.Pool({ connectionString: process.env.TEST_DATABASE_URL });
  await resetLocalE2eAccount(user.email);
  try {
    await page.goto(appRuntimeUrl('/sign-up'));
    await page.getByLabel('Email').fill(user.email);
    await page.getByLabel('Password').fill(user.password);
    await Promise.all([page.waitForURL(/\/dashboard$/), page.getByRole('button', { name: 'Create account' }).click()]);
    await page.goto(appRuntimeUrl(`${base}?section=carry-forward`));
    await expect(page.getByRole('heading', { name: 'A familiar sentence' })).toBeVisible();
    await page.getByRole('button', { name: 'Begin' }).click();
    await expect(page).toHaveURL(/section=teaching$/);
    await page.goto(appRuntimeUrl(`${base}?section=carry-forward`));
    await expect(page.getByRole('heading', { name: 'How a story becomes familiar' })).toBeVisible();
    await page.getByRole('button', { name: 'Continue' }).click();
    await expect(page).toHaveURL(/section=recognition$/);
    await expect(page.getByText(/No earlier trace is needed/)).toBeVisible();
    await page.getByLabel('A story I sometimes carry is…').fill('  I may have learned I disappoint people.  ');
    await page.getByRole('button', { name: 'Save & continue' }).click();
    await expect(page).toHaveURL(/section=clarification$/);
    await page.goto(appRuntimeUrl(base));
    await expect(page.getByRole('heading', { name: 'A story is not a verdict' })).toBeVisible();
    await page.getByRole('link', { name: /Back/ }).click();
    await expect(page.getByLabel('A story I sometimes carry is…')).toHaveValue('  I may have learned I disappoint people.  ');
    await page.getByRole('button', { name: 'Continue without saving a story' }).click();
    await page.getByRole('button', { name: 'Continue' }).click();
    await page.getByLabel('When this story shows up, what do you notice it changes in the way you respond?').fill('  I seek reassurance.  ');
    await page.getByRole('button', { name: 'Save & continue' }).click();
    await expect(page).toHaveURL(/section=carry-forward$/);
    await page.getByRole('button', { name: 'Complete lesson' }).click();
    await expect(page.getByRole('link', { name: /SY4 is next/ })).toBeVisible();
    const query = `select p.completed_at,p.updated_at,p.last_section_id,r.self_story_hypothesis,r.source_sy2_record_id,r.source_was_linked,
      f.body from public.deep_dive_module_progress p left join public.see_clearly_sy3_records r on r.progress_id=p.id
      left join public.deep_dive_reflections f on f.progress_id=p.id and f.prompt_id='sy3-reflection'
      where p.user_id=(select id from auth.users where email=$1) and p.module_id='see-clearly.sy3'`;
    const before = (await pool.query(query, [user.email])).rows;
    expect(before).toEqual([expect.objectContaining({ self_story_hypothesis: '  I may have learned I disappoint people.  ', source_sy2_record_id: null, body: '  I seek reassurance.  ' })]);
    expect(before[0].completed_at).toBeTruthy();
    await page.goto(appRuntimeUrl('/deep-dive/see-clearly'));
    await expect(page.getByText('What Is Actually True About Me')).toBeVisible();
    await page.getByRole('link', { name: 'Review SY3' }).click();
    for (const section of SY3_SECTIONS.slice(1)) {
      await page.getByRole('link', { name: 'Continue', exact: true }).click();
      await expect(page).toHaveURL(new RegExp(`section=${section.id}$`));
    }
    expect((await pool.query(query, [user.email])).rows).toEqual(before);
    const owner = (await pool.query<{ id: string }>('select id from auth.users where email=$1', [user.email])).rows[0].id;
    const sy2Progress = (await pool.query<{ id: string }>(`insert into public.deep_dive_module_progress(user_id,curriculum_version_id,module_id,last_section_id,completed_at)
      values($1,'phase-1-v1','see-clearly.sy2','carry-forward',now()) returning id`, [owner])).rows[0].id;
    const source = (await pool.query<{ id: string }>(`insert into public.see_clearly_sy2_records(user_id,progress_id,perception,belief)
      values($1,$2,'The room became quiet.','I had said too much.') returning id`, [owner, sy2Progress])).rows[0].id;
    await page.goto(appRuntimeUrl(`${base}?section=recognition`));
    await page.getByLabel('Use my SY2 trace').check();
    await expect(page.getByRole('complementary', { name: 'Your SY2 trace' })).toContainText('The room became quiet.');
    await page.getByRole('button', { name: 'Save changes' }).click();
    expect((await pool.query(query, [user.email])).rows[0]).toMatchObject({ source_sy2_record_id: source, source_was_linked: true });
    await pool.query('delete from public.see_clearly_sy2_records where id=$1', [source]);
    await page.reload();
    await expect(page.getByRole('status')).toContainText('Your earlier SY2 source is no longer available.');
    expect((await pool.query(query, [user.email])).rows[0]).toMatchObject({ source_sy2_record_id: null, self_story_hypothesis: before[0].self_story_hypothesis, completed_at: before[0].completed_at });
    await page.goto(appRuntimeUrl(`${base}?section=reflection`));
    await page.getByRole('button', { name: 'Delete reflection' }).click();
    await expect(page.getByLabel('When this story shows up, what do you notice it changes in the way you respond?')).toHaveValue('');
    expect((await pool.query(query, [user.email])).rows[0]).toMatchObject({ body: null, self_story_hypothesis: before[0].self_story_hypothesis, completed_at: before[0].completed_at });
  } finally { await pool.end(); await resetLocalE2eAccount(user.email); }
});

test('SY3 recognition fits three viewports with keyboard focus', async ({ page }, testInfo) => {
  const user = e2eUser('sy3-responsive', testInfo.project.name);
  const base = '/deep-dive/see-clearly/the-learned-self-story';
  await resetLocalE2eAccount(user.email);
  try {
    await page.goto(appRuntimeUrl('/sign-up'));
    await page.getByLabel('Email').fill(user.email); await page.getByLabel('Password').fill(user.password);
    await Promise.all([page.waitForURL(/\/dashboard$/), page.getByRole('button', { name: 'Create account' }).click()]);
    await page.goto(appRuntimeUrl(base));
    await page.getByRole('button', { name: 'Begin' }).click();
    await page.getByRole('button', { name: 'Continue' }).click();
    for (const width of [375, 768, 1536]) {
      await page.setViewportSize({ width, height: 900 });
      await expect(page.getByRole('heading', { name: 'The sentence underneath' })).toBeVisible();
      await expect(page.getByLabel('A story I sometimes carry is…')).toBeVisible();
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
      await page.screenshot({ path: testInfo.outputPath(`sy3-recognition-${width}.png`), fullPage: true });
    }
    await page.getByLabel('A story I sometimes carry is…').focus();
    await expect(page.getByLabel('A story I sometimes carry is…')).toBeFocused();
    await page.getByLabel('A story I sometimes carry is…').fill('A long story '.repeat(40));
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
    await page.getByRole('button', { name: 'Continue without saving a story' }).click();
    await page.getByRole('button', { name: 'Continue' }).click();
    await page.getByRole('button', { name: 'Continue without writing' }).click();
    await page.getByRole('button', { name: 'Complete lesson' }).click();
    await expect(page.getByRole('link', { name: /SY4 is next/ })).toBeVisible();
  } finally { await resetLocalE2eAccount(user.email); }
});
