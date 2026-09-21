import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createPlaywrightEnvironment } from '../../scripts/run-e2e.mjs';

const packageJson = JSON.parse(readFileSync(new URL('../../package.json', import.meta.url), 'utf8'));
const workflow = readFileSync(new URL('../../.github/workflows/task1-certification.yml', import.meta.url), 'utf8');

test('Task 6 E2E loads and verifies the mandated local test boundary', () => {
  assert.equal(packageJson.scripts['test:e2e'], 'node --env-file-if-exists=.env.test scripts/run-e2e.mjs');
  const runner = readFileSync(new URL('../../scripts/run-e2e.mjs', import.meta.url), 'utf8');
  assert.match(runner, /validateTestEnvironment\(process\.env\)/);
  assert.match(runner, /spawnSync\(executable, \['test'\]/);
});

test('Task 6 E2E obtains the actual local anonymous key after Supabase starts', () => {
  assert.doesNotMatch(workflow, /SUPABASE_ANON_KEY: local-certification-placeholder/);
  const start = workflow.indexOf('- name: Start designated local Supabase');
  const credentials = workflow.indexOf('- name: Load local Supabase credentials');
  const browser = workflow.indexOf('- name: Browser and visual-authority tests');
  assert.ok(start < credentials && credentials < browser);
  assert.match(workflow, /supabase status --workdir \. -o env/);
  assert.match(workflow, /SUPABASE_ANON_KEY=.*ANON_KEY.*GITHUB_ENV/);
});

test('Task 6 E2E pins every application runtime alias before dotenv can supply a target', () => {
  const validated = {
    TEST_DATABASE_URL: 'postgresql://postgres:postgres@127.0.0.1:54322/postgres',
    SUPABASE_URL: 'http://127.0.0.1:54321',
    SUPABASE_ANON_KEY: 'local-anon-key',
  };
  const dotenvTargets = {
    RTS_DATABASE_URL: 'postgresql://postgres@production.example.com/postgres',
    DATABASE_URL: 'postgresql://postgres@production.example.com/postgres',
    NEXT_PUBLIC_SUPABASE_URL: 'https://production.supabase.co',
    NEXT_PUBLIC_SUPABASE_ANON_KEY: 'production-anon-key',
    NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: 'production-publishable-key',
  };

  const effectiveRuntime = { ...dotenvTargets, ...createPlaywrightEnvironment(validated) };

  assert.equal(effectiveRuntime.RTS_DATABASE_URL, validated.TEST_DATABASE_URL);
  assert.equal(effectiveRuntime.DATABASE_URL, validated.TEST_DATABASE_URL);
  assert.equal(effectiveRuntime.NEXT_PUBLIC_SUPABASE_URL, validated.SUPABASE_URL);
  assert.equal(effectiveRuntime.NEXT_PUBLIC_SUPABASE_ANON_KEY, validated.SUPABASE_ANON_KEY);
  assert.equal(effectiveRuntime.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY, validated.SUPABASE_ANON_KEY);
});
