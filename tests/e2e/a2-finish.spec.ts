import pg from 'pg';
import { expect, test } from '@playwright/test';
import { resetLocalE2eAccount } from '../helpers/local-e2e';
import { appRuntimeUrl } from '../setup/app-runtime';
import { e2eUser } from '../fixtures/users';

test('A2 saves, resumes, and completes with an isolated account on mobile and desktop', async ({ page }, testInfo) => {
  const user = e2eUser('a2-catch-yourself', testInfo.project.name);
  const reflection = 'I often withdraw when I think someone is disappointed in me.';
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

    await page.goto(appRuntimeUrl('/deep-dive/awaken/catch-yourself-being-you'));
    await expect(page.getByRole('heading', { level: 1, name: 'Catch Yourself Being You' })).toBeVisible();
    await expect(page.getByRole('progressbar', { name: 'Section 1 of 7' })).toHaveJSProperty('value', 1);
    await expect(page.getByRole('region', { name: 'A2 lesson progress' })).toBeVisible();
    await expect(page.locator('.deep-dive-lesson-meta')).toHaveCount(0);
    await page.getByRole('button', { name: 'Begin' }).click();
    await expect(page).toHaveURL(/section=patterns$/);
    await page.getByRole('checkbox', { name: 'A plan changes unexpectedly' }).check();
    await page.getByRole('checkbox', { name: 'I feel overlooked' }).check();
    await page.getByLabel('First internal move for A plan changes unexpectedly').selectOption('Urgency');
    await page.getByLabel('Typical response for A plan changes unexpectedly').selectOption('Control');
    await page.getByLabel('First internal move for I feel overlooked').selectOption('Insecurity');
    await page.getByLabel('Typical response for I feel overlooked').selectOption('Control');
    await expect(page.getByRole('region', { name: 'A response that repeats' })).toContainText('2 situations');
    const patternWidths = await page.evaluate(() => {
      const layoutSelectors = ['.deep-dive-shell', '.deep-dive-layout', '.deep-dive-content', '.deep-dive-lesson--a2', '.a2-pattern-map', '.a2-pattern-map__reflection'];
      const layout = layoutSelectors.map(selector => {
        const element = document.querySelector(selector);
        if (!element) return { selector, missing: true };
        const rect = element.getBoundingClientRect();
        const style = getComputedStyle(element);
        return { selector, left: Math.round(rect.left), right: Math.round(rect.right), width: Math.round(rect.width), scrollWidth: element.scrollWidth, clientWidth: element.clientWidth, gridTemplateColumns: style.gridTemplateColumns, display: style.display };
      });
      const overflow = Array.from(document.querySelectorAll('body *')).map(element => {
        const rect = element.getBoundingClientRect();
        return { tag: element.tagName, className: typeof element.className === 'string' ? element.className : '', text: element.textContent?.trim().slice(0, 80), left: Math.round(rect.left), right: Math.round(rect.right), width: Math.round(rect.width), scrollWidth: element.scrollWidth, clientWidth: element.clientWidth };
      }).filter(element => element.right > window.innerWidth + 1).sort((left, right) => right.right - left.right).slice(0, 12);
      return { viewport: window.innerWidth, document: document.documentElement.scrollWidth, layout, overflow };
    });
    expect(patternWidths.document, JSON.stringify({ layout: patternWidths.layout, overflow: patternWidths.overflow })).toBeLessThanOrEqual(patternWidths.viewport);
    await page.screenshot({ path: testInfo.outputPath(`a2-pattern-map-${testInfo.project.name}.png`), fullPage: true });
    await page.getByRole('button', { name: 'Continue' }).click();
    await expect(page.getByRole('heading', { level: 1, name: 'Seeing clearly' })).toBeVisible();
    await expect(page.getByRole('figure', { name: 'James 1:23–24 Scripture passage' })).toBeVisible();
    await page.getByRole('button', { name: 'Continue' }).click();
    await expect(page.getByRole('heading', { level: 1, name: 'What are you beginning to recognize?' })).toBeVisible();
    await page.getByLabel(/which response do you notice most often/i).fill(reflection);
    await page.getByRole('button', { name: 'Save & continue' }).click();
    await expect(page).toHaveURL(/section=go-deeper$/);
    await expect(page.getByRole('heading', { level: 1, name: 'Notice, name, ask, receive' })).toBeVisible();
    await page.getByRole('button', { name: /ASK.*optional/i }).click();
    await expect(page.getByRole('region', { name: 'ASK' })).toContainText('God, what do You want me to see here?');
    await page.getByRole('button', { name: /RECEIVE.*optional/i }).click();
    await expect(page.getByRole('region', { name: 'RECEIVE', exact: true })).toContainText(/stay with what becomes clear/i);
    await page.screenshot({ path: testInfo.outputPath(`a2-practice-${testInfo.project.name}.png`), fullPage: true });
    await page.getByRole('button', { name: 'Continue' }).click();
    await expect(page.getByRole('heading', { level: 1, name: 'Catch yourself being you' })).toBeVisible();
    await page.getByRole('button', { name: 'Continue' }).click();
    await expect(page.getByRole('heading', { level: 1, name: 'A pattern is something you can notice' })).toBeVisible();

    const widths = await page.evaluate(() => ({ viewport: window.innerWidth, document: document.documentElement.scrollWidth }));
    expect(widths.document).toBeLessThanOrEqual(widths.viewport);
    await page.screenshot({ path: testInfo.outputPath(`a2-${testInfo.project.name}.png`), fullPage: true });

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
    await page.goto(appRuntimeUrl('/deep-dive/awaken/catch-yourself-being-you'));
    await expect(page.getByRole('progressbar', { name: 'Section 7 of 7' })).toHaveJSProperty('value', 7);
    await expect(page.getByRole('heading', { level: 1, name: 'A pattern is something you can notice' })).toBeVisible();
    await page.getByRole('button', { name: 'Complete lesson' }).click();
    await expect(page).toHaveURL(/catch-yourself-being-you\?section=carry-forward$/);
    const forward = page.getByRole('link', { name: 'Continue to A3' });
    const back = page.getByRole('link', { name: 'Back to Awaken' });
    await forward.focus();
    await expect(forward).toBeFocused();
    await page.keyboard.press('Tab');
    await expect(back).toBeFocused();
    await expect.poll(() => page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    await page.screenshot({ path: testInfo.outputPath(`a2-completed-${testInfo.project.name}.png`), fullPage: true });
    await forward.click();
    await expect(page).toHaveURL(/your-reactions-have-a-history$/);
    await page.goto(appRuntimeUrl('/deep-dive'));
    await page.getByRole('link', { name: 'Catch Yourself Being You · A2' }).click();
    await expect(page).toHaveURL(/section=entry$/);
    await expect(page.getByRole('link', { name: '← Back' })).toBeVisible();
    await page.getByRole('link', { name: 'Continue' }).click();
    await expect(page).toHaveURL(/section=patterns$/);
    await page.goto(appRuntimeUrl('/deep-dive/awaken/catch-yourself-being-you?section=reflection'));
    await expect(page.getByRole('region', { name: 'Your saved reflection' })).toContainText(reflection);
    await expect(page.getByRole('button', { name: 'Save & continue' })).toHaveCount(0);

    const persisted = await pool.query(
      `select p.last_section_id, p.completed_at, r.body
       from public.deep_dive_module_progress p
       join public.deep_dive_reflections r on (r.progress_id,r.user_id)=(p.id,p.user_id)
       where p.user_id=(select id from auth.users where email=$1)
         and p.module_id='awaken.catch-yourself-being-you' and r.prompt_id='first-response'`,
      [user.email],
    );
    expect(persisted.rows).toEqual([expect.objectContaining({ last_section_id: 'carry-forward', body: reflection })]);
    expect(persisted.rows[0].completed_at).toBeTruthy();
    const a1 = await pool.query(
      `select id from public.deep_dive_module_progress
       where user_id=(select id from auth.users where email=$1) and module_id='awaken.pay-attention'`,
      [user.email],
    );
    expect(a1.rows).toEqual([]);
  } finally {
    await pool.end();
    await resetLocalE2eAccount(user.email);
  }
});

test('A2 Skip for now advances without saving a reflection and resumes there', async ({ page }, testInfo) => {
  const user = e2eUser('a2-skip-for-now', testInfo.project.name);
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

    await page.goto(appRuntimeUrl('/deep-dive/awaken/catch-yourself-being-you?section=reflection'));
    await expect(page.getByRole('heading', { level: 1, name: 'What are you beginning to recognize?' })).toBeVisible();
    await page.getByRole('button', { name: 'Continue without writing' }).click();
    await expect(page).toHaveURL(/section=go-deeper$/);
    await expect(page.getByRole('heading', { level: 1, name: 'Notice, name, ask, receive' })).toBeVisible();
    await expect(page.getByRole('progressbar', { name: 'Section 5 of 7' })).toHaveJSProperty('value', 5);
    await expect(page.getByText('Reflection saved.', { exact: true })).toHaveCount(0);

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
    await page.goto(appRuntimeUrl('/deep-dive/awaken/catch-yourself-being-you'));
    await expect(page.getByRole('heading', { level: 1, name: 'Notice, name, ask, receive' })).toBeVisible();
    await expect(page.getByRole('progressbar', { name: 'Section 5 of 7' })).toHaveJSProperty('value', 5);

    const state = await pool.query(
      `select p.last_section_id, r.body
       from public.deep_dive_module_progress p
       left join public.deep_dive_reflections r
         on (r.progress_id,r.user_id)=(p.id,p.user_id) and r.prompt_id='first-response'
       where p.user_id=(select id from auth.users where email=$1)
         and p.module_id='awaken.catch-yourself-being-you'`,
      [user.email],
    );
    expect(state.rows).toEqual([{ last_section_id: 'go-deeper', body: null }]);
  } finally {
    await pool.end();
    await resetLocalE2eAccount(user.email);
  }
});
