import { randomUUID } from 'node:crypto';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { createTestPool } from '../helpers/db';
import { formationHistoryRepository } from '../../server/data/history-repository';

const pool = createTestPool();
const userA = randomUUID();
const userB = randomUUID();
const repository = formationHistoryRepository({ pool });
let selectedPriorGrantId = '';

beforeAll(async () => {
  for (const id of [userA, userB]) await pool.query(`insert into auth.users(id,instance_id,aud,role,email,encrypted_password,email_confirmed_at,raw_app_meta_data,raw_user_meta_data,created_at,updated_at)
    values($1,'00000000-0000-0000-0000-000000000000','authenticated','authenticated',$2,'',now(),'{}','{}',now(),now())`, [id, `${id}@rts.test`]);
  const aJournal = await pool.query(`insert into public.journal_entries(user_id,curriculum_version_id,node_id,entry_kind,body,created_at)
    values($1,'phase-1-v1','awaken.pay-attention.observe','event','  A exact wording  ','2026-09-21T10:00:00Z') returning id`, [userA]);
  const priorJournal = await pool.query(`insert into public.journal_entries(user_id,curriculum_version_id,node_id,entry_kind,body,created_at)
    values($1,'phase-1-v1','awaken.pay-attention.inside','internal_response','A prior wording','2026-09-21T09:00:00Z') returning id`, [userA]);
  await pool.query(`insert into public.formation_records(user_id,curriculum_version_id,node_id,record_type,value_text,source_journal_entry_id,provenance,created_at)
    values($1,'phase-1-v1','awaken.pay-attention.observe','observation','A exact wording',$2,'user_authored','2026-09-21T10:00:01Z')`, [userA, aJournal.rows[0].id]);
  const thread = await pool.query(`insert into public.ai_threads(user_id,intent_id,request_fingerprint,mode,stage,curriculum_version_id,node_id,status,model_id,global_policy_version,stage_policy_version,mode_policy_version,output_schema_version)
    values($1,$2,'fingerprint','reflect','awaken','phase-1-v1','awaken.pay-attention.reflect','success','history-test-model','g1','s1','m1','o1') returning id`, [userA, randomUUID()]);
  const artifact = await pool.query(`insert into public.ai_artifacts(user_id,thread_id,artifact_type,content,status,provenance,model_id,global_policy_version,stage_policy_version,mode_policy_version,output_schema_version)
    values($1,$2,'summary','{"summary":"AI summary"}','suggested','ai_suggested','history-test-model','g1','s1','m1','o1') returning id`, [userA, thread.rows[0].id]);
  await pool.query(`insert into public.ai_artifact_sources(user_id,artifact_id,journal_entry_id,source_role) values($1,$2,$3,'current')`, [userA, artifact.rows[0].id, aJournal.rows[0].id]);
  const grant = await pool.query(`insert into public.ai_context_grants(user_id,journal_entry_id,scope,revision) values($1,$2,'single_entry_reflect',3) returning id`, [userA, priorJournal.rows[0].id]);
  selectedPriorGrantId = grant.rows[0].id;
  await pool.query(`insert into public.ai_artifact_sources(user_id,artifact_id,journal_entry_id,context_grant_id,grant_revision,source_role) values($1,$2,$3,$4,3,'selected_prior')`, [userA, artifact.rows[0].id, priorJournal.rows[0].id, grant.rows[0].id]);
  await pool.query(`insert into public.user_curriculum_state(user_id,curriculum_version_id,current_node_id,state) values($1,'phase-1-v1','awaken.pay-attention.reflect','in_progress')`, [userA]);
  await pool.query(`insert into public.journal_entries(user_id,curriculum_version_id,node_id,entry_kind,body) values($1,'phase-1-v1','awaken.pay-attention.observe','event','B private wording')`, [userB]);
});

afterAll(async () => { await pool.query('delete from auth.users where id=any($1::uuid[])', [[userA, userB]]); await pool.end(); });

describe('formation history repository', () => {
  it('returns stable owned chronology with separate wording, records, and labeled AI provenance', async () => {
    const history = await repository.list(userA);
    expect(history).toHaveLength(2);
    const current = history.find(item => item.journal.body === '  A exact wording  ')!;
    expect(current.records).toEqual([expect.objectContaining({ recordType: 'observation', value: 'A exact wording', provenance: 'user_authored' })]);
    expect(current.artifacts).toEqual([expect.objectContaining({ modelId: 'history-test-model', provenance: 'ai_suggested', policy: { global: 'g1', stage: 's1', mode: 'm1', outputSchema: 'o1' }, sources: [
      expect.objectContaining({ journalEntryId: current.journal.id, role: 'current', contextGrantId: null, grantRevision: null }),
      expect.objectContaining({ role: 'selected_prior', contextGrantId: selectedPriorGrantId, grantRevision: 3 }),
    ] })]);
    expect(JSON.stringify(history)).not.toContain('B private wording');
    expect(JSON.stringify(history)).not.toContain('currentNodeId');
  });

  it('keeps User B isolated from User A history', async () => {
    const history = await repository.list(userB);
    expect(history.map(item => item.journal.body)).toEqual(['B private wording']);
    expect(history.flatMap(item => item.records)).toEqual([]);
    expect(history.flatMap(item => item.artifacts)).toEqual([]);
  });
});
