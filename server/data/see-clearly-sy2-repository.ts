import pg from 'pg';
import { SY2_MODULE_ID, SY2_REFLECTION_PROMPT_ID, sy2ChainFields, type SY2ChainField } from '../../domain/deep-dive';

export type SY2Chain = Readonly<Record<SY2ChainField, string | null> & { sourceSc1RecordId: string | null }>;
export type SY2Record = SY2Chain & Readonly<{ sourceWasLinked: boolean }>;
export type SY2Source = Readonly<{ id: string; eventFacts: string; automaticInterpretation: string }>;

let pool: pg.Pool | undefined;
function databasePool() {
  const url = process.env.RTS_DATABASE_URL ?? process.env.DATABASE_URL
    ?? (process.env.RTS_TEST_MODE === '1' ? process.env.TEST_DATABASE_URL : undefined);
  if (!url) throw new Error('RTS_DATABASE_URL or DATABASE_URL is required for SY2 persistence.');
  return pool ??= new pg.Pool({ connectionString: url });
}
async function authenticated<T>(actorId: string, run: (client: pg.PoolClient) => Promise<T>) {
  const client = await databasePool().connect();
  try {
    await client.query('begin');
    await client.query('set local role authenticated');
    await client.query("select set_config('request.jwt.claims',$1,true)", [JSON.stringify({ sub: actorId })]);
    await client.query("select set_config('request.jwt.claim.sub',$1,true)", [actorId]);
    const result = await run(client);
    await client.query('commit');
    return result;
  } catch (error) {
    await client.query('rollback');
    throw error;
  } finally { client.release(); }
}

export function seeClearlySY2Repository() {
  return {
    getRecord(actorId: string): Promise<SY2Record | null> {
      return authenticated(actorId, async client => {
        const row = (await client.query<SY2Record & { source_sc1_record_id: string | null; source_was_linked: boolean }>(
          `select source_sc1_record_id,source_was_linked,perception,belief,expectation,desire,intention,choice,outcome
           from public.see_clearly_sy2_records where user_id=$1 and module_id=$2`, [actorId, SY2_MODULE_ID],
        )).rows[0];
        if (!row) return null;
        return { sourceSc1RecordId: row.source_sc1_record_id, sourceWasLinked: row.source_was_linked,
          perception: row.perception, belief: row.belief, expectation: row.expectation, desire: row.desire,
          intention: row.intention, choice: row.choice, outcome: row.outcome };
      });
    },
    getSource(actorId: string): Promise<SY2Source | null> {
      return authenticated(actorId, async client => {
        const row = (await client.query<{ id: string; event_facts: string; automatic_interpretation: string }>(
          `select id,event_facts,automatic_interpretation from public.see_clearly_sc1_records
           where user_id=$1 and module_id='see-clearly.sc1'`, [actorId],
        )).rows[0];
        return row ? { id: row.id, eventFacts: row.event_facts, automaticInterpretation: row.automatic_interpretation } : null;
      });
    },
    saveSection(actorId: string, sectionId: string): Promise<void> {
      return authenticated(actorId, async client => {
        await client.query(`insert into public.deep_dive_module_progress(user_id,curriculum_version_id,module_id,last_section_id)
          values($1,'phase-1-v1',$2,$3) on conflict(user_id,curriculum_version_id,module_id)
          do update set last_section_id=excluded.last_section_id,updated_at=now()
          where public.deep_dive_module_progress.completed_at is null`, [actorId, SY2_MODULE_ID, sectionId]);
      });
    },
    saveChain(actorId: string, values: SY2Chain): Promise<void> {
      if (!sy2ChainFields.some(field => values[field]?.trim())) throw new Error('Enter a link before saving a trace.');
      return authenticated(actorId, async client => {
        if (values.sourceSc1RecordId) {
          const source = (await client.query(
            `select 1 from public.see_clearly_sc1_records where id=$1 and user_id=$2`,
            [values.sourceSc1RecordId, actorId],
          )).rowCount;
          if (!source) throw new Error('Choose a SY1 moment that belongs to you.');
        }
        await client.query(`insert into public.deep_dive_module_progress(user_id,curriculum_version_id,module_id,last_section_id)
          values($1,'phase-1-v1',$2,'distinction') on conflict(user_id,curriculum_version_id,module_id)
          do update set last_section_id='distinction',updated_at=now()
          where public.deep_dive_module_progress.completed_at is null`, [actorId, SY2_MODULE_ID]);
        const progress = (await client.query<{ id: string; completed_at: Date | null }>(
          `select id,completed_at from public.deep_dive_module_progress where user_id=$1 and module_id=$2 for update`,
          [actorId, SY2_MODULE_ID],
        )).rows[0];
        if (!progress) throw new Error('Open SY2 before saving a trace.');
        const text = sy2ChainFields.map(field => values[field]);
        await client.query(`insert into public.see_clearly_sy2_records
          (user_id,progress_id,source_sc1_record_id,source_was_linked,perception,belief,expectation,desire,intention,choice,outcome)
          values($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)
          on conflict(progress_id,user_id,module_id) do update set
          source_sc1_record_id=excluded.source_sc1_record_id,source_was_linked=excluded.source_was_linked,
          perception=excluded.perception,belief=excluded.belief,expectation=excluded.expectation,
          desire=excluded.desire,intention=excluded.intention,choice=excluded.choice,outcome=excluded.outcome,updated_at=now()`,
          [actorId, progress.id, values.sourceSc1RecordId, Boolean(values.sourceSc1RecordId), ...text],
        );
      });
    },
    saveReflection(actorId: string, body: string, advance: boolean): Promise<void> {
      return authenticated(actorId, async client => {
        const progress = (await client.query<{ id: string; completed_at: Date | null }>(
          `select id,completed_at from public.deep_dive_module_progress where user_id=$1 and module_id=$2 for update`,
          [actorId, SY2_MODULE_ID],
        )).rows[0];
        if (!progress) throw new Error('Open SY2 before reflecting.');
        await client.query(`insert into public.deep_dive_reflections(user_id,progress_id,prompt_id,body)
          values($1,$2,$3,$4) on conflict(progress_id,prompt_id,user_id)
          do update set body=excluded.body,updated_at=now()`, [actorId, progress.id, SY2_REFLECTION_PROMPT_ID, body]);
        if (advance && !progress.completed_at) await client.query(
          `update public.deep_dive_module_progress set last_section_id='practice',updated_at=now()
           where id=$1 and user_id=$2`, [progress.id, actorId],
        );
      });
    },
    complete(actorId: string): Promise<void> {
      return authenticated(actorId, async client => {
        await client.query(`insert into public.deep_dive_module_progress(user_id,curriculum_version_id,module_id,last_section_id,completed_at)
          values($1,'phase-1-v1',$2,'carry-forward',now())
          on conflict(user_id,curriculum_version_id,module_id) do update set
          last_section_id='carry-forward',completed_at=coalesce(public.deep_dive_module_progress.completed_at,now()),updated_at=now()
          where public.deep_dive_module_progress.completed_at is null`, [actorId, SY2_MODULE_ID]);
      });
    },
  };
}
