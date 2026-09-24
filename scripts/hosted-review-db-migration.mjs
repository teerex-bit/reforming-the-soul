import { readdir } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import pg from 'pg';

export const REVIEW_PROJECT_ID = 'zxikzybpodxecgpkncix';
export const A2_MIGRATION_VERSION = '202609240001';
const SAFE_SEVERITIES = new Set(['ERROR', 'FATAL', 'PANIC', 'WARNING', 'NOTICE', 'INFO', 'LOG', 'DEBUG', 'DEBUG1', 'DEBUG2', 'DEBUG3', 'DEBUG4', 'DEBUG5']);
const NETWORK_ERROR_CODES = new Set(['ECONNREFUSED', 'ECONNRESET', 'ETIMEDOUT', 'EHOSTUNREACH', 'ENETUNREACH', 'EAI_AGAIN', 'ENOTFOUND', 'EPIPE']);
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

export function assertMigrationHistoryMissing(relationName) {
  if (relationName !== null) {
    throw new SafeFailure('Migration history already exists; refusing to bootstrap it.');
  }
  return true;
}

export function classifyDatabaseFailure(error, stage) {
  const code = typeof error?.code === 'string' ? error.code.toUpperCase() : '';
  if (stage === 'connection') {
    return code.startsWith('08') || code.startsWith('28') || NETWORK_ERROR_CODES.has(code) || !code
      ? 'connection/auth failure'
      : 'query failure';
  }
  if (code === '42P01' || code === '3F000') return 'missing migration schema/table';
  if (code === '42501') return 'permission failure';
  return 'query failure';
}

function connectionValues(connectionString) {
  if (typeof connectionString !== 'string' || connectionString.length === 0) return [];
  try {
    const url = new URL(connectionString);
    const values = [url.href, url.host, url.hostname, url.username, url.password, decodeURIComponent(url.username), decodeURIComponent(url.password), url.pathname];
    for (const value of url.searchParams.values()) values.push(value);
    return [...new Set(values.filter((value) => typeof value === 'string' && value.length > 0))];
  } catch {
    return [connectionString];
  }
}

export function sanitizePostgresMessage(message, connectionString = process.env.RTS_DATABASE_URL) {
  let safe = String(message || 'PostgreSQL returned no error message').replace(/[\r\n\t]+/g, ' ');
  const redact = (value) => safe = safe.replace(new RegExp(value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'gi'), '[redacted]');
  for (const value of connectionValues(connectionString).sort((a, b) => b.length - a.length)) redact(value);
  safe = safe
    .replace(/\bpostgres(?:ql)?:\/\/[^\s"'<>]+/gi, '[redacted connection string]')
    .replace(/\b(hostname|host|username|user|database)\b\s*(?:(?:=|:)\s*)?("[^"]*"|'[^']*'|[^\s,;]+)/gi, '$1=[redacted]')
    .replace(/\b(password|token|secret|api[_-]?key)\s*(?:=|:)\s*("[^"]*"|'[^']*'|[^\s,;]+)/gi, '$1=[redacted]')
    .replace(/\b(?:\d{1,3}\.){3}\d{1,3}(?::\d{1,5})?\b/g, '[redacted address]')
    .trim();
  return safe.slice(0, 500);
}

export function safePostgresDiagnostic(error, stage) {
  const rawCode = typeof error?.code === 'string' ? error.code.toUpperCase() : '';
  const code = /^[0-9A-Z]{5}$/.test(rawCode) || NETWORK_ERROR_CODES.has(rawCode)
    ? rawCode
    : undefined;
  const severity = typeof (error?.severity ?? error?.severity_nonlocalized) === 'string'
    ? (error.severity ?? error.severity_nonlocalized).toUpperCase()
    : undefined;
  return {
    event: 'hosted_review_database_diagnostic',
    stage,
    classification: classifyDatabaseFailure(error, stage === 'connection-probe' ? 'connection' : stage),
    ...(code ? { code } : {}),
    ...(severity && SAFE_SEVERITIES.has(severity) ? { severity } : {}),
    message: sanitizePostgresMessage(error?.message),
  };
}

function logPostgresDiagnostic(error, stage) {
  console.error(JSON.stringify(safePostgresDiagnostic(error, stage)));
}

async function probeConnection(pool) {
  try {
    await pool.query('select 1 as rts_connection_probe');
  } catch (error) {
    logPostgresDiagnostic(error, 'connection-probe');
    throw new SafeFailure('Could not establish the review database connection; see sanitized PostgreSQL diagnostics.');
  }
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
    await probeConnection(pool);
    const result = await operation(pool);
    return result;
  } catch (error) {
    if (error instanceof SafeFailure) throw error;
    logPostgresDiagnostic(error, 'database-query');
    throw new SafeFailure('Hosted database check failed; connection details are suppressed.');
  } finally {
    await pool.end();
  }
}

async function readAppliedVersions(pool) {
  try {
    const result = await pool.query('select version from supabase_migrations.schema_migrations order by version');
    return result.rows.map((row) => String(row.version));
  } catch (error) {
    logPostgresDiagnostic(error, 'migration-history');
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

async function assertHistoryMissing() {
  await withReviewDatabase(async (pool) => {
    const result = await pool.query("select to_regclass('supabase_migrations.schema_migrations')::text as relation");
    assertMigrationHistoryMissing(result.rows[0]?.relation ?? null);
    console.log('Review database target confirmed; migration history is absent.');
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
  if (mode === 'assert-history-missing') return assertHistoryMissing();
  if (mode === 'verify') return verify();
  throw new SafeFailure('Use mode preflight, assert-history-missing, or verify.');
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
