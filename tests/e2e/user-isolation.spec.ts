import pg from 'pg';
import { expect, test } from '@playwright/test';
import { resetLocalE2eAccount } from '../helpers/local-e2e';
import { appRuntimeUrl } from '../setup/app-runtime';
import { e2eUser } from '../fixtures/users';
import { VERTICAL_SLICE } from '../fixtures/vertical-slice';

test('User B sees none of User A formation data or practice metadata', async ({ page }, testInfo) => {
  const userA = e2eUser('isolation-a', testInfo.project.name);
  const userB = e2eUser('isolation-b', testInfo.project.name);
  const pool = new pg.Pool({ connectionString: process.env.TEST_DATABASE_URL });
  await Promise.all([resetLocalE2eAccount(userA.email), resetLocalE2eAccount(userB.email)]);

  try {
    await page.goto(appRuntimeUrl('/sign-up'));
    await page.getByLabel('Email').fill(userA.email);
    await page.getByLabel('Password').fill(userA.password);
    await Promise.all([page.waitForURL(/\/dashboard$/), page.getByRole('button', { name: 'Create account' }).click()]);
    const userAId = (await pool.query('select id from auth.users where email=$1', [userA.email])).rows[0].id as string;
    await pool.query(
      `insert into public.journal_entries(user_id,curriculum_version_id,node_id,entry_kind,body)
       values($1,'phase-1-v1','awaken.pay-attention.observe','event',$2)`,
      [userAId, VERTICAL_SLICE.isolation.privateEvent],
    );
    const entries = await pool.query(
      `insert into public.journal_entries(user_id,curriculum_version_id,node_id,entry_kind,body) values
       ($1,'phase-1-v1','become.control','control_target',$2),
       ($1,'phase-1-v1','become.receive','present_truth',$3),
       ($1,'phase-1-v1','become.next-step','next_right_step',$4)
       returning id,entry_kind`,
      [userAId, VERTICAL_SLICE.become.controlTarget, VERTICAL_SLICE.become.presentTruth, VERTICAL_SLICE.isolation.privateNextStep],
    );
    const entryId = new Map(entries.rows.map(row => [row.entry_kind, row.id]));
    const practiceId = (await pool.query(
      `insert into public.practices(user_id,curriculum_version_id,node_id,control_target_entry_id,present_truth_entry_id,next_right_step_entry_id,state,opened_at)
       values($1,'phase-1-v1','become.practice.open',$2,$3,$4,'waiting_for_real_life',now()) returning id`,
      [userAId, entryId.get('control_target'), entryId.get('present_truth'), entryId.get('next_right_step')],
    )).rows[0].id as string;
    await pool.query(
      `insert into public.user_curriculum_state(user_id,curriculum_version_id,current_node_id,state,completed_node_ids)
       values($1,'phase-1-v1','become.practice.return','in_progress',array['awaken.pay-attention.observe'])`,
      [userAId],
    );
    const userAPracticeUrl = appRuntimeUrl(`/practices/${practiceId}`);
    await Promise.all([
      page.waitForURL(/\/sign-in$/),
      page.getByRole('button', { name: 'Sign out' }).click(),
    ]);

    await page.goto(appRuntimeUrl('/sign-up'));
    await page.getByLabel('Email').fill(userB.email);
    await page.getByLabel('Password').fill(userB.password);
    await Promise.all([page.waitForURL(/\/dashboard$/), page.getByRole('button', { name: 'Create account' }).click()]);
    await expect(page.getByRole('link', { name: 'Resume' })).toHaveAttribute('href', '/formation/awaken.pay-attention.observe');
    await expect(page.getByText(VERTICAL_SLICE.isolation.privateNextStep)).toHaveCount(0);
    await expect(page.getByRole('link', { name: 'Return to this practice' })).toHaveCount(0);
    await page.goto(appRuntimeUrl('/history'));
    await expect(page.getByText(VERTICAL_SLICE.isolation.privateEvent)).toHaveCount(0);
    await expect(page.getByText('Your formation history will appear here after you save a reflection.')).toBeVisible();
    const response = await page.goto(userAPracticeUrl);
    expect(response?.status()).toBe(404);

    const ids = await pool.query('select id,email from auth.users where email=any($1::text[]) order by email', [[userA.email, userB.email]]);
    const idByEmail = new Map(ids.rows.map(row => [row.email, row.id]));
    expect((await pool.query('select count(*) from public.journal_entries where user_id=$1', [idByEmail.get(userB.email)])).rows[0].count).toBe('0');
    expect((await pool.query('select count(*) from public.practices where user_id=$1', [idByEmail.get(userB.email)])).rows[0].count).toBe('0');
    expect((await pool.query('select count(*) from public.user_curriculum_state where user_id=$1', [idByEmail.get(userB.email)])).rows[0].count).toBe('0');
  } finally {
    await pool.end();
    await Promise.all([resetLocalE2eAccount(userA.email), resetLocalE2eAccount(userB.email)]);
  }
});
