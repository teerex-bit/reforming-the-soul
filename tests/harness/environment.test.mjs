import test from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const project = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const verifier = path.join(project, 'scripts', 'verify-test-environment.mjs');

function runVerifier(overrides = {}) {
  const env = {
    PATH: process.env.PATH,
    ...overrides,
  };
  return spawnSync(process.execPath, [verifier], {
    cwd: project,
    env,
    encoding: 'utf8',
  });
}

test('environment verifier reports every missing test boundary with actionable names', () => {
  const result = runVerifier();
  assert.equal(result.status, 1);
  assert.match(result.stderr, /SUPABASE_URL/);
  assert.match(result.stderr, /SUPABASE_ANON_KEY/);
  assert.match(result.stderr, /TEST_DATABASE_URL/);
  assert.match(result.stderr, /AI_TEST_ADAPTER=fake/);
  assert.match(result.stderr, /RTS_TEST_MODE=1/);
  assert.match(result.stderr, /SUPABASE_PROJECT_ID=rts-phase1-prototype/);
});

test('environment verifier rejects non-local destructive database targets and live AI', () => {
  const result = runVerifier({
    SUPABASE_URL: 'https://example.supabase.co',
    SUPABASE_ANON_KEY: 'test-anon-key',
    TEST_DATABASE_URL: 'postgresql://postgres:postgres@db.example.com:5432/postgres',
    AI_TEST_ADAPTER: 'live',
    OPENAI_API_KEY: 'sk-live-must-never-run',
  });
  assert.equal(result.status, 1);
  assert.match(result.stderr, /designated local endpoint/);
  assert.match(result.stderr, /designated local PostgreSQL/);
  assert.match(result.stderr, /AI_TEST_ADAPTER=fake/);
  assert.match(result.stderr, /OPENAI_API_KEY must be unset/);
});

test('environment verifier rejects PostgreSQL query overrides and non-designated local ports', () => {
  const result = runVerifier({
    RTS_TEST_MODE: '1',
    SUPABASE_PROJECT_ID: 'another-project',
    SUPABASE_URL: 'http://127.0.0.1:64321',
    SUPABASE_ANON_KEY: 'test-anon-key',
    TEST_DATABASE_URL: 'postgresql://postgres:postgres@127.0.0.1:64322/postgres?host=db.example.com',
    AI_TEST_ADAPTER: 'fake',
  });
  assert.equal(result.status, 1);
  assert.match(result.stderr, /SUPABASE_PROJECT_ID=rts-phase1-prototype/);
  assert.match(result.stderr, /127\.0\.0\.1:54321/);
  assert.match(result.stderr, /connection-string query parameters are prohibited/);
  assert.match(result.stderr, /127\.0\.0\.1:54322/);
});

test('environment verifier accepts isolated local infrastructure and fake AI', () => {
  const result = runVerifier({
    SUPABASE_URL: 'http://127.0.0.1:54321',
    SUPABASE_ANON_KEY: 'test-anon-key',
    TEST_DATABASE_URL: 'postgresql://postgres:postgres@127.0.0.1:54322/postgres',
    AI_TEST_ADAPTER: 'fake',
    RTS_TEST_MODE: '1',
    SUPABASE_PROJECT_ID: 'rts-phase1-prototype',
  });
  assert.equal(result.status, 0, result.stderr);
  assert.match(result.stdout, /Test environment boundaries verified/);
});
