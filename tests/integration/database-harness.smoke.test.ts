import { afterAll, describe, expect, it } from 'vitest';
import { createConcurrencyBarrier, createTestPool, withAuthenticatedActor } from '../helpers/db';
import { testActors } from '../helpers/auth';

const pool = createTestPool();

afterAll(async () => {
  await pool.end();
});

describe('real local Supabase database boundary', () => {
  it('executes as authenticated with the selected JWT subject', async () => {
    const result = await withAuthenticatedActor(pool, testActors.userA.id, async client => {
      return client.query<{ database_role: string; actor_id: string }>(
        'select current_user as database_role, auth.uid()::text as actor_id',
      );
    });
    expect(result.rows).toEqual([{
      database_role: 'authenticated',
      actor_id: testActors.userA.id,
    }]);
  });

  it('concurrency harness keeps authenticated actors isolated in parallel', async () => {
    const actors = [testActors.userA, testActors.userB];
    const barrier = createConcurrencyBarrier(actors.length);
    const actorIds = await Promise.all(actors.map(actor => withAuthenticatedActor(pool, actor.id, async client => {
      await barrier.arriveAndWait();
      const result = await client.query<{ actor_id: string }>('select auth.uid()::text as actor_id');
      return result.rows[0].actor_id;
    })));
    expect(actorIds).toEqual(actors.map(actor => actor.id));
  });
});
