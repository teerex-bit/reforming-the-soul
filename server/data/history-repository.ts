import pg from 'pg';

export type HistoryJournal = Readonly<{ id: string; nodeId: string; entryKind: string; body: string; createdAt: string }>;
export type HistoryRecord = Readonly<{ id: string; recordType: string; value: string; provenance: 'user_authored' | 'user_confirmed_ai'; createdAt: string }>;
export type HistoryArtifact = Readonly<{
  id: string; artifactType: string; content: Readonly<Record<string, unknown>>; status: 'suggested' | 'confirmed' | 'invalidated';
  provenance: 'ai_suggested' | 'user_confirmed_ai'; modelId: string; curriculumVersionId: string;
  policy: Readonly<{ global: string; stage: string; mode: string; outputSchema: string }>;
  sources: readonly Readonly<{ journalEntryId: string; role: 'current' | 'selected_prior'; contextGrantId: string | null; grantRevision: number | null }>[]; createdAt: string;
}>;
export type FormationHistoryItem = Readonly<{ journal: HistoryJournal; records: readonly HistoryRecord[]; artifacts: readonly HistoryArtifact[] }>;
export interface FormationHistoryRepository { list(actorId: string): Promise<readonly FormationHistoryItem[]> }

let sharedPool: pg.Pool | undefined;
function databasePool() {
  const connectionString = process.env.RTS_DATABASE_URL ?? process.env.DATABASE_URL ?? (process.env.RTS_TEST_MODE === '1' ? process.env.TEST_DATABASE_URL : undefined);
  if (!connectionString) throw new Error('RTS_DATABASE_URL or DATABASE_URL is required for formation history.');
  return sharedPool ??= new pg.Pool({ connectionString });
}

async function authenticate(client: pg.PoolClient, actorId: string) {
  await client.query('set local role authenticated');
  await client.query("select set_config('request.jwt.claims', $1, true)", [JSON.stringify({ sub: actorId })]);
  await client.query("select set_config('request.jwt.claim.sub', $1, true)", [actorId]);
}

export function formationHistoryRepository({ pool }: Readonly<{ pool?: pg.Pool }> = {}): FormationHistoryRepository {
  const database = pool ?? databasePool();
  return { async list(actorId) {
    const client = await database.connect();
    try {
      await client.query('begin');
      await authenticate(client, actorId);
      const [journals, records, artifacts] = await Promise.all([
        client.query(`select id, node_id, entry_kind::text, body, created_at
          from public.journal_entries where user_id=$1 order by created_at asc, id asc`, [actorId]),
        client.query(`select id, source_journal_entry_id, record_type::text, value_text, provenance::text, created_at
          from public.formation_records where user_id=$1 order by created_at asc, id asc`, [actorId]),
        client.query(`select a.id, a.artifact_type::text, a.content, a.status::text, a.provenance::text, a.model_id, a.curriculum_version_id,
            a.global_policy_version, a.stage_policy_version, a.mode_policy_version, a.output_schema_version, a.created_at,
            coalesce(jsonb_agg(jsonb_build_object('journalEntryId', s.journal_entry_id, 'role', s.source_role,
              'contextGrantId', s.context_grant_id, 'grantRevision', s.grant_revision)
              order by case s.source_role when 'current' then 0 else 1 end, s.created_at, s.id)
              filter (where s.id is not null), '[]'::jsonb) sources
          from public.ai_artifacts a left join public.ai_artifact_sources s on (s.artifact_id,s.user_id)=(a.id,a.user_id)
          where a.user_id=$1 group by a.id order by a.created_at asc, a.id asc`, [actorId]),
      ]);
      await client.query('commit');

      const recordMap = new Map<string, HistoryRecord[]>();
      for (const row of records.rows) {
        const values = recordMap.get(row.source_journal_entry_id) ?? [];
        values.push({ id: row.id, recordType: row.record_type, value: row.value_text, provenance: row.provenance, createdAt: row.created_at.toISOString() });
        recordMap.set(row.source_journal_entry_id, values);
      }
      const artifactMap = new Map<string, HistoryArtifact[]>();
      for (const row of artifacts.rows) {
        const sources = row.sources as { journalEntryId: string; role: 'current' | 'selected_prior'; contextGrantId: string | null; grantRevision: number | null }[];
        if (!sources[0]) continue;
        const values = artifactMap.get(sources[0].journalEntryId) ?? [];
        values.push({ id: row.id, artifactType: row.artifact_type, content: row.content, status: row.status, provenance: row.provenance,
          modelId: row.model_id, curriculumVersionId: row.curriculum_version_id, policy: { global: row.global_policy_version, stage: row.stage_policy_version, mode: row.mode_policy_version, outputSchema: row.output_schema_version },
          sources, createdAt: row.created_at.toISOString() });
        artifactMap.set(sources[0].journalEntryId, values);
      }
      return journals.rows.map(row => ({ journal: { id: row.id, nodeId: row.node_id, entryKind: row.entry_kind, body: row.body, createdAt: row.created_at.toISOString() },
        records: recordMap.get(row.id) ?? [], artifacts: artifactMap.get(row.id) ?? [] }));
    } catch (error) { await client.query('rollback'); throw error; } finally { client.release(); }
  } };
}
