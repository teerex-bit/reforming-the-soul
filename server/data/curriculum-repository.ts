import pg from 'pg';
import { PHASE_1_CURRICULUM } from '../../content/phase-1/v1/curriculum';
import type { CurriculumNode } from '../../domain/curriculum';
import { validateCurriculumSeed } from '../../domain/curriculum';

export type ResumeState = Readonly<{ currentNodeId: string; state: 'not_started' | 'in_progress' | 'completed'; completedNodeIds: readonly string[] }>;
export type AwakenObservationInput = Readonly<{ actorId: string; eventText: string; internalResponseText: string; bodyCueText: string }>;
export type AwakenObservationResult = Readonly<{ currentNodeId: string }>;
export type SeeClearlyInput = Readonly<{ actorId: string; observableFactText: string; interpretationText: string; beliefExpectationType: 'belief' | 'expectation'; beliefExpectationText: string }>;

export interface ObservationTransaction {
  saveAwakenObservation(input: AwakenObservationInput): Promise<AwakenObservationResult>;
  saveSeeClearly(input: SeeClearlyInput): Promise<AwakenObservationResult>;
}

export interface CurriculumRepository {
  transaction<T>(run: (transaction: ObservationTransaction) => Promise<T>): Promise<T>;
  getResumeState(actorId: string): Promise<ResumeState | null>;
}

function environmentDatabaseUrl() {
  const connectionString = process.env.RTS_DATABASE_URL
    ?? process.env.DATABASE_URL
    ?? (process.env.RTS_TEST_MODE === '1' ? process.env.TEST_DATABASE_URL : undefined);
  if (!connectionString) throw new Error('RTS_DATABASE_URL or DATABASE_URL is required for curriculum persistence.');
  return connectionString;
}

let pool: pg.Pool | undefined;
function databasePool() {
  pool ??= new pg.Pool({ connectionString: environmentDatabaseUrl() });
  return pool;
}

async function authenticateConnection(client: pg.PoolClient, actorId: string) {
  await client.query('set local role authenticated');
  await client.query("select set_config('request.jwt.claims', $1, true)", [JSON.stringify({ sub: actorId })]);
  await client.query("select set_config('request.jwt.claim.sub', $1, true)", [actorId]);
}

export function curriculumNode(nodeId: string): CurriculumNode | null {
  const issues = validateCurriculumSeed(PHASE_1_CURRICULUM);
  if (issues.length) throw new Error(`Invalid curriculum seed: ${issues.join('; ')}`);
  return PHASE_1_CURRICULUM.nodes.find(node => node.id === nodeId) ?? null;
}

export function curriculumRepository({ pool: suppliedPool }: { pool?: pg.Pool } = {}): CurriculumRepository {
  return {
    async transaction(run) {
      const client = await (suppliedPool ?? databasePool()).connect();
      try {
        await client.query('begin');
        const result = await run({
          async saveAwakenObservation(input) {
            await authenticateConnection(client, input.actorId);
            const result = await client.query<{ current_node_id: string }>(
              'select current_node_id from rts_private.save_awaken_observation($1, $2, $3)',
              [input.eventText, input.internalResponseText, input.bodyCueText],
            );
            if (!result.rows[0]) throw new Error('Awaken observation could not be saved.');
            return { currentNodeId: result.rows[0].current_node_id };
          },
          async saveSeeClearly(input) {
            await authenticateConnection(client, input.actorId);
            const result = await client.query<{ current_node_id: string }>(
              'select current_node_id from rts_private.save_see_clearly($1, $2, $3, $4)',
              [input.observableFactText, input.interpretationText, input.beliefExpectationType, input.beliefExpectationText],
            );
            if (!result.rows[0]) throw new Error('See Clearly reflection could not be saved.');
            return { currentNodeId: result.rows[0].current_node_id };
          },
        });
        await client.query('commit');
        return result;
      } catch (error) {
        await client.query('rollback');
        throw error;
      } finally {
        client.release();
      }
    },
    async getResumeState(actorId) {
      const client = await (suppliedPool ?? databasePool()).connect();
      try {
        await client.query('begin');
        await authenticateConnection(client, actorId);
        const result = await client.query<{ current_node_id: string; state: ResumeState['state']; completed_node_ids: string[] }>(
          `select current_node_id, state::text as state, completed_node_ids
           from public.user_curriculum_state where user_id = $1 and curriculum_version_id = 'phase-1-v1'`, [actorId],
        );
        await client.query('commit');
        const row = result.rows[0];
        return row ? { currentNodeId: row.current_node_id, state: row.state, completedNodeIds: row.completed_node_ids } : null;
      } catch (error) {
        await client.query('rollback');
        throw error;
      } finally {
        client.release();
      }
    },
  };
}
