import { randomUUID } from 'node:crypto';
import { afterAll, describe, expect, it, vi } from 'vitest';
import { createTestPool } from '../helpers/db';
import { aiContextGrantRepository } from '../../server/data/ai-context-grant-repository';
import { reflectOnPracticeReview } from '../../server/services/ai-context-grant-service';
import { deleteJournalEntry, journalDeletionRepository } from '../../server/services/journal-deletion-service';

const pool = createTestPool();
const users: string[] = [];
const actorClient = (id: string) => ({ auth: { getUser: async () => ({ data: { user: { id, email: null } }, error: null }) } });

async function user() {
  const id = randomUUID(); users.push(id);
  await pool.query(`insert into auth.users(id,instance_id,aud,role,email,encrypted_password,email_confirmed_at,raw_app_meta_data,raw_user_meta_data,created_at,updated_at)
    values($1,'00000000-0000-0000-0000-000000000000','authenticated','authenticated',$2,'',now(),'{}','{}',now(),now())`, [id, `${id}@rts.test`]);
  return id;
}
async function journal(userId: string, node: string, kind: string, body: string) {
  return (await pool.query(`insert into public.journal_entries(user_id,curriculum_version_id,node_id,entry_kind,body) values($1,'phase-1-v1',$2,$3,$4) returning id`, [userId, node, kind, body])).rows[0].id as string;
}

afterAll(async () => { await pool.query('delete from auth.users where id=any($1::uuid[])', [users]); await pool.end(); });

describe('transactional journal source deletion', () => {
  it('deletes all source dependents atomically while preserving unrelated formation and progress', async () => {
    const owner = await user();
    const source = await journal(owner, 'awaken.pay-attention.observe', 'event', 'Exact private source wording');
    const otherSource = await journal(owner, 'awaken.pay-attention.inside', 'internal_response', 'Unrelated private wording');
    const control = await journal(owner, 'become.control', 'control_target', 'control');
    const truth = await journal(owner, 'become.receive', 'present_truth', 'truth');
    const step = await journal(owner, 'become.next-step', 'next_right_step', 'step');
    const outcome = await journal(owner, 'become.practice.return', 'practice_outcome', 'outcome');
    const review = await journal(owner, 'become.practice.review', 'practice_review', 'review');
    const record = (await pool.query(`insert into public.formation_records(user_id,curriculum_version_id,node_id,record_type,value_text,source_journal_entry_id,provenance)
      values($1,'phase-1-v1','see-clearly.fact','observable_fact','structured dependent',$2,'user_authored') returning id`, [owner, source])).rows[0].id;
    const practice = (await pool.query(`insert into public.practices(user_id,curriculum_version_id,node_id,control_target_entry_id,present_truth_entry_id,next_right_step_entry_id,state,opened_at,reviewed_at)
      values($1,'phase-1-v1','become.practice.open',$2,$3,$4,'reviewed',now(),now()) returning id`, [owner, control, truth, step])).rows[0].id;
    await pool.query(`insert into public.practice_returns(user_id,practice_id,outcome_entry_id,review_entry_id,reviewed_at) values($1,$2,$3,$4,now())`, [owner, practice, outcome, review]);
    await pool.query(`insert into public.formation_links(user_id,link_type,source_journal_entry_id,target_formation_record_id) values($1,'awaken_to_see_clearly',$2,$3)`, [owner, source, record]);
    await pool.query(`insert into public.user_curriculum_state(user_id,curriculum_version_id,current_node_id,state,completed_node_ids)
      values($1,'phase-1-v1','become.practice.review','completed',array['awaken.pay-attention.observe','see-clearly.fact'])`, [owner]);

    const grant = (await pool.query(`insert into public.ai_context_grants(user_id,journal_entry_id,scope) values($1,$2,'single_entry_reflect') returning id,revision`, [owner, source])).rows[0];
    const thread = (await pool.query(`insert into public.ai_threads(user_id,intent_id,request_fingerprint,mode,stage,curriculum_version_id,node_id,status,model_id,global_policy_version,stage_policy_version,mode_policy_version,output_schema_version)
      values($1,$2,'delete-integration','reflect','become','phase-1-v1','awaken.pay-attention.reflect','success','test-model','g1','s1','m1','o1') returning id`, [owner, randomUUID()])).rows[0].id;
    const artifact = (await pool.query(`insert into public.ai_artifacts(user_id,thread_id,artifact_type,content,status,provenance,model_id,global_policy_version,stage_policy_version,mode_policy_version,output_schema_version)
      values($1,$2,'summary','{"summary":"dependent private summary"}','suggested','ai_suggested','test-model','g1','s1','m1','o1') returning id`, [owner, thread])).rows[0].id;
    await pool.query(`insert into public.ai_artifact_sources(user_id,artifact_id,journal_entry_id,context_grant_id,grant_revision,source_role) values
      ($1,$2,$3,$4,$5,'selected_prior'),($1,$2,$6,null,null,'current')`, [owner, artifact, source, grant.id, grant.revision, otherSource]);

    const result = await deleteJournalEntry({ entryId: source }, { actorClient: actorClient(owner), repository: journalDeletionRepository({ pool }) });
    expect(result).toEqual({ kind: 'deleted', dependentArtifactCount: 1, dependentRecordCount: 1, dependentLinkCount: 1, grantCount: 1 });
    const remains = await pool.query(`select
      (select count(*) from public.journal_entries where id=$1) journal_count,
      (select count(*) from public.formation_records where id=$2) record_count,
      (select count(*) from public.formation_links where source_journal_entry_id=$1 or target_formation_record_id=$2) link_count,
      (select count(*) from public.ai_context_grants where id=$3) grant_count,
      (select count(*) from public.ai_artifacts where id=$4) artifact_count,
      (select count(*) from public.ai_artifact_sources where artifact_id=$4) source_count,
      (select count(*) from public.user_curriculum_state where user_id=$5 and current_node_id='become.practice.review' and state='completed') progress_count,
      (select count(*) from public.practices where id=$6 and state='reviewed') practice_count,
      (select count(*) from public.journal_entries where id in ($7,$8,$9,$10,$11,$12)) unrelated_journal_count`,
      [source, record, grant.id, artifact, owner, practice, otherSource, control, truth, step, outcome, review]);
    expect(remains.rows[0]).toEqual({ journal_count: '0', record_count: '0', link_count: '0', grant_count: '0', artifact_count: '0', source_count: '0', progress_count: '1', practice_count: '1', unrelated_journal_count: '6' });
    const audit = (await pool.query(`select dependent_artifact_count,dependent_record_count,dependent_link_count,grant_count,to_jsonb(audit_events)-array['id','user_id','event_type','object_type','object_id','dependent_artifact_count','dependent_record_count','dependent_link_count','grant_count','created_at'] unknown_fields
      from public.audit_events where user_id=$1 and object_id=$2`, [owner, source])).rows[0];
    expect(audit).toEqual({ dependent_artifact_count: 1, dependent_record_count: 1, dependent_link_count: 1, grant_count: 1, unknown_fields: {} });

    const provider = { respond: vi.fn() };
    await expect(reflectOnPracticeReview({ intentId: randomUUID(), currentEntryId: review, priorEntryId: source, grantId: grant.id, grantRevision: grant.revision }, { actorClient: actorClient(owner), repository: aiContextGrantRepository({ pool }), provider })).resolves.toEqual({ kind: 'unavailable' });
    expect(provider.respond).not.toHaveBeenCalled();
  });

  it('returns indistinguishable neutral results and changes nothing for other-owner or missing IDs', async () => {
    const owner = await user(), attacker = await user();
    const source = await journal(owner, 'awaken.pay-attention.observe', 'event', 'Owner secret');
    const repository = journalDeletionRepository({ pool });
    await expect(deleteJournalEntry({ entryId: source }, { actorClient: actorClient(attacker), repository })).resolves.toEqual({ kind: 'unavailable' });
    await expect(deleteJournalEntry({ entryId: randomUUID() }, { actorClient: actorClient(attacker), repository })).resolves.toEqual({ kind: 'unavailable' });
    expect((await pool.query('select body from public.journal_entries where id=$1', [source])).rows).toEqual([{ body: 'Owner secret' }]);
    expect((await pool.query('select count(*) from public.audit_events where object_id=$1', [source])).rows[0].count).toBe('0');
  });
});
