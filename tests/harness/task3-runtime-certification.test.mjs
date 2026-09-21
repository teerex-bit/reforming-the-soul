import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const project = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const workflow = readFileSync(path.join(project, '.github/workflows/task1-certification.yml'), 'utf8');
const securityMigration = readFileSync(
  path.join(project, 'supabase/migrations/202609200003_phase1_security.sql'),
  'utf8',
);
const functionMigration = readFileSync(
  path.join(project, 'supabase/migrations/202609200004_phase1_functions.sql'),
  'utf8',
);

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

test('private ownership transfer never relies on inherited migration-role privileges', () => {
  const createSchema = securityMigration.indexOf('create schema rts_private;');
  const createResolver = securityMigration.indexOf('create function rts_private.current_actor()');
  const revokeResolver = securityMigration.indexOf(
    'revoke all on function rts_private.current_actor() from public, anon, authenticated;',
  );
  const resolverPolicy = securityMigration.indexOf(
    'for all to rts_privileged_owner using ((select rts_private.current_actor()) = user_id)',
  );
  const finalPrivilegeGrant = securityMigration.indexOf(
    'grant select on table public.curriculum_versions, public.curriculum_nodes to rts_privileged_owner;',
  );
  const temporaryGrant = securityMigration.indexOf('with inherit false');
  const transferFunction = securityMigration.indexOf(
    'alter function rts_private.current_actor() owner to rts_privileged_owner;',
  );
  const grantSchemaCreate = securityMigration.indexOf(
    'grant create on schema rts_private to rts_privileged_owner;',
  );
  const revokeSchemaCreate = securityMigration.indexOf(
    'revoke create on schema rts_private from rts_privileged_owner;',
  );
  const transferSchema = securityMigration.indexOf(
    'alter schema rts_private owner to rts_privileged_owner;',
  );
  const cleanup = securityMigration.indexOf("revoke rts_privileged_owner from %I");

  for (const [label, index] of Object.entries({
    createSchema,
    createResolver,
    revokeResolver,
    resolverPolicy,
    finalPrivilegeGrant,
    temporaryGrant,
    grantSchemaCreate,
    transferFunction,
    revokeSchemaCreate,
    transferSchema,
    cleanup,
  })) {
    assert.notEqual(index, -1, `missing controlled ownership step: ${label}`);
  }
  assert.ok(createSchema < createResolver);
  assert.ok(createResolver < revokeResolver);
  assert.ok(revokeResolver < resolverPolicy);
  assert.ok(resolverPolicy < finalPrivilegeGrant);
  assert.ok(finalPrivilegeGrant < temporaryGrant);
  assert.ok(temporaryGrant < grantSchemaCreate);
  assert.ok(grantSchemaCreate < transferFunction);
  assert.ok(transferFunction < revokeSchemaCreate);
  assert.ok(revokeSchemaCreate < transferSchema);
  assert.ok(transferSchema < cleanup);
  assert.doesNotMatch(securityMigration, /create schema rts_private authorization rts_privileged_owner/i);

  assert.match(functionMigration, /with inherit false/);
  assert.match(functionMigration, /with set true/);
  assert.match(functionMigration, /set local role rts_privileged_owner;/);
  assert.match(functionMigration, /reset role;/);
  assert.ok(
    functionMigration.indexOf('with inherit false')
      < functionMigration.indexOf('set local role rts_privileged_owner;'),
  );
  assert.ok(
    functionMigration.indexOf('reset role;')
      < functionMigration.indexOf("revoke rts_privileged_owner from %I"),
  );
});
