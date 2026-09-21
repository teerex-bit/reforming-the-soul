import pg from 'pg';
import { requireActor } from '../auth/require-actor';

type ActorClient = Parameters<typeof requireActor>[0];
export type JournalDeletionCounts = Readonly<{
  deletedEntryId: string;
  dependentArtifactCount: number;
  dependentRecordCount: number;
  dependentLinkCount: number;
  grantCount: number;
}>;
export interface JournalDeletionRepository {
  deleteWithDependencies(actorId: string, entryId: string): Promise<JournalDeletionCounts | null>;
}

let sharedPool: pg.Pool | undefined;
function databasePool() {
  const connectionString = process.env.RTS_DATABASE_URL ?? process.env.DATABASE_URL ?? (process.env.RTS_TEST_MODE === '1' ? process.env.TEST_DATABASE_URL : undefined);
  if (!connectionString) throw new Error('RTS_DATABASE_URL or DATABASE_URL is required for journal deletion.');
  return sharedPool ??= new pg.Pool({ connectionString });
}

export function journalDeletionRepository({ pool }: Readonly<{ pool?: pg.Pool }> = {}): JournalDeletionRepository {
  const database = pool ?? databasePool();
  return { async deleteWithDependencies(actorId, entryId) {
    const client = await database.connect();
    try {
      await client.query('begin');
      await client.query('set local role authenticated');
      await client.query("select set_config('request.jwt.claims', $1, true)", [JSON.stringify({ sub: actorId })]);
      await client.query("select set_config('request.jwt.claim.sub', $1, true)", [actorId]);
      const row = (await client.query(
        'select * from rts_private.delete_journal_entry_with_dependencies($1)', [entryId],
      )).rows[0];
      await client.query('commit');
      if (!row?.deleted_entry_id) return null;
      return {
        deletedEntryId: row.deleted_entry_id,
        dependentArtifactCount: row.dependent_artifact_count,
        dependentRecordCount: row.dependent_record_count,
        dependentLinkCount: row.dependent_link_count,
        grantCount: row.grant_count,
      };
    } catch (error) {
      await client.query('rollback');
      throw error;
    } finally {
      client.release();
    }
  } };
}

const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
export async function deleteJournalEntry(
  input: Readonly<{ entryId: string }>,
  dependencies: Readonly<{ repository?: JournalDeletionRepository; actorClient?: ActorClient }> = {},
) {
  if (typeof input.entryId !== 'string' || !uuidPattern.test(input.entryId)) throw new Error('entryId must be a UUID.');
  const actor = await requireActor(dependencies.actorClient, input);
  const deleted = await (dependencies.repository ?? journalDeletionRepository()).deleteWithDependencies(actor.id, input.entryId);
  if (!deleted) return { kind: 'unavailable' as const };
  return {
    kind: 'deleted' as const,
    dependentArtifactCount: deleted.dependentArtifactCount,
    dependentRecordCount: deleted.dependentRecordCount,
    dependentLinkCount: deleted.dependentLinkCount,
    grantCount: deleted.grantCount,
  };
}
