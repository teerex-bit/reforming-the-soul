import pg from 'pg';
import type { CurrentReflectContext } from '../ai/context-builder';

export type AiTerminalStatus = 'success' | 'refusal' | 'incomplete' | 'invalid' | 'timeout' | 'provider_error';
export type ReflectReservation =
  | Readonly<{ kind: 'dispatch'; threadId: string; context: CurrentReflectContext }>
  | Readonly<{ kind: 'already_completed' | 'in_progress'; threadId: string }>
  | Readonly<{ kind: 'unavailable' }>;

export interface AiReflectRepository {
  reserve(input: Readonly<{
    actorId: string; intentId: string; requestFingerprint: string; modelId: string;
    globalPolicyVersion: string; stagePolicyVersion: string; modePolicyVersion: string; outputSchemaVersion: string;
  }>): Promise<ReflectReservation>;
  complete(input: Readonly<{ actorId: string; threadId: string; status: AiTerminalStatus; durationMs: number }>): Promise<void>;
  saveInsight(input: Readonly<{ actorId: string; threadId: string | null; insightText: string }>): Promise<{ currentNodeId: string }>;
}

function connectionString() {
  const value = process.env.RTS_DATABASE_URL ?? process.env.DATABASE_URL ?? (process.env.RTS_TEST_MODE === '1' ? process.env.TEST_DATABASE_URL : undefined);
  if (!value) throw new Error('RTS_DATABASE_URL or DATABASE_URL is required for AI persistence.');
  return value;
}
let sharedPool: pg.Pool | undefined;
function pool() { sharedPool ??= new pg.Pool({ connectionString: connectionString() }); return sharedPool; }

async function authenticate(client: pg.PoolClient, actorId: string) {
  await client.query('set local role authenticated');
  await client.query("select set_config('request.jwt.claims', $1, true)", [JSON.stringify({ sub: actorId })]);
  await client.query("select set_config('request.jwt.claim.sub', $1, true)", [actorId]);
}

export function aiReflectRepository(options: Readonly<{ pool?: pg.Pool }> = {}): AiReflectRepository {
  const database = options.pool ?? pool();
  return {
    async reserve(input) {
      const client = await database.connect();
      try {
        await client.query('begin');
        await authenticate(client, input.actorId);
        const result = await client.query<{
          reservation_result: 'dispatch' | 'already_completed' | 'in_progress' | 'unavailable'; thread_id: string | null;
          event_id: string | null; event_body: string | null; internal_id: string | null; internal_body: string | null; body_id: string | null; body_body: string | null;
        }>('select * from rts_private.reserve_ai_reflect($1,$2,$3,$4,$5,$6,$7)', [
          input.intentId, input.requestFingerprint, input.modelId, input.globalPolicyVersion,
          input.stagePolicyVersion, input.modePolicyVersion, input.outputSchemaVersion,
        ]);
        await client.query('commit');
        const row = result.rows[0];
        if (!row || row.reservation_result === 'unavailable') return { kind: 'unavailable' };
        if (row.reservation_result !== 'dispatch') return { kind: row.reservation_result, threadId: row.thread_id! };
        return { kind: 'dispatch', threadId: row.thread_id!, context: { entries: [
          { id: row.event_id!, kind: 'event', body: row.event_body! },
          { id: row.internal_id!, kind: 'internal_response', body: row.internal_body! },
          { id: row.body_id!, kind: 'body_cue', body: row.body_body! },
        ] } };
      } catch (error) {
        await client.query('rollback');
        throw error;
      } finally { client.release(); }
    },
    async complete(input) {
      const client = await database.connect();
      try {
        await client.query('begin');
        await authenticate(client, input.actorId);
        await client.query('select rts_private.complete_ai_reflect($1,$2,$3)', [input.threadId, input.status, input.durationMs]);
        await client.query('commit');
      } catch (error) {
        await client.query('rollback');
        throw error;
      } finally { client.release(); }
    },
    async saveInsight(input) {
      const client = await database.connect();
      try {
        await client.query('begin');
        await authenticate(client, input.actorId);
        const result = await client.query<{ current_node_id: string }>(
          'select current_node_id from rts_private.save_reflect_insight($1,$2)', [input.threadId, input.insightText],
        );
        await client.query('commit');
        return { currentNodeId: result.rows[0].current_node_id };
      } catch (error) {
        await client.query('rollback');
        throw error;
      } finally { client.release(); }
    },
  };
}
