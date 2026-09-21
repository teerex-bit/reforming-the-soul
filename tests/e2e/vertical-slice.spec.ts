import pg from 'pg';
import { expect, test } from '@playwright/test';
import { resetLocalE2eAccount } from '../helpers/local-e2e';
import { appRuntimeUrl } from '../setup/app-runtime';
import { e2eUser } from '../fixtures/users';
import { VERTICAL_SLICE } from '../fixtures/vertical-slice';

test.describe.configure({ mode: 'serial' });

async function expectPracticeState(pool: pg.Pool, practiceId: string, userId: string, expected: string) {
  await expect.poll(async () => (await pool.query(
    'select state::text from public.practices where id=$1 and user_id=$2',
    [practiceId, userId],
  )).rows[0]?.state ?? null).toBe(expected);
}

test('the exact approved vertical slice works end to end', async ({ page }, testInfo) => {
  const user = e2eUser('vertical-slice', testInfo.project.name);
  const pool = new pg.Pool({ connectionString: process.env.TEST_DATABASE_URL });
  await resetLocalE2eAccount(user.email);

  try {
    // 1–2. Account creation and an independent curriculum resume point.
    await page.goto(appRuntimeUrl('/sign-up'));
    await page.getByLabel('Email').fill(user.email);
    await page.getByLabel('Password').fill(user.password);
    await Promise.all([
      page.waitForURL(/\/dashboard$/),
      page.getByRole('button', { name: 'Create account' }).click(),
    ]);
    await expect(page.getByRole('link', { name: 'Resume' })).toHaveAttribute(
      'href',
      '/formation/awaken.pay-attention.observe',
    );
    const userId = (await pool.query('select id from auth.users where email=$1', [user.email])).rows[0].id as string;

    // 3–7. Awaken observation, bounded current-entry AI Reflect, explicit save.
    await page.goto(appRuntimeUrl('/formation/awaken.pay-attention.observe'));
    await page.getByLabel('What happened?').fill(VERTICAL_SLICE.awaken.event);
    await page.getByLabel('What happened inside me?').fill(VERTICAL_SLICE.awaken.inside);
    await page.getByLabel('What did you notice in your body?').fill(VERTICAL_SLICE.awaken.bodyCue);
    await page.getByRole('button', { name: 'Save and continue' }).click();
    await expect(page).toHaveURL(/\/formation\/awaken\.pay-attention\.reflect$/);
    await page.getByRole('button', { name: 'Reflect with AI' }).click();
    await expect(page.getByText(VERTICAL_SLICE.ai.currentQuestion)).toBeVisible();
    await page.getByLabel('What would you like to save in your own words?').fill(VERTICAL_SLICE.ai.savedInsight);
    await page.getByRole('button', { name: 'Save my added insight' }).click();

    // 8–10. See Clearly keeps fact, interpretation, and expectation distinct.
    await page.getByRole('link', { name: 'Continue' }).click();
    await page.getByLabel('What is the observable fact?').fill(VERTICAL_SLICE.seeClearly.fact);
    await page.getByLabel('What is my interpretation?').fill(VERTICAL_SLICE.seeClearly.interpretation);
    await page.getByRole('radio', { name: 'expectation' }).check();
    await page.locator('textarea[name="belief_expectation_text"]').fill(VERTICAL_SLICE.seeClearly.expectation);
    await page.getByRole('button', { name: 'Save and continue' }).click();

    // 11–13. Become creates the open real-life practice.
    await page.getByRole('link', { name: 'Continue' }).click();
    await page.getByLabel('What outcome am I trying to control?').fill(VERTICAL_SLICE.become.controlTarget);
    await page.getByLabel('What is actually true in the present moment?').fill(VERTICAL_SLICE.become.presentTruth);
    await page.getByLabel('What is the next right step?').fill(VERTICAL_SLICE.become.nextRightStep);
    await page.getByRole('button', { name: 'Save as open practice' }).click();
    let practiceId = '';
    await expect.poll(async () => {
      const row = (await pool.query(
        `select p.id from public.practices p
         join public.journal_entries step on (step.id,step.user_id)=(p.next_right_step_entry_id,p.user_id)
         where p.user_id=$1 and p.state='waiting_for_real_life' and step.body=$2`,
        [userId, VERTICAL_SLICE.become.nextRightStep],
      )).rows[0];
      practiceId = row?.id ?? '';
      return practiceId;
    }).toMatch(/^[0-9a-f]{8}-[0-9a-f-]{27}$/i);
    const practiceUrl = appRuntimeUrl(`/practices/${practiceId}`);
    await expect(page).toHaveURL(practiceUrl);
    await expect(page.getByText('waiting for real life')).toBeVisible();
    await expectPracticeState(pool, practiceId, userId, 'waiting_for_real_life');

    // 14–16. Leave, authenticate later, and surface unfinished practice separately.
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
    await expect(page.getByRole('link', { name: 'Resume' })).toHaveAttribute('href', '/formation/become.practice.return');
    await expect(page.getByText(VERTICAL_SLICE.become.nextRightStep)).toBeVisible();

    const persistedJournal = (await pool.query(
      `select entry_kind::text,body from public.journal_entries where user_id=$1 order by entry_kind::text`,
      [userId],
    )).rows;
    expect(persistedJournal).toHaveLength(10);
    expect(persistedJournal).toEqual(expect.arrayContaining([
      { entry_kind: 'event', body: VERTICAL_SLICE.awaken.event },
      { entry_kind: 'internal_response', body: VERTICAL_SLICE.awaken.inside },
      { entry_kind: 'body_cue', body: VERTICAL_SLICE.awaken.bodyCue },
      { entry_kind: 'added_insight', body: VERTICAL_SLICE.ai.savedInsight },
      { entry_kind: 'observable_fact', body: VERTICAL_SLICE.seeClearly.fact },
      { entry_kind: 'interpretation', body: VERTICAL_SLICE.seeClearly.interpretation },
      { entry_kind: 'belief_expectation', body: VERTICAL_SLICE.seeClearly.expectation },
      { entry_kind: 'control_target', body: VERTICAL_SLICE.become.controlTarget },
      { entry_kind: 'present_truth', body: VERTICAL_SLICE.become.presentTruth },
      { entry_kind: 'next_right_step', body: VERTICAL_SLICE.become.nextRightStep },
    ]));
    const persistedRecords = (await pool.query(
      `select record_type::text,value_text,provenance::text,source_journal_entry_id
       from public.formation_records where user_id=$1 order by record_type::text`,
      [userId],
    )).rows;
    expect(persistedRecords).toHaveLength(9);
    expect(persistedRecords.every(record => record.provenance === 'user_authored' && record.source_journal_entry_id)).toBe(true);
    expect(persistedRecords).toEqual(expect.arrayContaining([
      expect.objectContaining({ record_type: 'observation', value_text: VERTICAL_SLICE.awaken.event }),
      expect.objectContaining({ record_type: 'reaction', value_text: VERTICAL_SLICE.awaken.inside }),
      expect.objectContaining({ record_type: 'body_cue', value_text: VERTICAL_SLICE.awaken.bodyCue }),
      expect.objectContaining({ record_type: 'observable_fact', value_text: VERTICAL_SLICE.seeClearly.fact }),
      expect.objectContaining({ record_type: 'interpretation', value_text: VERTICAL_SLICE.seeClearly.interpretation }),
      expect.objectContaining({ record_type: 'expectation', value_text: VERTICAL_SLICE.seeClearly.expectation }),
      expect.objectContaining({ record_type: 'control_target', value_text: VERTICAL_SLICE.become.controlTarget }),
      expect.objectContaining({ record_type: 'present_truth', value_text: VERTICAL_SLICE.become.presentTruth }),
      expect.objectContaining({ record_type: 'next_right_step', value_text: VERTICAL_SLICE.become.nextRightStep }),
    ]));
    await page.getByRole('link', { name: 'Return to this practice' }).click();
    await expect(page).toHaveURL(practiceUrl);

    // 17–18. Record the outcome, review it, then close the practice.
    await page.getByLabel(/What happened/).fill(VERTICAL_SLICE.practice.outcome);
    await page.getByRole('button', { name: 'Save what happened' }).click();
    await expectPracticeState(pool, practiceId, userId, 'ready_to_review');
    await expect.poll(async () => (await pool.query(
      `select outcome.body from public.practice_returns pr
       join public.journal_entries outcome on (outcome.id,outcome.user_id)=(pr.outcome_entry_id,pr.user_id)
       where pr.practice_id=$1 and pr.user_id=$2`,
      [practiceId, userId],
    )).rows[0]?.body ?? null).toBe(VERTICAL_SLICE.practice.outcome);
    await page.getByLabel('What are you noticing now?').fill(VERTICAL_SLICE.practice.review);
    await page.getByRole('button', { name: 'Save review' }).click();
    await expectPracticeState(pool, practiceId, userId, 'reviewed');
    await expect.poll(async () => (await pool.query(
      `select review.body from public.practice_returns pr
       join public.journal_entries review on (review.id,review.user_id)=(pr.review_entry_id,pr.user_id)
       where pr.practice_id=$1 and pr.user_id=$2`,
      [practiceId, userId],
    )).rows[0]?.body ?? null).toBe(VERTICAL_SLICE.practice.review);
    const reviewEntryId = (await pool.query(
      `select review.id,review.body from public.practice_returns pr
       join public.journal_entries review on (review.id,review.user_id)=(pr.review_entry_id,pr.user_id)
       where pr.practice_id=$1 and pr.user_id=$2`,
      [practiceId, userId],
    )).rows[0];
    expect(reviewEntryId.body).toBe(VERTICAL_SLICE.practice.review);

    await page.getByRole('button', { name: 'Close practice' }).click();
    await expect(page).toHaveURL(/\/dashboard$/);
    await expectPracticeState(pool, practiceId, userId, 'closed');
    await expect(page.getByRole('link', { name: 'Return to this practice' })).toHaveCount(0);

    // 19. History labels user wording and structured records separately.
    await page.getByRole('link', { name: 'View formation history' }).click();
    await expect(page.getByText(VERTICAL_SLICE.awaken.event).first()).toBeVisible();
    await expect(page.getByText('User wording').first()).toBeVisible();
    await expect(page.getByText('Structured by you').first()).toBeVisible();

    // 20–21. Explicitly permit one earlier entry and use only that selected context.
    await page.goto(practiceUrl);
    await expect(page.getByText(VERTICAL_SLICE.awaken.event)).toBeVisible();
    const source = (await pool.query(
      `select id from public.journal_entries where user_id=$1 and node_id='awaken.pay-attention.observe' and entry_kind='event'`,
      [userId],
    )).rows[0].id as string;
    await page.getByRole('button', { name: 'Allow this entry' }).click();
    let activeGrant: { id: string; revision: number } | undefined;
    await expect.poll(async () => {
      activeGrant = (await pool.query(
        `select id,revision from public.ai_context_grants
         where user_id=$1 and journal_entry_id=$2 and scope='single_entry_reflect' and revoked_at is null`,
        [userId, source],
      )).rows[0];
      return activeGrant ? `${activeGrant.id}:${activeGrant.revision}` : '';
    }).toMatch(/^[0-9a-f-]{36}:[1-9][0-9]*$/i);
    await page.getByRole('button', { name: 'Reflect with AI' }).click();
    await expect(page.getByText(VERTICAL_SLICE.ai.selectedQuestion)).toBeVisible();
    await page.getByRole('button', { name: 'Save AI suggestion' }).click();
    await expect.poll(async () => Number((await pool.query('select count(*) from public.ai_artifacts where user_id=$1', [userId])).rows[0].count)).toBe(1);

    const artifact = (await pool.query(
      `select id,curriculum_version_id,provenance::text,status::text,model_id,
              global_policy_version,stage_policy_version,mode_policy_version,output_schema_version
       from public.ai_artifacts where user_id=$1`,
      [userId],
    )).rows[0];
    expect(artifact).toMatchObject({
      curriculum_version_id: 'phase-1-v1', provenance: 'ai_suggested', status: 'suggested',
      model_id: expect.any(String), global_policy_version: expect.any(String), stage_policy_version: expect.any(String),
      mode_policy_version: expect.any(String), output_schema_version: expect.any(String),
    });
    await expect.poll(async () => Number((await pool.query(
      'select count(*) from public.ai_artifact_sources where user_id=$1 and artifact_id=$2',
      [userId, artifact.id],
    )).rows[0].count)).toBe(2);
    expect((await pool.query(
      `select source_role::text,journal_entry_id,context_grant_id,grant_revision
       from public.ai_artifact_sources where user_id=$1 and artifact_id=$2 order by source_role::text`,
      [userId, artifact.id],
    )).rows).toEqual([
      { source_role: 'current', journal_entry_id: reviewEntryId.id, context_grant_id: null, grant_revision: null },
      { source_role: 'selected_prior', journal_entry_id: source, context_grant_id: activeGrant!.id, grant_revision: activeGrant!.revision },
    ]);
    await page.getByRole('button', { name: 'Revoke permission' }).click();
    await expect(page.getByRole('button', { name: 'Allow this entry' })).toBeVisible();
    await expect.poll(async () => (await pool.query(
      'select revision,revoked_at is not null as revoked from public.ai_context_grants where id=$1 and user_id=$2',
      [activeGrant!.id, userId],
    )).rows[0]).toEqual({ revision: activeGrant!.revision + 1, revoked: true });
    await page.goto(appRuntimeUrl('/history'));
    await expect(page.getByText('AI suggestion').first()).toBeVisible();

    const progressBefore = (await pool.query(
      'select current_node_id,state,completed_node_ids from public.user_curriculum_state where user_id=$1',
      [userId],
    )).rows[0];
    const dependentArtifact = artifact.id as string;
    expect((await pool.query('select count(*) from public.ai_context_grants where user_id=$1 and journal_entry_id=$2 and revoked_at is null', [userId, source])).rows[0].count).toBe('0');

    // 22–24. Delete the source and dependent AI data, while progress remains intact.
    const sourceArticle = page.getByText(VERTICAL_SLICE.awaken.event).first().locator('xpath=ancestor::article');
    await sourceArticle.getByRole('button', { name: 'Delete entry' }).click();
    await sourceArticle.getByRole('button', { name: 'Permanently delete entry' }).click();
    await expect(page.getByText(VERTICAL_SLICE.awaken.event)).toHaveCount(0);
    await expect.poll(async () => (await pool.query(
      `select
         (select count(*)::integer from public.journal_entries where id=$1) journal_count,
         (select count(*)::integer from public.ai_artifacts where id=$2) artifact_count,
         (select count(*)::integer from public.ai_context_grants where user_id=$3 and journal_entry_id=$1) grant_count`,
      [source, dependentArtifact, userId],
    )).rows[0]).toEqual({ journal_count: 0, artifact_count: 0, grant_count: 0 });
    expect((await pool.query('select current_node_id,state,completed_node_ids from public.user_curriculum_state where user_id=$1', [userId])).rows[0]).toEqual(progressBefore);
  } finally {
    await pool.end();
    await resetLocalE2eAccount(user.email);
  }
});
