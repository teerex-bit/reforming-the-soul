import pg from 'pg';
import { validateTestEnvironment } from '../../scripts/verify-test-environment.mjs';

export function assertLocalE2eEnvironment(env: NodeJS.ProcessEnv = process.env) {
  const errors = validateTestEnvironment(env);
  if (errors.length) throw new Error(errors.join('\n'));
}

export async function resetLocalE2eAccount(email: string, env: NodeJS.ProcessEnv = process.env) {
  // This guard intentionally runs before constructing a pool, including when Playwright
  // is launched directly instead of through npm run test:e2e.
  assertLocalE2eEnvironment(env);
  const pool = new pg.Pool({ connectionString: env.TEST_DATABASE_URL });
  try {
    await pool.query('delete from auth.users where email = $1', [email]);
  } finally {
    await pool.end();
  }
}
