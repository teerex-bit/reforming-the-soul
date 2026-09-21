import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const project = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const workflow = readFileSync(path.join(project, '.github/workflows/task1-certification.yml'), 'utf8');

function stepIndex(name) {
  const index = workflow.indexOf(`- name: ${name}`);
  assert.notEqual(index, -1, `missing workflow step: ${name}`);
  return index;
}

test('Task 3 runtime certification stays on the designated local Supabase boundary', () => {
  assert.match(workflow, /SUPABASE_PROJECT_ID: rts-phase1-prototype/);
  assert.match(workflow, /SUPABASE_URL: http:\/\/127\.0\.0\.1:54321/);
  assert.match(workflow, /TEST_DATABASE_URL: postgresql:\/\/postgres:postgres@127\.0\.0\.1:54322\/postgres/);
  assert.doesNotMatch(workflow, /supabase link|--linked|db push|https:\/\//);
});

test('CI certifies persisted restart before a clean migration reapply', () => {
  const initialDatabase = stepIndex('PostgreSQL and RLS tests');
  const persistedStop = stepIndex('Stop local Supabase with persisted state');
  const persistedStart = stepIndex('Restart designated local Supabase with persisted state');
  const restartActor = stepIndex('Actor resolver after persisted restart');
  const restartDatabase = stepIndex('PostgreSQL and RLS tests after persisted restart');
  const cleanReset = stepIndex('Clean migration reset and reapply');
  const resetActor = stepIndex('Actor resolver after clean migration reapply');
  const resetDatabase = stepIndex('PostgreSQL and RLS tests after clean migration reapply');

  assert.ok(initialDatabase < persistedStop);
  assert.ok(persistedStop < persistedStart);
  assert.ok(persistedStart < restartActor);
  assert.ok(restartActor < restartDatabase);
  assert.ok(restartDatabase < cleanReset);
  assert.ok(cleanReset < resetActor);
  assert.ok(resetActor < resetDatabase);

  assert.match(workflow.slice(persistedStop, persistedStart),
    /run: npx supabase stop --workdir \.(?:\r?\n|$)/);
  assert.doesNotMatch(workflow.slice(persistedStop, persistedStart), /--no-backup/);
  assert.match(workflow.slice(persistedStart, restartActor),
    /run: npx supabase start --workdir \./);
  assert.match(workflow.slice(cleanReset, resetActor),
    /run: npx supabase db reset --local --workdir \./);
});

test('both post-boundary checks run the real actor and pgTAP suites', () => {
  const actorCommand = /npx vitest run --config vitest\.integration\.config\.ts tests\/integration\/00-task3-privilege-preflight\.test\.ts/g;
  const databaseCommand = /npm run test:db/g;

  assert.equal([...workflow.matchAll(actorCommand)].length, 2);
  assert.equal([...workflow.matchAll(databaseCommand)].length, 3);
});
