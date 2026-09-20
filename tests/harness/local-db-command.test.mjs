import test from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const project = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const runner = path.join(project, 'scripts', 'run-local-db-tests.mjs');
const safeEnv = {
  PATH: process.env.PATH,
  RTS_TEST_MODE: '1',
  SUPABASE_PROJECT_ID: 'rts-phase1-prototype',
  SUPABASE_URL: 'http://127.0.0.1:54321',
  SUPABASE_ANON_KEY: 'test-anon-key',
  TEST_DATABASE_URL: 'postgresql://postgres:postgres@127.0.0.1:54322/postgres',
  AI_TEST_ADAPTER: 'fake',
};

for (const targetOverride of ['--linked', '--db-url=postgresql://example.invalid/postgres', '--project-ref=remote', '--workdir=/tmp']) {
  test(`local database runner rejects target override ${targetOverride}`, () => {
    const result = spawnSync(process.execPath, [runner, targetOverride], {
      cwd: project,
      env: safeEnv,
      encoding: 'utf8',
    });
    assert.equal(result.status, 2);
    assert.match(result.stderr, /does not accept command-line arguments/);
  });
}
