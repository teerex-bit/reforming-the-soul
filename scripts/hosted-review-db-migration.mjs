import { readdir } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import pg from 'pg';

export const REVIEW_PROJECT_ID = 'zxikzybpodxecgpkncix';
export const A2_MIGRATION_VERSION = '202609240001';
const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

class SafeFailure extends Error {}

export function isReviewDatabaseUrl(connectionString) {
  try {
    const url = new URL(connectionString);
    if (!['postgres:', 'postgresql:'].includes(url.protocol)) return false;
    const username = decodeURIComponent(url.username);
    const options = url.searchParams.get('options') ?? '';
    const identity = `${url.hostname} ${username} ${options}`.toLowerCase();
    return identity.includes(REVIEW_PROJECT_ID);
  } catch {
    return false;
  }
}

export function pendingVersions(localVersions, remoteVersions) {
  const applied = new Set(remoteVersions.map(String));
  return localVersions.map(String).filter((version) => !applied.has(version));
}

export function assertOnlyA2Pending(localVersions, remoteVersions) {
  const local = localVersions.map(String);
  if (!local.includes(A2_MIGRATION_VERSION)) {
    throw new SafeFailure('The A2 migration is missing from this checkout.');
  }
  const pending = pendingVersions(local, remoteVersions);
  if (pending.some((version) => version !== A2_MIGRATION_VERSION)) {
    throw new SafeFailure(`Unexpected pending migrations: ${pending.filter((version) => version !== A2_MIGRATION_VERSION).join(', ')}`);
  }
  return pending;
}

async function localMigrationVersions() {
  const files = await readdir(path.join(projectRoot, 'supabase', 'migrations'));
  return files
    .map((file) => file.match(/^(\d+)_.*\.sql$/)?.[1])
    .filter(Boolean)
    .sort();
}

async function withReviewDatabase(operation) {
  const connectionString = process.env.RTS_DATABASE_URL;
  if (!connectionString || !isReviewDatabaseUrl(connectionString)) {
    throw new SafeFailure(`RTS_DATABASE_URL must identify review Supabase project ${REVIEW_PROJECT_ID}.`);
  }

  const pool = new pg.Pool({ connectionString, max: 1, connectionTimeoutMillis: 10000 });
  try {
    const result = await operation(pool);
    return result;
  } catch (error) {
    if (error instanceof SafeFailure) throw error;
    throw new SafeFailure('Hosted database check failed; connection details are suppressed.');
  } finally {
    await pool.end();
  }
}

async function readAppliedVersions(pool) {
  try {
    const result = await pool.query('select version from supabase_migrations.schema_migrations order by version');
    return result.rows.map((row) => String(row.version));
  } catch {
    throw new SafeFailure('Could not read Supabase migration history; no migration was applied.');
  }
}

async function preflight() {
  const local = await localMigrationVersions();
  await withReviewDatabase(async (pool) => {
    const remote = await readAppliedVersions(pool);
    const pending = assertOnlyA2Pending(local, remote);
    console.log(pending.length ? `Preflight passed; only migration ${A2_MIGRATION_VERSION} is pending.` : `Preflight passed; migration ${A2_MIGRATION_VERSION} is already recorded and no migrations are pending.`);
  });
}

async function verify() {
  await withReviewDatabase(async (pool) => {
    const applied = await pool.query(
      'select 1 from supabase_migrations.schema_migrations where version = $1',
      [A2_MIGRATION_VERSION],
    );
    if (applied.rowCount !== 1) throw new SafeFailure('A2 migration version is not recorded.');

    const tables = await pool.query(
      `select c.relname, c.relrowsecurity, c.relforcerowsecurity
       from pg_class c join pg_namespace n on n.oid = c.relnamespace
       where n.nspname = 'public'
         and c.relname = any($1::text[])
         and c.relkind = 'r'`,
      [['deep_dive_module_progress', 'deep_dive_reflections']],
    );
    if (tables.rowCount !== 2 || tables.rows.some((row) => !row.relrowsecurity || !row.relforcerowsecurity)) {
      throw new SafeFailure('Deep Dive RLS is not enabled and forced on both tables.');
    }
    console.log(`Migration ${A2_MIGRATION_VERSION} is recorded; both Deep Dive tables have RLS enabled and forced.`);
  });
}

async function main() {
  const [mode] = process.argv.slice(2);
  if (mode === 'preflight') return preflight();
  if (mode === 'verify') return verify();
  throw new SafeFailure('Use mode preflight or verify.');
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main().catch((error) => {
    const message = error instanceof SafeFailure
      ? error.message
      : 'Hosted database operation failed; connection details are suppressed.';
    console.error(message);
    process.exitCode = 1;
  });
}
