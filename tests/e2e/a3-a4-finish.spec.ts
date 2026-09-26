import pg from 'pg';
import { expect, test } from '@playwright/test';
import { resetLocalE2eAccount } from '../helpers/local-e2e';
import { appRuntimeUrl } from '../setup/app-runtime';
import { e2eUser } from '../fixtures/users';
import { A3_SECTIONS, A4_SECTIONS } from '../../content/deep-dive/v1/awaken/four-module-lessons';

test('A3 and A4 form a concise, persistent Awaken handoff', async ({ page }, testInfo) => {
  const user = e2eUser('a3-a4-stage', testInfo.project.name);
  const pool = new pg.Pool({ connectionString: process.env.TEST_DATABASE_URL });
  await resetLocalE2eAccount(user.email);
  try {
    await page.goto(appRuntimeUrl('/sign-up'));
    await page.getByLabel('Email').fill(user.email);
    await page.getByLabel('Password').fill(user.password);
    await Promise.all([page.waitForURL(/\/dashboard$/), page.getByRole('button', { name: 'Create account' }).click()]);
    for (const [slug, moduleId, reflection] of [
      ['your-reactions-have-a-history', 'awaken.your-reactions-have-a-history', 'I may have learned to withdraw when conflict felt unsafe.'],
      ['formation-is-not-identity', 'awaken.formation-is-not-identity', 'Withdrawal is learned; it is not the whole truth of me.'],
    ] as const) {
      const base = `/deep-dive/awaken/${slug}`;
      await page.goto(appRuntimeUrl(base));
      const firstScreen = await page.evaluate(() => ({
        header: document.querySelector('.app-shell-header')!.getBoundingClientRect().height,
        stages: document.querySelector('.stage-context')!.getBoundingClientRect().height,
        titleTop: document.querySelector('.deep-dive-lesson h1')!.getBoundingClientRect().top,
        viewport: innerWidth,
        document: document.documentElement.scrollWidth,
      }));
      expect(firstScreen.document).toBeLessThanOrEqual(firstScreen.viewport);
      if (firstScreen.viewport === 375) {
        expect(firstScreen.header).toBeLessThanOrEqual(70);
        expect(firstScreen.stages).toBeLessThanOrEqual(75);
        expect(firstScreen.titleTop).toBeLessThan(420);
      }
      await expect(page.locator('.app-shell-header').getByRole('button', { name: 'Sign out' })).toBeVisible();
      await expect(page.getByRole('region', { name: /A[34] lesson progress/ })).toBeVisible();
      await page.getByRole('button', { name: 'Continue' }).click();
      await expect(page).toHaveURL(/section=teaching$/);
      await page.getByRole('link', { name: '← Back' }).click();
      await expect(page).toHaveURL(/section=entry$/);
      await page.getByRole('link', { name: '← Back' }).click();
      await expect(page).toHaveURL(/\/deep-dive\/awaken$/);
      await page.goto(appRuntimeUrl(base));
      await expect(page.getByRole('heading', { level: 1, name: slug === 'formation-is-not-identity' ? 'Made new, still being formed' : 'What once made sense' })).toBeVisible();
      await page.goto(appRuntimeUrl('/deep-dive/awaken'));
      const lessonTitle = slug === 'formation-is-not-identity' ? 'Formation Is Not Identity · A4' : 'Your Reactions Have a History · A3';
      const resume = page.getByRole('link', { name: `Resume ${lessonTitle}` });
      await expect(resume).toHaveAttribute('href', new RegExp('section=teaching$'));
      await resume.click();
      await expect(page.getByRole('heading', { level: 1, name: slug === 'formation-is-not-identity' ? 'Made new, still being formed' : 'What once made sense' })).toBeVisible();
      await page.getByRole('button', { name: 'Continue' }).click();
      if (slug === 'your-reactions-have-a-history') {
        await page.getByLabel('Recurring response').selectOption('Withdrawal');
        await page.getByLabel('Possible source').selectOption("I'm not sure");
        await expect(page.getByRole('region', { name: 'Your working thread' })).toContainText('Withdrawal');
        const cards = await page.locator('.a3-thread__card').evaluateAll(elements => elements.map(element => {
          const { x, y, width, height } = element.getBoundingClientRect();
          const control = element.querySelector('select, input')!.getBoundingClientRect();
          return { x, y, width, height, controlY: control.y };
        }));
        expect(cards).toHaveLength(3);
        if (firstScreen.viewport === 1536) {
          expect(Math.max(...cards.map(card => card.width)) - Math.min(...cards.map(card => card.width))).toBeLessThan(1);
          expect(new Set(cards.map(card => card.y))).toHaveProperty('size', 1);
          expect(new Set(cards.map(card => card.controlY))).toHaveProperty('size', 1);
        } else {
          expect(cards[0].y).toBeLessThan(cards[1].y);
          expect(cards[1].y).toBeLessThan(cards[2].y);
        }
        expect(page.locator('.a3-thread').getByText('←')).toHaveCount(0);
      } else {
        await page.getByLabel('A pattern you recognize').fill('I like to be in control.');
        await page.getByRole('button', { name: 'See another way to say it' }).click();
        await expect(page.getByRole('region', { name: 'Your working reframe' })).toContainText('not the whole truth');
        await expect(page.getByRole('region', { name: 'Your working reframe' })).toContainText('I like to be in control.');
        await page.getByLabel('A different way to say it').fill('I sometimes move toward control, but it is not the whole truth of who I am.');
        await expect(page.getByLabel('A different way to say it')).toHaveValue(/I sometimes move toward control/);
      }
      const widths = await page.evaluate(() => ({ viewport: innerWidth, document: document.documentElement.scrollWidth }));
      expect(widths.document).toBeLessThanOrEqual(widths.viewport);
      await page.screenshot({ path: testInfo.outputPath(`${slug}-${testInfo.project.name}.png`), fullPage: true });
      await page.getByRole('button', { name: 'Continue' }).click();
      const reflectionHeight = await page.locator('.deep-dive-reflection textarea').evaluate(element => element.getBoundingClientRect().height);
      if (firstScreen.viewport === 375) expect(reflectionHeight).toBeLessThan(145);
      await page.screenshot({ path: testInfo.outputPath(`${slug}-reflection-${testInfo.project.name}.png`), fullPage: true });
      await page.getByRole('textbox', { name: /Where might|Which pattern/i }).fill(reflection);
      await page.getByRole('button', { name: 'Save & continue' }).click();
      await expect(page).toHaveURL(/section=practice$/);
      await page.goto(appRuntimeUrl(base));
      await expect(page.getByRole('heading', { level: 1, name: /Notice one possible connection|Notice without forcing an answer/ })).toBeVisible();
      await page.getByRole('button', { name: 'Continue' }).click();
      if (slug === 'formation-is-not-identity') {
        await expect(page.getByRole('heading', { level: 1, name: 'Ready to see clearly' })).toBeVisible();
        await expect(page.getByText('ASK', { exact: true })).toBeVisible();
      }
      await page.getByRole('button', { name: 'Complete lesson' }).click();
      await expect(page).toHaveURL(/section=carry-forward$/);
      const label = slug === 'formation-is-not-identity' ? 'Continue to See Clearly' : 'Continue to A4';
      const forward = page.getByRole('link', { name: label });
      const back = page.getByRole('link', { name: 'Back to Awaken' });
      await forward.focus();
      await expect(forward).toBeFocused();
      await page.keyboard.press('Tab');
      await expect(back).toBeFocused();
      await expect.poll(() => page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
      await page.screenshot({ path: testInfo.outputPath(`${slug === 'formation-is-not-identity' ? 'a4' : 'a3'}-completed-${testInfo.project.name}.png`), fullPage: true });
      const beforeReview = await pool.query('select p.last_section_id,p.completed_at,p.updated_at,r.body,r.updated_at as reflection_updated_at from public.deep_dive_module_progress p join public.deep_dive_reflections r on (p.id,p.user_id)=(r.progress_id,r.user_id) where p.user_id=(select id from auth.users where email=$1) and p.module_id=$2', [user.email, moduleId]);
      await forward.click();
      await expect(page).toHaveURL(slug === 'formation-is-not-identity' ? /see-clearly/ : /formation-is-not-identity$/);
      await expect(page.getByRole('heading', { level: 1, name: slug === 'formation-is-not-identity' ? /See Clearly/i : 'Formation Is Not Identity' })).toBeVisible();
      await page.goto(appRuntimeUrl('/deep-dive/awaken'));
      const reviewLink = page.getByRole('link', { name: `Review ${lessonTitle}` });
      await expect(reviewLink).toHaveAttribute('href', new RegExp('section=entry$'));
      await reviewLink.click();
      await expect(page.getByRole('heading', { level: 1, name: slug === 'formation-is-not-identity' ? 'Formation Is Not Identity' : 'Your Reactions Have a History' })).toBeVisible();
      const sections = slug === 'formation-is-not-identity' ? A4_SECTIONS : A3_SECTIONS;
      for (const nextSection of sections.slice(1)) {
        await page.getByRole('link', { name: 'Continue', exact: true }).click();
        await expect(page).toHaveURL(new RegExp(`section=${nextSection.id}$`));
        await expect(page.getByRole('heading', { level: 1, name: nextSection.title })).toBeVisible();
        if (nextSection.id === 'reflection') await expect(page.locator('.deep-dive-reflection textarea')).toHaveValue(reflection);
        if (nextSection.id === 'reflection') {
          await page.getByRole('link', { name: '← Back' }).click();
          await expect(page).toHaveURL(new RegExp(`section=${sections[sections.findIndex(item => item.id === nextSection.id) - 1].id}$`));
          await page.getByRole('link', { name: 'Continue', exact: true }).click();
          await expect(page.locator('.deep-dive-reflection textarea')).toHaveValue(reflection);
        }
      }
      const afterReview = await pool.query('select p.last_section_id,p.completed_at,p.updated_at,r.body,r.updated_at as reflection_updated_at from public.deep_dive_module_progress p join public.deep_dive_reflections r on (p.id,p.user_id)=(r.progress_id,r.user_id) where p.user_id=(select id from auth.users where email=$1) and p.module_id=$2', [user.email, moduleId]);
      expect(afterReview.rows).toEqual(beforeReview.rows);
      await page.goto(appRuntimeUrl('/deep-dive'));
      await page.getByRole('link', { name: new RegExp(`Review ${slug === 'formation-is-not-identity' ? 'Formation Is Not Identity' : 'Your Reactions Have a History'} · A[34]`) }).click();
      await expect(page).toHaveURL(/section=entry$/);
      await page.goto(appRuntimeUrl(base));
      for (let index = 0; index < 3; index += 1) await page.getByRole('button', { name: 'Continue', exact: true }).click();
      await expect(page).toHaveURL(/section=reflection$/);
      await expect(page.locator('.deep-dive-reflection textarea')).toHaveValue(reflection);
      const record = await pool.query('select p.last_section_id,p.completed_at,r.body from public.deep_dive_module_progress p join public.deep_dive_reflections r on (p.id,p.user_id)=(r.progress_id,r.user_id) where p.user_id=(select id from auth.users where email=$1) and p.module_id=$2', [user.email, moduleId]);
      expect(record.rows).toEqual([expect.objectContaining({ last_section_id: 'carry-forward', body: reflection })]);
      expect(record.rows[0].completed_at).toBeTruthy();
    }
  } finally { await pool.end(); await resetLocalE2eAccount(user.email); }
});

test('A3 and A4 can skip an empty reflection and resume at practice', async ({ page }, testInfo) => {
  const user = e2eUser('a3-a4-skip', testInfo.project.name);
  await resetLocalE2eAccount(user.email);
  try {
    await page.goto(appRuntimeUrl('/sign-up'));
    await page.getByLabel('Email').fill(user.email);
    await page.getByLabel('Password').fill(user.password);
    await Promise.all([page.waitForURL(/\/dashboard$/), page.getByRole('button', { name: 'Create account' }).click()]);
    for (const slug of ['your-reactions-have-a-history', 'formation-is-not-identity']) {
      const base = `/deep-dive/awaken/${slug}`;
      await page.goto(appRuntimeUrl(`${base}?section=reflection`));
      await page.getByRole('textbox', { name: /Where might|Which pattern/i }).fill('   ');
      await expect(page.getByRole('button', { name: 'Save & continue' })).toBeDisabled();
      await page.getByRole('button', { name: 'Continue without writing' }).click();
      await expect(page).toHaveURL(/section=practice$/);
      await page.goto(appRuntimeUrl(base));
      await expect(page).toHaveURL(/formation-is-not-identity$|your-reactions-have-a-history$/);
      await expect(page.getByRole('heading', { level: 1, name: /Notice one possible connection|Notice without forcing an answer/ })).toBeVisible();
    }
  } finally { await resetLocalE2eAccount(user.email); }
});
