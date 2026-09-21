import pg from 'pg';
import { expect, test } from '@playwright/test';
import { resetLocalE2eAccount } from '../helpers/local-e2e';
import { appRuntimeUrl } from '../setup/app-runtime';

test('explicit deletion removes source dependents and preserves curriculum progress', async ({ page }, testInfo) => {
  const email = `deletion-${testInfo.project.name}@rts.test`, password = 'local-e2e-only-password';
  await resetLocalE2eAccount(email);
  const pool = new pg.Pool({ connectionString: process.env.TEST_DATABASE_URL });
  try {
    await page.goto(appRuntimeUrl('/sign-up'));
    await page.getByLabel('Email').fill(email); await page.getByLabel('Password').fill(password);
    await Promise.all([page.waitForURL(/dashboard$/), page.getByRole('button', { name: 'Create account' }).click()]);
    const userId = (await pool.query('select id from auth.users where email=$1', [email])).rows[0].id;
    const source = (await pool.query(`insert into public.journal_entries(user_id,curriculum_version_id,node_id,entry_kind,body) values($1,'phase-1-v1','awaken.pay-attention.observe','event','The source entry I chose to remove.') returning id`, [userId])).rows[0].id;
    const other = (await pool.query(`insert into public.journal_entries(user_id,curriculum_version_id,node_id,entry_kind,body) values($1,'phase-1-v1','awaken.pay-attention.inside','internal_response','This unrelated entry remains.') returning id`, [userId])).rows[0].id;
    const record = (await pool.query(`insert into public.formation_records(user_id,curriculum_version_id,node_id,record_type,value_text,source_journal_entry_id,provenance) values($1,'phase-1-v1','see-clearly.fact','observable_fact','dependent fact',$2,'user_authored') returning id`, [userId, source])).rows[0].id;
    await pool.query(`insert into public.formation_links(user_id,link_type,source_journal_entry_id,target_formation_record_id) values($1,'awaken_to_see_clearly',$2,$3)`, [userId, source, record]);
    const grant = (await pool.query(`insert into public.ai_context_grants(user_id,journal_entry_id,scope) values($1,$2,'single_entry_reflect') returning id,revision`, [userId, source])).rows[0];
    const thread = (await pool.query(`insert into public.ai_threads(user_id,intent_id,request_fingerprint,mode,stage,curriculum_version_id,node_id,status,model_id,global_policy_version,stage_policy_version,mode_policy_version,output_schema_version) values($1,gen_random_uuid(),'deletion-e2e','reflect','become','phase-1-v1','awaken.pay-attention.reflect','success','test-model','g1','s1','m1','o1') returning id`, [userId])).rows[0].id;
    const artifact = (await pool.query(`insert into public.ai_artifacts(user_id,thread_id,artifact_type,content,status,provenance,model_id,global_policy_version,stage_policy_version,mode_policy_version,output_schema_version) values($1,$2,'summary','{"summary":"dependent AI material"}','suggested','ai_suggested','test-model','g1','s1','m1','o1') returning id`, [userId, thread])).rows[0].id;
    await pool.query(`insert into public.ai_artifact_sources(user_id,artifact_id,journal_entry_id,context_grant_id,grant_revision,source_role) values($1,$2,$3,$4,$5,'selected_prior'),($1,$2,$6,null,null,'current')`, [userId, artifact, source, grant.id, grant.revision, other]);
    await pool.query(`insert into public.user_curriculum_state(user_id,curriculum_version_id,current_node_id,state,completed_node_ids) values($1,'phase-1-v1','become.practice.review','completed',array['awaken.pay-attention.observe'])`, [userId]);

    await page.goto(appRuntimeUrl('/history'));
    const article = page.getByText('The source entry I chose to remove.').locator('xpath=ancestor::article');
    await article.getByRole('button', { name: 'Delete entry' }).click();
    const confirm = article.getByRole('button', { name: 'Permanently delete entry' });
    await expect(confirm).toBeFocused();
    await expect(article.getByText(/curriculum progress stays intact/i)).toBeVisible();
    await confirm.click();
    await expect(page.getByText('The source entry I chose to remove.')).toHaveCount(0);
    await expect(page.getByText('This unrelated entry remains.')).toBeVisible();

    expect((await pool.query('select count(*) from public.journal_entries where id=$1', [source])).rows[0].count).toBe('0');
    expect((await pool.query('select count(*) from public.ai_artifacts where id=$1', [artifact])).rows[0].count).toBe('0');
    expect((await pool.query('select count(*) from public.ai_context_grants where id=$1', [grant.id])).rows[0].count).toBe('0');
    expect((await pool.query("select count(*) from public.user_curriculum_state where user_id=$1 and current_node_id='become.practice.review' and state='completed'", [userId])).rows[0].count).toBe('1');
  } finally { await pool.end(); await resetLocalE2eAccount(email); }
});
