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
