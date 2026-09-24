import { appendFile, readFile, readdir } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import pg from 'pg';

export const REVIEW_PROJECT_ID = 'zxikzybpodxecgpkncix';
export const A2_MIGRATION_VERSION = '202609240001';
export const A1_MIGRATION_VERSION = '202609230001';
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

export function parseExpectedVersions(value) {
  const versions = String(value ?? '').split(/[\s,]+/).filter(Boolean);
  if (!versions.length || versions.some((version) => !/^\d{12}$/.test(version))) {
    throw new SafeFailure('Expected migration versions must be a non-empty list of 12-digit versions.');
  }
  if (new Set(versions).size !== versions.length) {
    throw new SafeFailure('Expected migration versions contain a duplicate.');
  }
  return versions.sort();
}

function sortedUnique(values) {
  const normalized = values.map(String);
  if (new Set(normalized).size !== normalized.length) {
    throw new SafeFailure('Migration history contains duplicate versions.');
  }
  return normalized.sort();
}

export function planMigrations(localVersions, remoteVersions, expectedVersions, historyExists) {
  const local = sortedUnique(localVersions);
  const remote = sortedUnique(remoteVersions);
  const expected = sortedUnique(expectedVersions);
  if (!local.length || !expected.length || expected.some((version) => !local.includes(version))) {
    throw new SafeFailure('Unexpected migration drift: expected migration is not present in this checkout.');
  }
  if (remote.some((version) => !local.includes(version))) {
    throw new SafeFailure('Unexpected migration drift: database history contains a version absent from this checkout.');
  }

  if (!historyExists) {
    if (remote.length) throw new SafeFailure('Unexpected migration drift: history rows exist without the Supabase ledger.');
    const baseline = local.slice(0, local.length - expected.length);
    const pending = local.slice(baseline.length);
    if (pending.length !== expected.length || pending.some((version, index) => version !== expected[index])) {
      throw new SafeFailure('Unexpected migration drift: baseline bootstrap is allowed only for a contiguous migration suffix.');
    }
    return {
      baselineVersions: baseline,
      pendingVersions: pending,
      alreadyAppliedVersions: [],
      baselineRequired: true,
    };
  }

  const pending = local.filter((version) => !remote.includes(version));
  if (pending.some((version) => !expected.includes(version)) || expected.some((version) => !local.includes(version))) {
    throw new SafeFailure(`Unexpected migration drift: ledger pending set is [${pending.join(', ')}].`);
  }
  return {
    baselineVersions: [],
    pendingVersions: pending,
    alreadyAppliedVersions: remote,
    baselineRequired: false,
  };
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
  if (stage === 'migration') return 'migration failure';
  if (stage === 'schema-audit') return 'schema drift';
  if (stage === 'rls-verification') return 'RLS verification failure';
  if (stage === 'hosted-test' && code === '42501') return 'RLS verification failure';
  if (stage === 'hosted-test') return 'test-isolation failure';
  if (stage === 'connection') {
    return code.startsWith('08') || code.startsWith('28') || NETWORK_ERROR_CODES.has(code) || !code
      ? 'connection/auth failure'
      : 'query failure';
  }
  if (code === '42P01' || code === '3F000') return 'missing migration schema/table';
  if (code === '42501') return 'permission failure';
  return 'query failure';
}

function classifyTapFailures(stage, failures) {
  if (stage === 'schema-audit') return 'schema drift';
  const labels = failures.join(' ');
  if (/row.level security|RLS|another user|cross.user|ownership/i.test(labels)) return 'RLS verification failure';
  if (/A1|A2|identifier|invalid module|invalid prompt/i.test(labels)) return 'migration failure';
  return 'test-isolation failure';
}

export function inspectPgTapResults(results, stage) {
  const resultList = Array.isArray(results) ? results : [results];
  const messages = resultList.flatMap((result) => (result.rows ?? []).flatMap((row) =>
    Object.values(row).filter((value) => typeof value === 'string')));
  const plan = messages.find((message) => /^1\.\.\d+$/.test(message));
  const expectedCount = plan ? Number(plan.slice(3)) : 0;
  const successes = messages.filter((message) => /^ok \d+(?:\s|$)/.test(message));
  const failures = messages.filter((message) => /^not ok \d+(?:\s|$)/.test(message));
  const complete = expectedCount > 0 && successes.length + failures.length === expectedCount;
  return {
    expectedCount,
    successes,
    failures,
    complete,
    classification: failures.length || !complete ? classifyTapFailures(stage, failures) : null,
  };
}

async function runHostedSqlTest(stage, relativeFile) {
  const allowed = new Map([
    ['schema-audit', 'scripts/hosted-pre-a2-audit.sql'],
    ['hosted-test', 'scripts/hosted-review-verification.sql'],
  ]);
  if (allowed.get(stage) !== relativeFile) throw new SafeFailure('Hosted SQL test is not in the allowlist.');
  const absoluteFile = path.resolve(projectRoot, relativeFile);
  if (!absoluteFile.startsWith(`${projectRoot}${path.sep}`)) throw new SafeFailure('Hosted SQL test path is invalid.');
  const sql = await readFile(absoluteFile, 'utf8');
  await withReviewClient(async (client) => {
    let results;
    try {
      results = await client.query(sql);
    } catch (error) {
      await client.query('rollback').catch(() => {});
      logPostgresDiagnostic(error, stage);
      throw new SafeFailure('Hosted SQL test failed; only sanitized PostgreSQL diagnostics were logged.');
    }
    const inspected = inspectPgTapResults(results, stage);
    if (!inspected.complete || inspected.failures.length > 0) {
      const classification = inspected.classification;
      console.error(JSON.stringify({
        event: 'hosted_review_database_diagnostic',
        stage,
        classification,
        message: `${inspected.failures.length || 1} run-owned hosted assertion(s) failed or returned an incomplete TAP plan.`,
      }));
      throw new SafeFailure(`${classification}: hosted SQL assertions failed.`);
    }
    console.log(`Hosted ${stage} passed (${inspected.successes.length} run-owned assertions; transaction rolled back).`);
  });
}

function migrationNameFromPath(file) {
  const match = path.basename(file).match(/^\d{12}_(.+)\.sql$/);
  if (!match) throw new SafeFailure('Migration filename does not follow the Supabase version_name.sql format.');
  return match[1];
}

async function migrationFilesByVersion() {
  const files = await readdir(path.join(projectRoot, 'supabase', 'migrations'));
  return new Map(files.flatMap((file) => {
    const match = file.match(/^(\d{12})_.+\.sql$/);
    return match ? [[match[1], path.join(projectRoot, 'supabase', 'migrations', file)]] : [];
  }));
}

async function withReviewClient(operation) {
  const connectionString = process.env.RTS_DATABASE_URL;
  if (!connectionString || !isReviewDatabaseUrl(connectionString)) {
    throw new SafeFailure(`RTS_DATABASE_URL must identify review Supabase project ${REVIEW_PROJECT_ID}.`);
  }
  const pool = new pg.Pool({ connectionString, max: 1, connectionTimeoutMillis: 10000 });
  try {
    await probeConnection(pool);
    const client = await pool.connect();
    try {
      return await operation(client);
    } finally {
      client.release();
    }
  } catch (error) {
    if (error instanceof SafeFailure) throw error;
    logPostgresDiagnostic(error, 'database-query');
    throw new SafeFailure('Hosted database check failed; connection details are suppressed.');
  } finally {
    await pool.end();
  }
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

async function migrationLedgerState(pool) {
  const result = await pool.query("select to_regclass('supabase_migrations.schema_migrations')::text as relation");
  const relation = result.rows[0]?.relation ?? null;
  if (relation === null) return { exists: false, versions: [] };
  return { exists: true, versions: await readAppliedVersions(pool) };
}

async function plan({ writeOutputs = false } = {}) {
  const local = await localMigrationVersions();
  const expected = parseExpectedVersions(process.env.EXPECTED_PENDING_MIGRATIONS);
  const planResult = await withReviewDatabase(async (pool) => {
    const ledger = await migrationLedgerState(pool);
    return planMigrations(local, ledger.versions, expected, ledger.exists);
  });
  console.log(`Migration plan passed; baseline ${planResult.baselineRequired ? 'required' : 'already exists'}; pending versions: ${planResult.pendingVersions.join(', ') || 'none'}.`);
  if (writeOutputs) {
    const outputPath = process.env.GITHUB_OUTPUT;
    if (!outputPath) throw new SafeFailure('GitHub workflow output file is unavailable.');
    await appendFile(outputPath, [
      `baseline_required=${planResult.baselineRequired}`,
      `baseline_versions=${planResult.baselineVersions.join(',')}`,
      `pending_versions=${planResult.pendingVersions.join(',')}`,
      `a2_pending=${planResult.pendingVersions.includes(A2_MIGRATION_VERSION)}`,
      `a2_applied=${planResult.alreadyAppliedVersions.includes(A2_MIGRATION_VERSION)}`,
    ].join('\n') + '\n');
  }
  return planResult;
}

async function readA1Snapshot(pool) {
  const progress = await pool.query(`
    select md5(coalesce(string_agg(md5(to_jsonb(row_data)::text), '' order by id), '')) as fingerprint
    from public.deep_dive_module_progress as row_data
  `);
  const reflections = await pool.query(`
    select md5(coalesce(string_agg(md5(to_jsonb(row_data)::text), '' order by id), '')) as fingerprint
    from public.deep_dive_reflections as row_data
  `);
  return {
    progress: progress.rows[0].fingerprint,
    reflections: reflections.rows[0].fingerprint,
  };
}

async function snapshotA1() {
  const snapshot = await withReviewDatabase(readA1Snapshot);
  console.log('A1 review-data fingerprint captured without reading row contents into workflow logs.');
  if (process.env.GITHUB_OUTPUT) {
    await appendFile(process.env.GITHUB_OUTPUT, `progress=${snapshot.progress}\nreflections=${snapshot.reflections}\n`);
  } else {
    console.log(JSON.stringify(snapshot));
  }
}

async function bootstrapBaseline() {
  const local = await localMigrationVersions();
  const expected = parseExpectedVersions(process.env.EXPECTED_PENDING_MIGRATIONS);
  const files = await migrationFilesByVersion();
  const versions = planMigrations(local, [], expected, false);
  if (!versions.baselineRequired || versions.baselineVersions.length === 0) {
    throw new SafeFailure('Migration baseline is not in the expected one-time bootstrap state.');
  }
  const plannedBaseline = String(process.env.BASELINE_VERSIONS ?? '').split(',').filter(Boolean).sort();
  if (plannedBaseline.length && JSON.stringify(plannedBaseline) !== JSON.stringify(versions.baselineVersions)) {
    throw new SafeFailure('Migration baseline changed after the audit plan; refusing bootstrap.');
  }

  await withReviewClient(async (client) => {
    await client.query('begin');
    try {
      await client.query("select pg_advisory_xact_lock(hashtextextended('rts-review-migration-ledger', 0))");
      const ledger = await migrationLedgerState(client);
      if (ledger.exists) throw new SafeFailure('Migration history appeared after the baseline audit; refusing bootstrap.');
      await client.query('create schema supabase_migrations');
      await client.query('create table supabase_migrations.schema_migrations (version text not null primary key)');
      await client.query('alter table supabase_migrations.schema_migrations add column statements text[]');
      await client.query('alter table supabase_migrations.schema_migrations add column name text');

      for (const version of versions.baselineVersions) {
        const file = files.get(version);
        if (!file) throw new SafeFailure('A baseline migration file disappeared after the schema audit.');
        const sql = await readFile(file, 'utf8');
        await client.query(
          'insert into supabase_migrations.schema_migrations (version, name, statements) values ($1, $2, $3::text[])',
          [version, migrationNameFromPath(file), [sql]],
        );
      }
      await client.query('commit');
      console.log(`One-time Supabase migration history baseline created atomically for ${versions.baselineVersions.length} audited historical migrations; no migration SQL was replayed.`);
    } catch (error) {
      await client.query('rollback').catch(() => {});
      if (!(error instanceof SafeFailure)) logPostgresDiagnostic(error, 'migration');
      throw error instanceof SafeFailure ? error : new SafeFailure('Historical migration ledger bootstrap failed atomically.');
    }
  });
}

export function stripOuterTransactionEnvelope(sql) {
  const lines = sql.split(/\r?\n/);
  let first = 0;
  while (first < lines.length && (!lines[first].trim() || lines[first].trim().startsWith('--'))) first++;
  let last = lines.length - 1;
  while (last >= 0 && (!lines[last].trim() || lines[last].trim().startsWith('--'))) last--;
  const hasBegin = /^begin\s*;\s*$/i.test(lines[first]?.trim() ?? '');
  const hasCommit = /^commit\s*;\s*$/i.test(lines[last]?.trim() ?? '');
  if (hasBegin !== hasCommit) throw new SafeFailure('Migration has an incomplete transaction envelope; refusing to apply it.');
  if (hasBegin) {
    lines.splice(last, 1);
    lines.splice(first, 1);
  }
  return lines.join('\n').trim();
}

async function applyExpectedMigrations() {
  const local = await localMigrationVersions();
  const expected = parseExpectedVersions(process.env.EXPECTED_PENDING_MIGRATIONS);
  const files = await migrationFilesByVersion();
  await withReviewClient(async (client) => {
    const initialLedger = await migrationLedgerState(client);
    if (!initialLedger.exists) throw new SafeFailure('Migration history baseline is missing; refusing to apply migrations.');
    let migrationPlan = planMigrations(local, initialLedger.versions, expected, true);
    if (migrationPlan.pendingVersions.length === 0) {
      console.log('No expected migrations are pending; no database changes were made.');
      return;
    }

    for (const version of migrationPlan.pendingVersions) {
      const file = files.get(version);
      if (!file) throw new SafeFailure('Expected migration file is missing from this checkout.');
      const originalSql = await readFile(file, 'utf8');
      const migrationSql = stripOuterTransactionEnvelope(originalSql);
      await client.query('begin');
      try {
        await client.query("select pg_advisory_xact_lock(hashtextextended('rts-review-migration-ledger', 0))");
        const currentLedger = await migrationLedgerState(client);
        if (!currentLedger.exists) throw new SafeFailure('Migration history disappeared before apply.');
        migrationPlan = planMigrations(local, currentLedger.versions, expected, true);
        if (!migrationPlan.pendingVersions.includes(version)) {
          if (migrationPlan.alreadyAppliedVersions.includes(version)) {
            await client.query('commit');
            console.log(`Expected migration ${version} was recorded by another serialized run; no change was needed.`);
            continue;
          }
          throw new SafeFailure('Migration ledger changed during apply; refusing unexpected drift.');
        }
        await client.query(migrationSql);
        await client.query(
          'insert into supabase_migrations.schema_migrations (version, name, statements) values ($1, $2, $3::text[])',
          [version, migrationNameFromPath(file), [migrationSql]],
        );
        await client.query('commit');
        console.log(`Applied expected migration ${version} and recorded its ledger row atomically.`);
      } catch (error) {
        await client.query('rollback').catch(() => {});
        if (!(error instanceof SafeFailure)) logPostgresDiagnostic(error, 'migration');
        throw error instanceof SafeFailure ? error : new SafeFailure(`Migration ${version} failed atomically; its DDL and ledger row were rolled back.`);
      }
    }
  });
}

async function verifyA1Snapshot() {
  const expected = {
    progress: process.env.A1_PROGRESS_FINGERPRINT,
    reflections: process.env.A1_REFLECTIONS_FINGERPRINT,
  };
  if (!expected.progress || !expected.reflections) throw new SafeFailure('A1 review-data fingerprint inputs are missing.');
  const actual = await withReviewDatabase(readA1Snapshot);
  if (actual.progress !== expected.progress || actual.reflections !== expected.reflections) {
    throw new SafeFailure('A1 review data changed during migration or hosted verification.');
  }
  console.log('A1 review-data fingerprint is unchanged.');
}

async function preflight() {
  return plan();
}

async function assertHistoryMissing() {
  await withReviewDatabase(async (pool) => {
    const result = await pool.query("select to_regclass('supabase_migrations.schema_migrations')::text as relation");
    assertMigrationHistoryMissing(result.rows[0]?.relation ?? null);
    console.log('Review database target confirmed; migration history is absent.');
  });
}

async function verify() {
  const local = await localMigrationVersions();
  await withReviewDatabase(async (pool) => {
    const applied = await readAppliedVersions(pool);
    if (JSON.stringify(sortedUnique(applied)) !== JSON.stringify(sortedUnique(local))) {
      throw new SafeFailure('Unexpected migration drift: hosted migration ledger does not exactly match this checkout.');
    }

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
    console.log(`Migration ledger matches this checkout through ${local.at(-1)}; both Deep Dive tables have RLS enabled and forced.`);
  });
}

async function main() {
  const [mode, ...args] = process.argv.slice(2);
  if (mode === 'preflight') return preflight();
  if (mode === 'assert-history-missing') return assertHistoryMissing();
  if (mode === 'verify') return verify();
  if (mode === 'plan') return plan({ writeOutputs: true });
  if (mode === 'bootstrap-baseline') return bootstrapBaseline();
  if (mode === 'apply') return applyExpectedMigrations();
  if (mode === 'snapshot-a1') return snapshotA1();
  if (mode === 'verify-a1-snapshot') return verifyA1Snapshot();
  if (mode === 'test-sql') return runHostedSqlTest(args[0], args[1]);
  throw new SafeFailure('Use mode plan, preflight, snapshot-a1, verify-a1-snapshot, assert-history-missing, or verify.');
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
