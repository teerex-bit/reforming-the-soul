import { randomUUID } from 'node:crypto';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import type pg from 'pg';
import { createConcurrencyBarrier, createTestPool } from '../helpers/db';
import { testActors } from '../helpers/auth';

const pool = createTestPool();

async function runAuthenticatedTransaction<T>(
  actorId: string,
  barrier: ReturnType<typeof createConcurrencyBarrier> | null,
  run: (client: pg.PoolClient) => Promise<T>,
): Promise<T> {
  const client = await pool.connect();
  try {
    await client.query('begin');
    await client.query('set local role authenticated');
    await client.query("select set_config('request.jwt.claim.sub', $1, true)", [actorId]);
    if (barrier) await barrier.arriveAndWait();
    const result = await run(client);
    await client.query('commit');
    return result;
  } catch (error) {
    await client.query('rollback');
    throw error;
  } finally {
    client.release();
  }
}

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

afterAll(async () => {
  await pool.end();
});

describe('Task 3 concurrency boundaries', () => {
  it('concurrency permits one practice transition and rejects the stale contender', async () => {
    const journalIds = [randomUUID(), randomUUID(), randomUUID()];
    const practiceId = randomUUID();
    try {
      await pool.query(
        `insert into public.journal_entries
          (id, user_id, curriculum_version_id, node_id, entry_kind, body)
         values
          ($1, $4, 'phase-1-v1', 'become.control', 'control_target', 'control'),
          ($2, $4, 'phase-1-v1', 'become.receive', 'present_truth', 'truth'),
          ($3, $4, 'phase-1-v1', 'become.next-step', 'next_right_step', 'step')`,
        [...journalIds, testActors.userA.id],
      );
      await pool.query(
        `insert into public.practices
          (id, user_id, curriculum_version_id, node_id, control_target_entry_id,
           present_truth_entry_id, next_right_step_entry_id, state)
         values ($1, $2, 'phase-1-v1', 'become.practice.open', $3, $4, $5, 'draft')`,
        [practiceId, testActors.userA.id, ...journalIds],
      );

      const barrier = createConcurrencyBarrier(2);
      const attempts = await Promise.allSettled([0, 1].map(() => runAuthenticatedTransaction(
        testActors.userA.id,
        barrier,
        async client => {
          const result = await client.query<{ state: string; lock_version: number }>(
            `select state::text, lock_version
             from public.transition_practice($1, 'draft', 0, 'open')`,
            [practiceId],
          );
          return result.rows[0];
        },
      )));

      const fulfilled = attempts.filter(result => result.status === 'fulfilled');
      const rejected = attempts.filter(result => result.status === 'rejected');
      expect({
        successes: fulfilled.map(result => result.value),
        failures: rejected.map(result => ({
          code: (result.reason as { code?: string }).code,
          message: (result.reason as { message?: string }).message,
        })),
      }).toEqual({
        successes: [{ state: 'open', lock_version: 1 }],
        failures: [expect.objectContaining({ code: '40001' })],
      });
      await expect(pool.query(
        'select state::text, lock_version from public.practices where id = $1',
        [practiceId],
      )).resolves.toMatchObject({ rows: [{ state: 'open', lock_version: 1 }] });
    } finally {
      await pool.query('delete from public.practices where id = $1', [practiceId]);
      await pool.query('delete from public.journal_entries where id = any($1::uuid[])', [journalIds]);
    }
  });

  it('concurrency serializes grant and re-grant races to one active identity', async () => {
    const journalId = randomUUID();
    try {
      await pool.query(
        `insert into public.journal_entries
          (id, user_id, curriculum_version_id, node_id, entry_kind, body)
         values ($1, $2, 'phase-1-v1', 'awaken.pay-attention.observe', 'event', 'grant race source')`,
        [journalId, testActors.userA.id],
      );

      const raceGrant = async () => {
        const barrier = createConcurrencyBarrier(2);
        return Promise.all([0, 1].map(() => runAuthenticatedTransaction(
          testActors.userA.id,
          barrier,
          async client => {
            const result = await client.query<{ grant_id: string; revision: number }>(
              `select grant_id::text, revision
               from public.grant_ai_context($1, 'single_entry_reflect')`,
              [journalId],
            );
            return result.rows[0];
          },
        )));
      };

      const firstRace = await raceGrant();
      expect(new Set(firstRace.map(result => result.grant_id)).size).toBe(1);
      expect(firstRace.map(result => result.revision)).toEqual([1, 1]);
      const originalGrantId = firstRace[0].grant_id;

      await runAuthenticatedTransaction(testActors.userA.id, null, async client => {
        await client.query('select * from public.revoke_ai_context($1, 1)', [originalGrantId]);
      });

      const regrantRace = await raceGrant();
      expect(new Set(regrantRace.map(result => result.grant_id)).size).toBe(1);
      expect(regrantRace[0].grant_id).not.toBe(originalGrantId);
      expect(regrantRace.map(result => result.revision)).toEqual([1, 1]);

      const persisted = await pool.query<{ total: number; active: number }>(
        `select count(*)::integer as total,
                count(*) filter (where revoked_at is null)::integer as active
         from public.ai_context_grants
         where user_id = $1 and journal_entry_id = $2`,
        [testActors.userA.id, journalId],
      );
      expect(persisted.rows).toEqual([{ total: 2, active: 1 }]);
    } finally {
      await pool.query('delete from public.journal_entries where id = $1', [journalId]);
    }
  });
});
