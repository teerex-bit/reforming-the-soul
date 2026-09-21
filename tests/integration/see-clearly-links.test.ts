import { randomUUID } from 'node:crypto';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { createTestPool, withAuthenticatedActor } from '../helpers/db';
import { curriculumRepository } from '../../server/data/curriculum-repository';
import { saveAwakenObservation } from '../../server/services/observation-service';
import { saveSeeClearly } from '../../server/services/see-clearly-service';

const pool = createTestPool();
const actors = [randomUUID(), randomUUID(), randomUUID()];
const alternateVersion = `see-clearly-test-${randomUUID()}`;

function actorClient(actor: string) {
  return { auth: { getUser: async () => ({ data: { user: { id: actor, email: `${actor}@rts.test` } }, error: null }) } };
}

beforeAll(async () => {
  const repository = curriculumRepository({ pool });
  for (const actor of actors) {
    await pool.query(`insert into auth.users (id, instance_id, aud, role, email, encrypted_password, email_confirmed_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at)
      values ($1, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', $2, '', now(), '{}', '{}', now(), now())`, [actor, `${actor}@rts.test`]);
    await saveAwakenObservation(
      { eventText: 'source event', internalResponseText: 'inside', bodyCueText: 'body' },
      { repository, actorClient: actorClient(actor) },
    );
    await pool.query("update public.user_curriculum_state set current_node_id='bridge.awaken-see-clearly' where user_id=$1", [actor]);
  }
  await pool.query(
    `insert into public.curriculum_versions(id,status,content_hash,published_at) values ($1,'active',$2,now())`,
    [alternateVersion, randomUUID()],
  );
  await pool.query(
    `insert into public.curriculum_nodes(id,version_id,stage,kind,parent_id,sort_order,content)
     values ('see-clearly.fact',$1,'see-clearly','interaction',null,1,'{"kind":"interaction"}'::jsonb)`,
    [alternateVersion],
  );
});
afterAll(async () => {
  await pool.query('delete from auth.users where id = any($1::uuid[])', [actors]);
  await pool.query('delete from public.curriculum_versions where id=$1', [alternateVersion]);
  await pool.end();
});

describe('See Clearly lineage', () => {
  it('atomically stores exact wording, separate typed records, identity-only lineage, and advances to Become', async () => {
    const values = ['  The door closed.\n', ' I concluded she was angry. ', 'belief', ' Conflict means rejection. '];
    await withAuthenticatedActor(pool, actors[0], async client => {
      await expect(client.query('select * from rts_private.save_see_clearly($1,$2,$3,$4)', values)).resolves.toMatchObject({ rows: [{ current_node_id: 'bridge.see-clearly-become' }] });
      const journals = await client.query("select entry_kind::text, body from public.journal_entries where user_id=$1 and node_id like 'see-clearly.%' order by created_at", [actors[0]]);
      expect(journals.rows).toEqual([{ entry_kind: 'observable_fact', body: values[0] }, { entry_kind: 'interpretation', body: values[1] }, { entry_kind: 'belief_expectation', body: values[3] }]);
      const records = await client.query("select record_type::text, value_text from public.formation_records where user_id=$1 and node_id like 'see-clearly.%' order by created_at", [actors[0]]);
      expect(records.rows).toEqual([{ record_type: 'observable_fact', value_text: values[0] }, { record_type: 'interpretation', value_text: values[1] }, { record_type: 'belief', value_text: values[3] }]);
      const links = await client.query('select source_journal_entry_id, target_formation_record_id from public.formation_links where user_id=$1 and link_type=\'awaken_to_see_clearly\'', [actors[0]]);
      expect(links.rows).toHaveLength(1);
      expect(Object.keys(links.rows[0]).sort()).toEqual(['source_journal_entry_id', 'target_formation_record_id']);
      const state = await client.query('select current_node_id from public.user_curriculum_state where user_id=$1', [actors[0]]);
      expect(state.rows).toEqual([{ current_node_id: 'bridge.see-clearly-become' }]);
    });
  });

  it('rejects a stale repeat without partial writes', async () => {
    const before = await pool.query(
      `select
        (select count(*)::integer from public.journal_entries where user_id=$1) journals,
        (select count(*)::integer from public.formation_records where user_id=$1) records,
        (select count(*)::integer from public.formation_links where user_id=$1) links`, [actors[0]],
    );
    await expect(withAuthenticatedActor(pool, actors[0], client => client.query("select * from rts_private.save_see_clearly('new','new','expectation','new')"))).rejects.toMatchObject({ code: '40001' });
    const after = await pool.query(
      `select
        (select count(*)::integer from public.journal_entries where user_id=$1) journals,
        (select count(*)::integer from public.formation_records where user_id=$1) records,
        (select count(*)::integer from public.formation_links where user_id=$1) links`, [actors[0]],
    );
    expect(after.rows).toEqual(before.rows);
  });

  it('allows exactly one simultaneous same-actor save and persists only the immutable winning graph', async () => {
    const repository = curriculumRepository({ pool });
    const candidates = [
      { observableFactText: 'first fact', interpretationText: 'first meaning', beliefExpectationType: 'belief' as const, beliefExpectationText: 'first belief' },
      { observableFactText: 'second fact', interpretationText: 'second meaning', beliefExpectationType: 'expectation' as const, beliefExpectationText: 'second expectation' },
    ];
    const attempts = await Promise.allSettled(candidates.map(values => saveSeeClearly(values, {
      repository: { saveSeeClearly: input => repository.transaction(transaction => transaction.saveSeeClearly(input)) },
      actorClient: actorClient(actors[2]),
    })));
    expect(attempts.filter(result => result.status === 'fulfilled')).toHaveLength(1);
    expect(attempts.filter(result => result.status === 'rejected').map(result => (result as PromiseRejectedResult).reason.code)).toEqual(['40001']);

    const journals = await pool.query<{ entry_kind: string; body: string }>(
      "select entry_kind::text,body from public.journal_entries where user_id=$1 and node_id like 'see-clearly.%' order by created_at", [actors[2]],
    );
    const records = await pool.query<{ record_type: string; value_text: string }>(
      "select record_type::text,value_text from public.formation_records where user_id=$1 and node_id like 'see-clearly.%' order by created_at", [actors[2]],
    );
    const links = await pool.query('select id from public.formation_links where user_id=$1 and link_type=\'awaken_to_see_clearly\'', [actors[2]]);
    expect(journals.rows).toHaveLength(3);
    expect(records.rows).toHaveLength(3);
    expect(links.rows).toHaveLength(1);
    const winner = candidates.find(candidate => candidate.observableFactText === journals.rows[0].body);
    expect(winner).toBeDefined();
    expect(journals.rows.map(row => row.body)).toEqual([winner!.observableFactText, winner!.interpretationText, winner!.beliefExpectationText]);
    expect(records.rows.map(row => row.value_text)).toEqual([winner!.observableFactText, winner!.interpretationText, winner!.beliefExpectationText]);
    expect(records.rows.map(row => row.record_type)).toEqual(['observable_fact', 'interpretation', winner!.beliefExpectationType]);
  });

  it('prevents cross-owner lineage even through direct authenticated insertion', async () => {
    const source = await pool.query("select id from public.journal_entries where user_id=$1 and entry_kind='event'", [actors[1]]);
    const target = await pool.query("select id from public.formation_records where user_id=$1 and record_type='observable_fact'", [actors[0]]);
    await expect(withAuthenticatedActor(pool, actors[0], client => client.query(`insert into public.formation_links(user_id,link_type,source_journal_entry_id,target_formation_record_id) values ($1,'awaken_to_see_clearly',$2,$3)`, [actors[0], source.rows[0].id, target.rows[0].id]))).rejects.toMatchObject({ code: '23514' });
  });

  it('rejects structurally valid owner-matched lineage with the wrong source or target node', async () => {
    const source = await pool.query("select id from public.journal_entries where user_id=$1 and entry_kind='event'", [actors[1]]);
    const wrongSource = await pool.query("select id from public.journal_entries where user_id=$1 and entry_kind='internal_response'", [actors[1]]);
    const wrongTarget = await pool.query("select id from public.formation_records where user_id=$1 and record_type='reaction'", [actors[1]]);
    const targetJournal = await pool.query<{ id: string }>(
      `insert into public.journal_entries(user_id,curriculum_version_id,node_id,entry_kind,body)
       values ($1,'phase-1-v1','see-clearly.fact','observable_fact','valid target fact') returning id`, [actors[1]],
    );
    const validTarget = await pool.query<{ id: string }>(
      `insert into public.formation_records(user_id,curriculum_version_id,node_id,record_type,value_text,source_journal_entry_id,provenance)
       values ($1,'phase-1-v1','see-clearly.fact','observable_fact','valid target fact',$2,'user_authored') returning id`,
      [actors[1], targetJournal.rows[0].id],
    );
    await expect(withAuthenticatedActor(pool, actors[1], client => client.query(
      `insert into public.formation_links(user_id,link_type,source_journal_entry_id,target_formation_record_id)
       values ($1,'awaken_to_see_clearly',$2,$3)`, [actors[1], source.rows[0].id, wrongTarget.rows[0].id],
    ))).rejects.toMatchObject({ code: '23514' });
    await expect(withAuthenticatedActor(pool, actors[1], client => client.query(
      `insert into public.formation_links(user_id,link_type,source_journal_entry_id,target_formation_record_id)
       values ($1,'awaken_to_see_clearly',$2,$3)`, [actors[1], wrongSource.rows[0].id, validTarget.rows[0].id],
    ))).rejects.toMatchObject({ code: '23514' });
  });

  it('rejects owner-matched source and target identities from different curriculum versions', async () => {
    const source = await pool.query("select id from public.journal_entries where user_id=$1 and entry_kind='event'", [actors[1]]);
    const targetJournal = await pool.query<{ id: string }>(
      `insert into public.journal_entries(user_id,curriculum_version_id,node_id,entry_kind,body)
       values ($1,$2,'see-clearly.fact','observable_fact','alternate fact') returning id`, [actors[1], alternateVersion],
    );
    const targetRecord = await pool.query<{ id: string }>(
      `insert into public.formation_records(user_id,curriculum_version_id,node_id,record_type,value_text,source_journal_entry_id,provenance)
       values ($1,$2,'see-clearly.fact','observable_fact','alternate fact',$3,'user_authored') returning id`,
      [actors[1], alternateVersion, targetJournal.rows[0].id],
    );
    await expect(withAuthenticatedActor(pool, actors[1], client => client.query(
      `insert into public.formation_links(user_id,link_type,source_journal_entry_id,target_formation_record_id)
       values ($1,'awaken_to_see_clearly',$2,$3)`, [actors[1], source.rows[0].id, targetRecord.rows[0].id],
    ))).rejects.toMatchObject({ code: '23514' });
  });
});
