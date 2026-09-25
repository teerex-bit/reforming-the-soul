import pg from 'pg';
import { expect, test } from '@playwright/test';
import { resetLocalE2eAccount } from '../helpers/local-e2e';
import { appRuntimeUrl } from '../setup/app-runtime';
import { e2eUser } from '../fixtures/users';
import { SC1_SECTIONS } from '../../content/deep-dive/v1/see-clearly/sc1';

test('SC1 teaches and saves a distinct fact and interpretation, resumes, and reviews without writes', async ({ page }, testInfo) => {
  const user = e2eUser('sc1-guided', testInfo.project.name);
  const base = '/deep-dive/see-clearly/facts-and-interpretation';
  const pool = new pg.Pool({ connectionString: process.env.TEST_DATABASE_URL });
  await resetLocalE2eAccount(user.email);
  try {
    await page.goto(appRuntimeUrl('/sign-up'));
    await page.getByLabel('Email').fill(user.email);
    await page.getByLabel('Password').fill(user.password);
    await Promise.all([page.waitForURL(/\/dashboard$/), page.getByRole('button', { name: 'Create account' }).click()]);
    await page.goto(appRuntimeUrl('/see-clearly'));
    await expect(page).toHaveURL(/\/deep-dive\/see-clearly$/);
    await expect(page.getByRole('heading', { name: 'See Clearly' })).toBeVisible();
    await expect(page.getByRole('heading', { name: 'See Yourself Clearly' })).toBeVisible();
    await expect(page.getByRole('heading', { name: 'See God Clearly' })).toBeVisible();
    await page.getByRole('link', { name: 'Begin SC1' }).click();
    await expect(page.getByRole('heading', { level: 1, name: 'Facts and Interpretation' })).toBeVisible();
    const initial = await page.evaluate(() => ({ title: document.querySelector('.deep-dive-lesson h1')!.getBoundingClientRect().top, scroll: document.documentElement.scrollWidth, viewport: innerWidth }));
    expect(initial.scroll).toBeLessThanOrEqual(initial.viewport);
    if (initial.viewport === 375) expect(initial.title).toBeLessThan(420);
    await page.screenshot({ path: testInfo.outputPath(`sc1-entry-${testInfo.project.name}.png`), fullPage: true });
    await page.getByRole('button', { name: 'Begin' }).click();
    await expect(page).toHaveURL(/section=teaching$/);
    await page.getByRole('link', { name: '← Back' }).click();
    await expect(page).toHaveURL(/section=entry$/);
    await page.goto(appRuntimeUrl(base));
    await expect(page.getByRole('heading', { level: 1, name: 'The meaning can feel like the event' })).toBeVisible();
    await page.getByRole('button', { name: 'Continue' }).click();
    await expect(page.getByRole('heading', { level: 1, name: 'The same event, more than one meaning' })).toBeVisible();
    await page.getByText('Look again at the difference').click();
    await expect(page.getByText(/Neither explanation is visible/)).toBeVisible();
    await page.getByRole('button', { name: 'Continue' }).click();
    await expect(page).toHaveURL(/section=interaction$/);
    await page.getByLabel(/What could a careful witness observe/).fill('The message was read at 10:15.');
    await page.getByLabel(/What did you immediately make it mean/).fill('I had upset my friend.');
    await page.screenshot({ path: testInfo.outputPath(`sc1-interaction-${testInfo.project.name}.png`), fullPage: true });
    await page.getByRole('button', { name: 'Save & continue' }).click();
    await expect(page).toHaveURL(/section=reflection$/);
    await page.goto(appRuntimeUrl(base));
    await expect(page.getByRole('heading', { level: 1, name: 'Notice the space between them' })).toBeVisible();
    await page.getByLabel('A thought you want to keep (optional)').fill('I had already decided what the delay meant.');
    await page.getByRole('button', { name: 'Save & continue' }).click();
    await expect(page).toHaveURL(/section=practice$/);
    await page.getByRole('button', { name: 'Continue' }).click();
    await page.getByRole('button', { name: 'Complete lesson' }).click();
    await expect(page).toHaveURL(/section=carry-forward$/);
    await expect(page.getByRole('link', { name: 'Back to See Clearly' })).toBeVisible();
    const query = `select p.last_section_id,p.completed_at,p.updated_at,r.event_facts,r.automatic_interpretation,r.updated_at as record_updated_at,f.body,f.updated_at as reflection_updated_at
      from public.deep_dive_module_progress p join public.see_clearly_sc1_records r on (p.id,p.user_id,p.module_id)=(r.progress_id,r.user_id,r.module_id)
      join public.deep_dive_reflections f on (p.id,p.user_id)=(f.progress_id,f.user_id)
      where p.user_id=(select id from auth.users where email=$1) and p.module_id='see-clearly.sc1'`;
    const before = await pool.query(query, [user.email]);
    expect(before.rows).toEqual([expect.objectContaining({ last_section_id: 'carry-forward', event_facts: 'The message was read at 10:15.', automatic_interpretation: 'I had upset my friend.', body: 'I had already decided what the delay meant.' })]);
    expect(before.rows[0].completed_at).toBeTruthy();
    await page.goto(appRuntimeUrl('/deep-dive/see-clearly'));
    await page.getByRole('link', { name: 'Review SC1' }).click();
    await expect(page).toHaveURL(/section=entry$/);
    for (const section of SC1_SECTIONS.slice(1)) {
      await page.getByRole('link', { name: 'Continue', exact: true }).click();
      await expect(page).toHaveURL(new RegExp(`section=${section.id}$`));
      await expect(page.getByRole('heading', { level: 1, name: section.title })).toBeVisible();
      if (section.id === 'interaction') {
        await expect(page.getByRole('region', { name: 'Your saved moment' })).toContainText('The message was read at 10:15.');
        await page.getByRole('link', { name: '← Back' }).click();
        await expect(page).toHaveURL(/section=contrast$/);
        await expect(page.getByRole('heading', { level: 1, name: 'The same event, more than one meaning' })).toBeVisible();
        await page.getByRole('link', { name: 'Continue', exact: true }).click();
        await expect(page.getByRole('heading', { level: 1, name: 'Separate what happened from what it meant' })).toBeVisible();
      }
      if (section.id === 'reflection') await expect(page.locator('.deep-dive-reflection textarea')).toHaveValue('I had already decided');
    }
    expect((await pool.query(query, [user.email])).rows).toEqual(before.rows);
  } finally { await pool.end(); await resetLocalE2eAccount(user.email); }
});
