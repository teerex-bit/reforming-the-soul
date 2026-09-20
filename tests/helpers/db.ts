import pg from 'pg';
import { validateTestEnvironment } from '../../scripts/verify-test-environment.mjs';

export function createConcurrencyBarrier(participants: number) {
  if (!Number.isInteger(participants) || participants < 1) {
    throw new Error('participants must be a positive integer');
  }
  let arrivals = 0;
  let release: (() => void) | undefined;
  const released = new Promise<void>(resolve => { release = resolve; });
  return {
    async arriveAndWait() {
      arrivals += 1;
      if (arrivals === participants) release?.();
      await released;
    },
  };
}

export function createTestPool(env: NodeJS.ProcessEnv = process.env) {
  const errors = validateTestEnvironment(env);
  if (errors.length) throw new Error(errors.join('\n'));
  return new pg.Pool({ connectionString: env.TEST_DATABASE_URL, max: 4 });
}

export async function withAuthenticatedActor<T>(
  pool: pg.Pool,
  actorId: string,
  run: (client: pg.PoolClient) => Promise<T>,
) {
  const client = await pool.connect();
  try {
    await client.query('begin');
    await client.query('set local role authenticated');
    await client.query("select set_config('request.jwt.claim.sub', $1, true)", [actorId]);
    const result = await run(client);
    await client.query('rollback');
    return result;
  } catch (error) {
    await client.query('rollback');
    throw error;
  } finally {
    client.release();
  }
}
