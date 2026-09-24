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

test('hosted migration workflow is manual-only and bound to the certified development commit', () => {
  assert.match(workflow, /^on:\n  workflow_dispatch:/m);
  assert.doesNotMatch(workflow, /^  (push|pull_request|schedule):/m);
  assert.match(workflow, /secrets\.RTS_DATABASE_URL/);
  assert.match(workflow, /certified_commit/);
  assert.match(workflow, /refs\/heads\/work\/a2-persistence/);
  assert.match(workflow, /CERTIFIED_COMMIT.*GITHUB_SHA/s);
  assert.match(workflow, /ref: \$\{\{ github\.sha \}\}/);
  assert.match(workflow, /RTS_DATABASE_URL: \$\{\{ secrets\.RTS_DATABASE_URL \}\}/);
  assert.match(workflow, /supabase db push .*--skip-vault/);
  assert.match(workflow, /supabase test db .*026_a2_persistence\.sql/);
  assert.match(workflow, /hosted-review-db-migration\.mjs verify/);
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

test('pending migration guard allows only the A2 migration and fails closed on any other pending migration', () => {
  assert.ok(guard, 'hosted database guard script exists');
  assert.deepEqual(guard.pendingVersions(['202609200001', '202609240001'], ['202609200001']), ['202609240001']);
  assert.deepEqual(guard.pendingVersions(['202609200001', '202609240001'], ['202609200001', '202609240001']), []);
  assert.throws(() => guard.assertOnlyA2Pending(['202609200001', '202609240001', '202609250001'], ['202609200001']), /unexpected pending migrations/i);
});

test('hosted database failures are classified by probe stage and PostgreSQL error code', () => {
  assert.equal(guard.classifyDatabaseFailure({ code: '28P01' }, 'connection'), 'connection/auth failure');
  assert.equal(guard.classifyDatabaseFailure({ code: '08006' }, 'connection'), 'connection/auth failure');
  assert.equal(guard.classifyDatabaseFailure({ code: '42P01' }, 'migration-history'), 'missing migration schema/table');
  assert.equal(guard.classifyDatabaseFailure({ code: '3F000' }, 'migration-history'), 'missing migration schema/table');
  assert.equal(guard.classifyDatabaseFailure({ code: '42501' }, 'migration-history'), 'permission failure');
  assert.equal(guard.classifyDatabaseFailure({ code: 'XX000' }, 'migration-history'), 'query failure');
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

test('hosted workflow diagnostic mode has no migration or persistence-verification side effects', () => {
  assert.match(workflow, /diagnostic_only/);
  assert.match(workflow, /inputs\.diagnostic_only/);
  assert.match(workflow, /default: true/);
  assert.match(workflow, /target_a2_sha/);
  assert.match(workflow, /d84cc87cc8f8c9a60fa60e600c7f320e2ff3698c/);
  for (const step of [
    'Apply pending Supabase migrations',
    'Verify A1 and A2 persistence, rejected IDs, and RLS',
    'Verify migration record and forced RLS',
    'Report migration and verification result',
  ]) {
    const stepBlock = workflow.match(new RegExp(`- name: ${step}[\\s\\S]*?(?=\\n      - name:|$)`))?.[0] ?? '';
    assert.match(stepBlock, /if: \$\{\{ !inputs\.diagnostic_only \}\}/, `${step} must be skipped in diagnostic-only mode`);
  }
  assert.match(workflow, /git diff --exit-code "\$TARGET_A2_SHA" "\$GITHUB_SHA" -- supabase\/migrations/);
  assert.match(workflow, /node scripts\/hosted-review-db-migration\.mjs preflight/);
});
