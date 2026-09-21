import pg from 'pg';
import type { PracticeState } from '../../domain/practice';

export type PracticeView = Readonly<{ id: string; state: PracticeState; lockVersion: number; controlTargetText: string; presentTruthText: string; nextRightStepText: string; outcomeText: string | null; reviewText: string | null }>;
export type PracticeMutation = Readonly<{ id: string; state: PracticeState; lockVersion: number }>;
type ActorInput = Readonly<{ actorId: string }>;
export interface PracticeRepository {
  create(input: ActorInput & { controlTargetText: string; presentTruthText: string; nextRightStepText: string }): Promise<PracticeMutation>;
  recordReturn(input: ActorInput & { practiceId: string; expectedLockVersion: number; outcomeText: string }): Promise<PracticeMutation>;
  review(input: ActorInput & { practiceId: string; expectedLockVersion: number; reviewText: string }): Promise<PracticeMutation>;
  close(input: ActorInput & { practiceId: string; expectedLockVersion: number }): Promise<PracticeMutation>;
  get(actorId: string, practiceId: string): Promise<PracticeView | null>;
  getUnfinished(actorId: string): Promise<PracticeView | null>;
}

let pool: pg.Pool | undefined;
function databasePool() {
  const connectionString = process.env.RTS_DATABASE_URL ?? process.env.DATABASE_URL ?? (process.env.RTS_TEST_MODE === '1' ? process.env.TEST_DATABASE_URL : undefined);
  if (!connectionString) throw new Error('RTS_DATABASE_URL or DATABASE_URL is required for practice persistence.');
  return pool ??= new pg.Pool({ connectionString });
}
async function authenticated<T>(activePool: pg.Pool, actorId: string, run: (client: pg.PoolClient) => Promise<T>) {
  const client = await activePool.connect();
  try {
    await client.query('begin');
    await client.query('set local role authenticated');
    await client.query("select set_config('request.jwt.claims', $1, true)", [JSON.stringify({ sub: actorId })]);
    await client.query("select set_config('request.jwt.claim.sub', $1, true)", [actorId]);
    const result = await run(client); await client.query('commit'); return result;
  } catch (error) { await client.query('rollback'); throw error; } finally { client.release(); }
}
function mutation(row: { practice_id: string; state: PracticeState; lock_version: number }): PracticeMutation {
  return { id: row.practice_id, state: row.state, lockVersion: row.lock_version };
}
const detailSql = `select p.id, p.state::text, p.lock_version,
  control.body control_target_text, truth.body present_truth_text, step.body next_right_step_text,
  outcome.body outcome_text, review.body review_text
 from public.practices p
 join public.journal_entries control on (control.id, control.user_id) = (p.control_target_entry_id, p.user_id)
 join public.journal_entries truth on (truth.id, truth.user_id) = (p.present_truth_entry_id, p.user_id)
 join public.journal_entries step on (step.id, step.user_id) = (p.next_right_step_entry_id, p.user_id)
 left join public.practice_returns pr on (pr.practice_id, pr.user_id) = (p.id, p.user_id)
 left join public.journal_entries outcome on (outcome.id, outcome.user_id) = (pr.outcome_entry_id, pr.user_id)
 left join public.journal_entries review on (review.id, review.user_id) = (pr.review_entry_id, pr.user_id)`;
function view(row: any): PracticeView { return { id: row.id, state: row.state, lockVersion: row.lock_version, controlTargetText: row.control_target_text, presentTruthText: row.present_truth_text, nextRightStepText: row.next_right_step_text, outcomeText: row.outcome_text, reviewText: row.review_text }; }

export function practiceRepository({ pool: suppliedPool }: { pool?: pg.Pool } = {}): PracticeRepository {
  const activePool = suppliedPool ?? databasePool();
  return {
    create: input => authenticated(activePool, input.actorId, async client => mutation((await client.query('select * from rts_private.save_become_practice($1,$2,$3)', [input.controlTargetText, input.presentTruthText, input.nextRightStepText])).rows[0])),
    recordReturn: input => authenticated(activePool, input.actorId, async client => mutation((await client.query('select practice_id, state, lock_version from rts_private.record_practice_return($1,$2,$3)', [input.practiceId, input.expectedLockVersion, input.outcomeText])).rows[0])),
    review: input => authenticated(activePool, input.actorId, async client => mutation((await client.query('select practice_id, state, lock_version from rts_private.review_practice($1,$2,$3)', [input.practiceId, input.expectedLockVersion, input.reviewText])).rows[0])),
    close: input => authenticated(activePool, input.actorId, async client => mutation((await client.query("select * from rts_private.transition_practice($1,'reviewed',$2,'closed')", [input.practiceId, input.expectedLockVersion])).rows[0])),
    get: (actorId, practiceId) => authenticated(activePool, actorId, async client => { const row = (await client.query(`${detailSql} where p.user_id=$1 and p.id=$2`, [actorId, practiceId])).rows[0]; return row ? view(row) : null; }),
    getUnfinished: actorId => authenticated(activePool, actorId, async client => { const row = (await client.query(`${detailSql} where p.user_id=$1 and p.state <> 'closed' order by p.updated_at desc limit 1`, [actorId])).rows[0]; return row ? view(row) : null; }),
  };
}
