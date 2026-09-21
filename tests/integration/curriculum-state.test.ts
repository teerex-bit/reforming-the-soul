import { randomUUID } from 'node:crypto';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { createTestPool, withAuthenticatedActor } from '../helpers/db';
import { testActors } from '../helpers/auth';
import { curriculumRepository } from '../../server/data/curriculum-repository';
import { saveAwakenObservation } from '../../server/services/observation-service';

const pool = createTestPool();

beforeAll(async () => {
  await pool.query(
    `insert into auth.users
      (id, instance_id, aud, role, email, encrypted_password, email_confirmed_at,
       raw_app_meta_data, raw_user_meta_data, created_at, updated_at)
     values ($1, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated',
       $2, '', now(), '{}', '{}', now(), now())
     on conflict (id) do nothing`,
    [testActors.userA.id, testActors.userA.email],
  );
});

afterAll(async () => pool.end());

describe('Awaken observation state', () => {
  it('atomically saves exact wording plus the three approved structured records and resumes at Reflect', async () => {
    const values = ['  first line\nsecond line  ', '驚いた  ', ' tight shoulders '];
    await withAuthenticatedActor(pool, testActors.userA.id, async client => {
      const result = await client.query<{ current_node_id: string }>(
        'select current_node_id from rts_private.save_awaken_observation($1, $2, $3)', values,
      );
      expect(result.rows).toEqual([{ current_node_id: 'awaken.pay-attention.reflect' }]);
      const journals = await client.query<{ entry_kind: string; body: string }>(
        `select entry_kind::text, body from public.journal_entries
         where user_id = $1 and node_id in ('awaken.pay-attention.observe', 'awaken.pay-attention.inside', 'awaken.pay-attention.body')
         order by created_at`, [testActors.userA.id],
      );
      expect(journals.rows).toEqual([
        { entry_kind: 'event', body: values[0] },
        { entry_kind: 'internal_response', body: values[1] },
        { entry_kind: 'body_cue', body: values[2] },
      ]);
      const records = await client.query<{ record_type: string }>(
        `select record_type::text from public.formation_records where user_id = $1
         and node_id in ('awaken.pay-attention.observe', 'awaken.pay-attention.inside', 'awaken.pay-attention.body')
         order by created_at`, [testActors.userA.id],
      );
      expect(records.rows).toEqual([{ record_type: 'observation' }, { record_type: 'reaction' }, { record_type: 'body_cue' }]);
      const state = await client.query<{ current_node_id: string; state: string; completed_node_ids: string[] }>(
        `select current_node_id, state::text, completed_node_ids from public.user_curriculum_state
         where user_id = $1 and curriculum_version_id = 'phase-1-v1'`, [testActors.userA.id],
      );
      expect(state.rows[0]).toMatchObject({ current_node_id: 'awaken.pay-attention.reflect', state: 'in_progress' });
      expect(state.rows[0].completed_node_ids).toEqual([
        'awaken.pay-attention.observe', 'awaken.pay-attention.inside', 'awaken.pay-attention.body',
      ]);
    });
  });

  it('rolls back without progress when an Awaken value is empty', async () => {
    const before = await pool.query<{ count: number }>('select count(*)::integer as count from public.journal_entries where user_id = $1', [testActors.userA.id]);
    await expect(withAuthenticatedActor(pool, testActors.userA.id, client => client.query(
      'select * from rts_private.save_awaken_observation($1, $2, $3)', ['', 'inside', 'body'],
    ))).rejects.toMatchObject({ code: '22004' });
    const after = await pool.query<{ count: number }>('select count(*)::integer as count from public.journal_entries where user_id = $1', [testActors.userA.id]);
    expect(after.rows).toEqual(before.rows);
  });

  it('rejects whitespace-only values without writing partial progress', async () => {
    await expect(withAuthenticatedActor(pool, testActors.userA.id, client => client.query(
      'select * from rts_private.save_awaken_observation($1, $2, $3)', [' \n\t ', 'inside', 'body'],
    ))).rejects.toMatchObject({ code: '22004' });
  });

  it('rejects a repeat submission and preserves the original exact wording', async () => {
    const actorId = randomUUID();
    await pool.query(
      `insert into auth.users (id, instance_id, aud, role, email, encrypted_password, email_confirmed_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at)
       values ($1, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', $2, '', now(), '{}', '{}', now(), now())`,
      [actorId, `${actorId}@rts.test`],
    );
    try {
      const repository = curriculumRepository({ pool });
      const actorClient = { auth: { getUser: async () => ({ data: { user: { id: actorId, email: `${actorId}@rts.test` } }, error: null }) } };
      await saveAwakenObservation(
        { eventText: '  original  ', internalResponseText: 'inside', bodyCueText: 'body' },
        { repository, actorClient },
      );
      await expect(withAuthenticatedActor(pool, actorId, client => client.query(
        'select * from rts_private.save_awaken_observation($1, $2, $3)', ['changed', 'changed', 'changed'],
      ))).rejects.toMatchObject({ code: '40001' });
      const original = await pool.query<{ body: string }>(
        "select body from public.journal_entries where user_id = $1 and entry_kind = 'event'", [actorId],
      );
      expect(original.rows).toEqual([{ body: '  original  ' }]);
    } finally {
      await pool.query('delete from auth.users where id = $1', [actorId]);
    }
  });

  it('does not create a formation score or practice while saving curriculum progress', async () => {
    const actor = randomUUID();
    await pool.query(
      `insert into auth.users (id, instance_id, aud, role, email, encrypted_password, email_confirmed_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at)
       values ($1, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', $2, '', now(), '{}', '{}', now(), now())`,
      [actor, `${actor}@rts.test`],
    );
    try {
      await withAuthenticatedActor(pool, actor, async client => {
        await client.query('select * from rts_private.save_awaken_observation($1, $2, $3)', ['event', 'inside', 'body']);
        await expect(client.query('select * from public.practices where user_id = $1', [actor])).resolves.toMatchObject({ rows: [] });
      });
    } finally {
      await pool.query('delete from auth.users where id = $1', [actor]);
    }
  });

  it('allows a valid persisted initial pointer to advance', async () => {
    const actorId = randomUUID();
    await pool.query(
      `insert into auth.users (id, instance_id, aud, role, email, encrypted_password, email_confirmed_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at)
       values ($1, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', $2, '', now(), '{}', '{}', now(), now())`,
      [actorId, `${actorId}@rts.test`],
    );
    try {
      await pool.query(
        `insert into public.user_curriculum_state (user_id, curriculum_version_id, current_node_id, state, completed_node_ids)
         values ($1, 'phase-1-v1', 'awaken.pay-attention.observe', 'not_started', '{}')`, [actorId],
      );
      await withAuthenticatedActor(pool, actorId, async client => {
        await expect(client.query('select * from rts_private.save_awaken_observation($1, $2, $3)', ['event', 'inside', 'body']))
          .resolves.toMatchObject({ rows: [{ current_node_id: 'awaken.pay-attention.reflect' }] });
      });
    } finally {
      await pool.query('delete from auth.users where id = $1', [actorId]);
    }
  });

  it('uses the production repository under authenticated RLS and resumes from a separate connection', async () => {
    const repository = curriculumRepository({ pool });
    const actorClient = {
      auth: { getUser: async () => ({ data: { user: testActors.userA }, error: null }) },
    };
    try {
      await saveAwakenObservation({
        eventText: '  repository event  ', internalResponseText: 'repository inside', bodyCueText: 'repository body',
      }, { repository, actorClient });

      await expect(repository.getResumeState(testActors.userA.id)).resolves.toEqual({
        currentNodeId: 'awaken.pay-attention.reflect',
        state: 'in_progress',
        completedNodeIds: [
          'awaken.pay-attention.observe', 'awaken.pay-attention.inside', 'awaken.pay-attention.body',
        ],
      });
    } finally {
      await pool.query('delete from public.user_curriculum_state where user_id = $1', [testActors.userA.id]);
      await pool.query('delete from public.journal_entries where user_id = $1', [testActors.userA.id]);
    }
  });

  it('allows only one concurrent production-repository submission and preserves that immutable original', async () => {
    const actorId = randomUUID();
    const actor = { id: actorId, email: `${actorId}@rts.test` };
    const repository = curriculumRepository({ pool });
    const actorClient = { auth: { getUser: async () => ({ data: { user: actor }, error: null }) } };
    await pool.query(
      `insert into auth.users (id, instance_id, aud, role, email, encrypted_password, email_confirmed_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at)
       values ($1, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', $2, '', now(), '{}', '{}', now(), now())`,
      [actorId, actor.email],
    );
    try {
      const attempts = await Promise.allSettled(['first event', 'second event'].map(eventText => saveAwakenObservation(
        { eventText, internalResponseText: `${eventText} inside`, bodyCueText: `${eventText} body` },
        { repository, actorClient },
      )));
      expect(attempts.filter(result => result.status === 'fulfilled')).toHaveLength(1);
      expect(attempts.filter(result => result.status === 'rejected').map(result => (result as PromiseRejectedResult).reason.code)).toEqual(['40001']);
      const journals = await pool.query<{ body: string }>(
        "select body from public.journal_entries where user_id = $1 and entry_kind = 'event'", [actorId],
      );
      expect(journals.rows).toHaveLength(1);
      expect(['first event', 'second event']).toContain(journals.rows[0].body);
    } finally {
      await pool.query('delete from auth.users where id = $1', [actorId]);
    }
  });
});
