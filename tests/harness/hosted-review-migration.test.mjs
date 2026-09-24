import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const workflow = readFileSync('.github/workflows/hosted-review-db-migration.yml', 'utf8');
let guard;
try {
  guard = await import('../../scripts/hosted-review-db-migration.mjs');
} catch {
  guard = null;
}

test('hosted migration workflow automatically tracks review-db-candidate and pins its pushed SHA', () => {
  assert.match(workflow, /push:[\s\S]*branches:\n\s+- review-db-candidate/);
  assert.match(workflow, /secrets\.RTS_DATABASE_URL/);
  assert.match(workflow, /refs\/heads\/review-db-candidate/);
  assert.match(workflow, /ref: \$\{\{ github\.sha \}\}/);
  assert.match(workflow, /RTS_DATABASE_URL: \$\{\{ secrets\.RTS_DATABASE_URL \}\}/);
  assert.match(workflow, /github\.rest\.actions\.listWorkflowRuns\(/);
  assert.match(workflow, /head_sha[\s\S]*context\.sha|head_sha[\s\S]*GITHUB_SHA/);
  assert.match(workflow, /hosted-review-db-migration\.mjs apply/);
  assert.match(workflow, /hosted-review-db-migration\.mjs test-sql hosted-test scripts\/hosted-review-verification\.sql/);
  assert.doesNotMatch(workflow, /supabase test db .*RTS_DATABASE_URL|--db-url/);
  assert.match(workflow, /hosted-review-db-migration\.mjs verify/);
  assert.doesNotMatch(workflow, /work\/a2-persistence|EXPECTED_PENDING_MIGRATIONS:\s*\$\{\{ inputs\./);
  assert.doesNotMatch(workflow, /Cloudflare|vercel/i);
});

test('connection target guard accepts direct and pooler URLs for the isolated review project', () => {
  assert.ok(guard, 'hosted database guard script exists');
  assert.equal(guard.isReviewDatabaseUrl('postgresql://postgres:secret@db.zxikzybpodxecgpkncix.supabase.co:5432/postgres'), true);
  assert.equal(guard.isReviewDatabaseUrl('postgresql://postgres.zxikzybpodxecgpkncix:secret@aws-0-us-east-1.pooler.supabase.com:6543/postgres?sslmode=require'), true);
});

test('connection target guard rejects non-review and malformed database URLs', () => {
  assert.ok(guard, 'hosted database guard script exists');
  assert.equal(guard.isReviewDatabaseUrl('postgresql://postgres:secret@db.otherproject.supabase.co:5432/postgres'), false);
  assert.equal(guard.isReviewDatabaseUrl('not-a-database-url'), false);
});

test('migration guard accepts only candidate-introduced versions and fails closed on edits or deletions', () => {
  assert.ok(guard, 'hosted database guard script exists');
  assert.deepEqual(guard.parseIntroducedMigrationVersions('A\tsupabase/migrations/202609240001_deep_dive_a2_identifiers.sql\nA\tsupabase/migrations/202610010001_next_lesson.sql'), ['202609240001', '202610010001']);
  assert.deepEqual(guard.parseIntroducedMigrationVersions(''), []);
  assert.throws(() => guard.parseIntroducedMigrationVersions('M\tsupabase/migrations/202609230001_deep_dive_a1.sql'), /modified or removed/i);
  assert.throws(() => guard.parseIntroducedMigrationVersions('D\tsupabase/migrations/202609230001_deep_dive_a1.sql'), /modified or removed/i);
  assert.throws(() => guard.parseIntroducedMigrationVersions('A\tsupabase/migrations/not-a-migration.sql'), /invalid migration filename/i);
});

test('history bootstrap guard refuses to replace an existing Supabase history table', () => {
  assert.equal(guard.assertMigrationHistoryMissing(null), true);
  assert.throws(() => guard.assertMigrationHistoryMissing('supabase_migrations.schema_migrations'), /already exists/i);
});

test('hosted database failures are classified by probe stage and PostgreSQL error code', () => {
  assert.equal(guard.classifyDatabaseFailure({ code: '28P01' }, 'connection'), 'connection/auth failure');
  assert.equal(guard.classifyDatabaseFailure({ code: '08006' }, 'connection'), 'connection/auth failure');
  assert.equal(guard.classifyDatabaseFailure({ code: '42P01' }, 'migration-history'), 'missing migration schema/table');
  assert.equal(guard.classifyDatabaseFailure({ code: '3F000' }, 'migration-history'), 'missing migration schema/table');
  assert.equal(guard.classifyDatabaseFailure({ code: '42501' }, 'migration-history'), 'permission failure');
  assert.equal(guard.classifyDatabaseFailure({ code: 'XX000' }, 'migration-history'), 'query failure');
  assert.equal(guard.classifyDatabaseFailure({ code: '23514' }, 'migration'), 'migration failure');
  assert.equal(guard.classifyDatabaseFailure({ code: '23514' }, 'schema-audit'), 'schema drift');
  assert.equal(guard.classifyDatabaseFailure({ code: '42501' }, 'rls-verification'), 'RLS verification failure');
  assert.equal(guard.classifyDatabaseFailure({ code: '23505' }, 'hosted-test'), 'test-isolation failure');
});

test('safe PostgreSQL diagnostics redact connection identity and credential-like values', () => {
  const connectionString = 'postgresql://review_user:private_password@db.example.invalid:5432/postgres?token=private_token';
  const message = 'password authentication failed for user "review_user" at host "external.example.invalid" username "other_user" token=private_token';
  const safeMessage = guard.sanitizePostgresMessage(message, connectionString);

  assert.equal(safeMessage.includes('review_user'), false);
  assert.equal(safeMessage.includes('private_password'), false);
  assert.equal(safeMessage.includes('db.example.invalid'), false);
  assert.equal(safeMessage.includes('external.example.invalid'), false);
  assert.equal(safeMessage.includes('other_user'), false);
  assert.equal(safeMessage.includes('private_token'), false);
  assert.match(safeMessage, /\[redacted\]/i);
});

test('safe PostgreSQL diagnostic includes only allowlisted code, severity, and sanitized message', () => {
  const diagnostic = guard.safePostgresDiagnostic({
    code: '42P01',
    severity: 'ERROR',
    message: 'relation "supabase_migrations.schema_migrations" does not exist',
  }, 'migration-history');

  assert.deepEqual(diagnostic, {
    event: 'hosted_review_database_diagnostic',
    stage: 'migration-history',
    classification: 'missing migration schema/table',
    code: '42P01',
    severity: 'ERROR',
    message: 'relation "supabase_migrations.schema_migrations" does not exist',
  });
  assert.equal(Object.hasOwn(guard.safePostgresDiagnostic({ code: '42P01', severity: 'unexpected', message: 'denied' }, 'migration-history'), 'severity'), false);
  assert.equal(Object.hasOwn(guard.safePostgresDiagnostic({ code: 'privateToken', message: 'denied' }, 'migration-history'), 'code'), false);
});

test('hosted workflow derives its migration set from review and waits for exact-SHA certification', () => {
  const runner = readFileSync('scripts/hosted-review-db-migration.mjs', 'utf8');
  const certificationWorkflow = readFileSync('.github/workflows/task1-certification.yml', 'utf8');
  assert.match(runner, /git', \['diff', '--name-status', '--no-renames', reviewSha, candidateSha, '--', 'supabase\/migrations'\]/);
  assert.match(workflow, /git fetch --no-tags origin \+refs\/heads\/review:refs\/remotes\/origin\/review/);
  assert.match(workflow, /hosted-review-db-migration\.mjs plan/);
  const certification = workflow.match(/- name: Require full certification for exact candidate SHA[\s\S]*?(?=\n      - name:|$)/)?.[0] ?? '';
  assert.match(certification, /workflowId = 'task1-certification\.yml'/);
  assert.match(certification, /head_sha/);
  assert.ok(workflow.indexOf(certification) < workflow.indexOf('RTS_DATABASE_URL: ${{ secrets.RTS_DATABASE_URL }}'));
  assert.match(certificationWorkflow, /- review-db-candidate/);
  assert.doesNotMatch(certificationWorkflow, /work\/a2-persistence/);
});

test('hosted workflow audits the one-time baseline before recording history or applying migrations', () => {
  const preA2Audit = readFileSync('scripts/hosted-pre-a2-audit.sql', 'utf8');
  const audit = workflow.match(/- name: Audit baseline schema[\s\S]*?(?=\n      - name:|$)/)?.[0] ?? '';
  const bootstrap = workflow.match(/- name: Bootstrap audited historical migration ledger[\s\S]*?(?=\n      - name:|$)/)?.[0] ?? '';
  const preflight = workflow.match(/- name: Recheck candidate pending migrations before apply[\s\S]*?(?=\n      - name:|$)/)?.[0] ?? '';
  const apply = workflow.match(/- name: Apply only expected pending migrations[\s\S]*?(?=\n      - name:|$)/)?.[0] ?? '';

  assert.match(audit, /hosted-review-db-migration\.mjs test-sql schema-audit scripts\/hosted-pre-a2-audit\.sql/);
  assert.match(audit, /scripts\/hosted-pre-a2-audit\.sql/);
  assert.match(preA2Audit, /A1 module identifier is accepted before A2/);
  assert.match(preA2Audit, /A1 module and prompt identifiers are accepted before A2/);
  assert.match(preA2Audit, /A2 module identifier is rejected before A2/);
  assert.match(preA2Audit, /A2 prompt identifier is rejected before A2/);
  assert.match(preA2Audit, /unapproved module identifier is rejected before A2/);
  assert.match(preA2Audit, /unapproved prompt identifier is rejected before A2/);
  assert.match(audit, /if: \$\{\{ steps\.migration_plan\.outputs\.baseline_required == 'true' \}\}/);
  assert.match(bootstrap, /hosted-review-db-migration\.mjs bootstrap-baseline/);
  assert.match(bootstrap, /if: \$\{\{ steps\.migration_plan\.outputs\.baseline_required == 'true' \}\}/);
  assert.match(apply, /hosted-review-db-migration\.mjs apply/);
  assert.match(apply, /if: \$\{\{ steps\.confirmed_plan\.outputs\.pending_versions != '' \}\}/);
  assert.ok(workflow.indexOf(audit) < workflow.indexOf(bootstrap));
  assert.ok(workflow.indexOf(bootstrap) < workflow.indexOf(preflight));
  assert.ok(workflow.indexOf(preflight) < workflow.indexOf(apply));
});

test('migration plan supports one-time baseline, exact pending set, and a no-op rerun', () => {
  assert.ok(guard, 'hosted database guard script exists');
  assert.deepEqual(guard.parseExpectedVersions('202609240001'), ['202609240001']);
  assert.deepEqual(guard.parseExpectedVersions(''), []);
  assert.deepEqual(guard.planMigrations(
    ['202609200001', '202609230001', '202609240001'],
    [],
    ['202609240001'],
    false,
  ), {
    baselineVersions: ['202609200001', '202609230001'],
    pendingVersions: ['202609240001'],
    alreadyAppliedVersions: [],
    baselineRequired: true,
  });
  assert.deepEqual(guard.planMigrations(
    ['202609200001', '202609230001', '202609240001'],
    ['202609200001', '202609230001'],
    ['202609240001'],
    true,
  ).pendingVersions, ['202609240001']);
  assert.deepEqual(guard.planMigrations(
    ['202609200001', '202609230001', '202609240001'],
    ['202609200001', '202609230001', '202609240001'],
    [],
    true,
  ).pendingVersions, []);
  assert.deepEqual(guard.planMigrations(
    ['202609200001', '202609230001', '202609240001'],
    ['202609200001', '202609230001', '202609240001'],
    ['202609240001'],
    true,
  ).pendingVersions, []);
  assert.throws(() => guard.planMigrations(
    ['202609200001', '202609230001', '202609240001'], [], [], false,
  ), /baseline.*cannot be bootstrapped without candidate migrations/i);
  assert.throws(() => guard.planMigrations(
    ['202609200001', '202609230001', '202609240001', '202610010001'],
    [],
    ['202610010001'],
    false,
  ), /schema audit supports baselining only through 202609230001/i);
  assert.throws(() => guard.planMigrations(
    ['202609200001', '202609230001', '202609240001'],
    ['202609200001'],
    [],
    true,
  ), /unexpected migration drift/i);
  assert.throws(() => guard.planMigrations(
    ['202609200001', '202609230001', '202609240001'],
    ['202609200001'],
    ['202609240001'],
    true,
  ), /unexpected migration drift/i);
  assert.throws(() => guard.planMigrations(
    ['202609200001', '202609230001', '202609240001'],
    ['202609200001', '202609230001', '209901010001'],
    ['202609240001'],
    true,
  ), /unexpected migration drift/i);
  assert.throws(() => guard.parseExpectedVersions('202609240001,202609240001'), /duplicate/i);
});

test('hosted SQL suites own unique fixture actors and only assert against tracked IDs', () => {
  const pre = readFileSync('scripts/hosted-pre-a2-audit.sql', 'utf8');
  const verification = readFileSync('scripts/hosted-review-verification.sql', 'utf8');
  for (const [name, sql] of [['pre-A2 audit', pre], ['post-migration verification', verification]]) {
    assert.match(sql, /gen_random_uuid\(\)/, `${name} generates unique fixture identities`);
    assert.match(sql, /rts\.test_(?:run_id|actor_[ab]|[a-z0-9_]+_id)/i, `${name} tracks exact run-owned IDs`);
    assert.match(sql, /rollback;/i, `${name} rolls back only its own fixture transaction`);
    assert.doesNotMatch(sql, /select\s+is\s*\(\s*\(\s*select\s+count\s*\(\s*\*\s*\)\s*::?integer\s+from\s+public\.[a-z_]+\s*\)\s*,/i,
      `${name} does not assert global public table counts`);
  }
  assert.match(verification, /set_config\('request\.jwt\.claim\.sub', current_setting\('rts\.test_actor_b'\)[\s\S]*?update public\.deep_dive_module_progress[\s\S]*?set_config\('request\.jwt\.claim\.sub', current_setting\('rts\.test_actor_a'\)[\s\S]*?another user cannot update this run’s progress/);
});

test('hosted workflow runs isolated audits, gates one-time baseline, and skips changes on clean reruns', () => {
  assert.match(workflow, /introduced_migrations/);
  assert.match(workflow, /hosted-review-db-migration\.mjs plan/);
  assert.match(workflow, /hosted-review-db-migration\.mjs apply/);
  assert.match(workflow, /hosted-review-verification\.sql/);
  assert.doesNotMatch(workflow, /supabase\/tests\/(000_harness|010_schema|020_rls_matrix|025_a1_rls|030_same_owner|040_practice_transitions|050_deletion|060_audit|065_actor_resolver|070_awaken_observation|075_ai_reflect|080_see_clearly|090_practice_vertical_slice)\.sql/);
  assert.match(workflow, /if: \$\{\{ steps\.migration_plan\.outputs\.baseline_required == 'true' \}\}/);
  assert.match(workflow, /if: \$\{\{ steps\.confirmed_plan\.outputs\.pending_versions != '' \}\}/);
  assert.match(workflow, /snapshot-a1/);
  assert.match(workflow, /verify-a1-snapshot/);
  assert.match(workflow, /id: second_pass_plan/);
  assert.match(workflow, /No migrations remain pending after the second pass/);
  assert.match(workflow, /Prove rerun is a no-op/);
  assert.doesNotMatch(workflow, /supabase db push|supabase migration repair/);
});

test('atomic migration runner applies SQL and writes its Supabase ledger row in the same transaction', () => {
  assert.ok(guard, 'hosted database guard script exists');
  assert.equal(guard.stripOuterTransactionEnvelope('begin;\nselect 1;\ncommit;'), 'select 1;');
  assert.throws(() => guard.stripOuterTransactionEnvelope('begin;\nselect 1;'), /incomplete transaction envelope/i);
  const runner = readFileSync('scripts/hosted-review-db-migration.mjs', 'utf8');
  assert.match(runner, /await client\.query\('begin'\)[\s\S]*await client\.query\(migrationSql\)[\s\S]*insert into supabase_migrations\.schema_migrations[\s\S]*await client\.query\('commit'\)/);
  assert.match(runner, /pg_advisory_xact_lock/);
});

test('hosted SQL TAP parser distinguishes complete pass plans from isolated assertion failures', () => {
  assert.ok(guard, 'hosted database guard script exists');
  const passed = guard.inspectPgTapResults([
    { rows: [{ result: '1..2' }] },
    { rows: [{ result: 'ok 1 - synthetic actor A can save' }, { result: 'ok 2 - synthetic actor B is blocked' }] },
  ], 'hosted-test');
  assert.equal(passed.complete, true);
  assert.equal(passed.successes.length, 2);
  assert.equal(passed.classification, null);

  const failed = guard.inspectPgTapResults({ rows: [
    { result: '1..2' },
    { result: 'ok 1 - synthetic actor A can save' },
    { result: 'not ok 2 - row-level security blocks another user' },
  ] }, 'hosted-test');
  assert.equal(failed.complete, true);
  assert.equal(failed.classification, 'RLS verification failure');
  const invalidMigrationId = guard.inspectPgTapResults({ rows: [
    { result: '1..1' },
    { result: 'not ok 1 - an unapproved lesson identifier is rejected' },
  ] }, 'hosted-test');
  assert.equal(invalidMigrationId.classification, 'migration failure');
  assert.equal(guard.inspectPgTapResults({ rows: [{ result: 'ok 1 - no plan' }] }, 'hosted-test').complete, false);
});
