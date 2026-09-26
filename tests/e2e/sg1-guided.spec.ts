import pg from 'pg';
import { expect, test } from '@playwright/test';
import { resetLocalE2eAccount } from '../helpers/local-e2e';
import { appRuntimeUrl } from '../setup/app-runtime';
import { e2eUser } from '../fixtures/users';
import { SG1_SECTIONS } from '../../content/deep-dive/v1/see-clearly/sg1';

const base = '/deep-dive/see-clearly/the-god-i-learned';
const prompt = 'What makes this picture of God feel familiar to you?';

async function signUp(page: import('@playwright/test').Page, email: string, password: string) {
  await page.goto(appRuntimeUrl('/sign-up'));
  await page.getByLabel('Email').fill(email); await page.getByLabel('Password').fill(password);
  await Promise.all([page.waitForURL(/\/dashboard$/), page.getByRole('button', { name: 'Create account' }).click()]);
}

test('SG1 guided recognition, exact wording, independent deletion and no-write review', async ({ page }, testInfo) => {
  const user = e2eUser('sg1-guided', testInfo.project.name);
  const pool = new pg.Pool({ connectionString: process.env.TEST_DATABASE_URL });
  await resetLocalE2eAccount(user.email);
  try {
    await signUp(page, user.email, user.password);
    await page.goto(appRuntimeUrl(`${base}?section=carry-forward`));
    await expect(page.getByRole('heading', { name: 'The picture beneath what I say' })).toBeVisible();
    for (const section of SG1_SECTIONS.slice(1, 4)) {
      await page.getByRole('button', { name: section.id === 'formation' ? 'Begin' : 'Continue' }).click();
      await expect(page).toHaveURL(new RegExp(`section=${section.id}$`));
    }
    await page.goto(appRuntimeUrl(`${base}?section=carry-forward`));
    await expect(page.getByRole('heading', { name: 'The God I learned' })).toBeVisible();
    await page.getByLabel('The God I learned seemed…').fill('  He seemed far away after failure.  ');
    await page.getByLabel(/Some things that may have shaped this picture/).fill('  The way failure was discussed may have contributed.  ');
    await page.getByRole('button', { name: 'Save & continue' }).click();
    await expect(page).toHaveURL(/section=reflection$/);
    await page.goto(appRuntimeUrl(base));
    await expect(page.getByRole('heading', { name: 'Familiar is not final' })).toBeVisible();
    await page.getByRole('link', { name: /Back/ }).click();
    await expect(page.getByLabel('The God I learned seemed…')).toHaveValue('  He seemed far away after failure.  ');
    await expect(page.getByLabel(/Some things that may have shaped this picture/)).toHaveValue('  The way failure was discussed may have contributed.  ');
    await page.getByRole('button', { name: 'Continue without saving a picture' }).click();
    await page.getByLabel(prompt).fill('  It feels familiar when I am waiting.  ');
    await page.getByRole('button', { name: 'Save & continue' }).click();
    await page.getByRole('button', { name: 'Complete lesson' }).click();
    await expect(page.getByRole('link', { name: /SG2 is next/ })).toBeVisible();
    const query = `select p.last_section_id,p.completed_at,p.updated_at,r.learned_god_image,r.source_influence_note,f.body
      from public.deep_dive_module_progress p left join public.see_clearly_sg1_records r on r.progress_id=p.id
      left join public.deep_dive_reflections f on f.progress_id=p.id and f.prompt_id='sg1-reflection'
      where p.user_id=(select id from auth.users where email=$1) and p.module_id='see-clearly.sg1'`;
    const before = (await pool.query(query, [user.email])).rows;
    expect(before).toEqual([expect.objectContaining({ learned_god_image: '  He seemed far away after failure.  ',
      source_influence_note: '  The way failure was discussed may have contributed.  ', body: '  It feels familiar when I am waiting.  ' })]);
    expect(before[0].completed_at).toBeTruthy();
    await page.goto(appRuntimeUrl('/deep-dive/see-clearly'));
    await expect(page.getByText('Up next: SG2 — What I Expect From God')).toBeVisible();
    await page.getByRole('link', { name: 'Review SG1' }).click();
    for (const section of SG1_SECTIONS.slice(1)) {
      await page.getByRole('link', { name: 'Continue', exact: true }).click();
      await expect(page).toHaveURL(new RegExp(`section=${section.id}$`));
    }
    expect((await pool.query(query, [user.email])).rows).toEqual(before);
    await page.goto(appRuntimeUrl(`${base}?section=recognition`));
    await page.getByLabel('The God I learned seemed…').fill('  He may be nearer than I imagined.  ');
    await page.getByLabel(/Some things that may have shaped this picture/).fill('');
    await page.getByRole('button', { name: 'Save changes' }).click();
    await expect(page.getByRole('status')).toContainText('Your words were saved.');
    expect((await pool.query(query, [user.email])).rows[0]).toMatchObject({ learned_god_image: '  He may be nearer than I imagined.  ', source_influence_note: null, completed_at: before[0].completed_at });
    await page.getByRole('button', { name: 'Delete saved picture' }).click();
    await expect(page.getByLabel('The God I learned seemed…')).toHaveValue('');
    expect((await pool.query(query, [user.email])).rows[0]).toMatchObject({ learned_god_image: null, body: before[0].body, completed_at: before[0].completed_at });
    await page.goto(appRuntimeUrl(`${base}?section=reflection`));
    await page.getByRole('button', { name: 'Delete reflection' }).click();
    await expect(page.getByLabel(prompt)).toHaveValue('');
    expect((await pool.query(query, [user.email])).rows[0]).toMatchObject({ body: null, completed_at: before[0].completed_at });
  } finally { await pool.end(); await resetLocalE2eAccount(user.email); }
});

test('SG1 skip path and responsive recognition', async ({ page }, testInfo) => {
  const user = e2eUser('sg1-responsive', testInfo.project.name);
  await resetLocalE2eAccount(user.email);
  try {
    await signUp(page, user.email, user.password);
    await page.goto(appRuntimeUrl(base));
    for (const section of SG1_SECTIONS.slice(1, 4)) {
      await page.getByRole('button', { name: section.id === 'formation' ? 'Begin' : 'Continue' }).click();
    }
    for (const width of [375, 768, 1536]) {
      await page.setViewportSize({ width, height: 900 });
      await expect(page.getByRole('heading', { name: 'The God I learned' })).toBeVisible();
      await expect(page.getByLabel('The God I learned seemed…')).toBeVisible();
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
      await page.screenshot({ path: testInfo.outputPath(`sg1-recognition-${width}.png`), fullPage: true });
    }
    await page.getByLabel('The God I learned seemed…').focus();
    await expect(page.getByLabel('The God I learned seemed…')).toBeFocused();
    await page.getByLabel('The God I learned seemed…').fill('A long participant description of a learned picture '.repeat(25));
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
    await page.getByRole('button', { name: 'Continue without saving a picture' }).click();
    await page.getByRole('button', { name: 'Continue without writing' }).click();
    await page.getByRole('button', { name: 'Complete lesson' }).click();
    await expect(page.getByRole('link', { name: /SG2 is next/ })).toBeVisible();
  } finally { await resetLocalE2eAccount(user.email); }
});
