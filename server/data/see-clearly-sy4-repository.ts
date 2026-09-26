import pg from 'pg';
import { SY4_MODULE_ID, SY4_REFLECTION_PROMPT_ID } from '../../domain/deep-dive';

export type SY4Record = Readonly<{ truthToLiveFrom: string; sourceSy3RecordId: string | null; sourceWasLinked: boolean }>;
export type SY4Source = Readonly<{ id: string; selfStoryHypothesis: string }>; 
let pool: pg.Pool | undefined;
function databasePool() {
  const url = process.env.RTS_DATABASE_URL ?? process.env.DATABASE_URL ?? (process.env.RTS_TEST_MODE === '1' ? process.env.TEST_DATABASE_URL : undefined);
  if (!url) throw new Error('Database URL is required for SY4 persistence.');
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
  } catch (error) { await client.query('rollback'); throw error; }
  finally { client.release(); }
}
export function seeClearlySY4Repository() {
  return {
    getRecord(actorId: string): Promise<SY4Record | null> {
      return authenticated(actorId, async client => {
        const row = (await client.query<{ truth_to_live_from: string; source_sy3_record_id: string | null; source_was_linked: boolean }>(
          `select truth_to_live_from,source_sy3_record_id,source_was_linked from public.see_clearly_sy4_records where user_id=$1 and module_id=$2`, [actorId, SY4_MODULE_ID],
        )).rows[0];
        return row ? { truthToLiveFrom: row.truth_to_live_from, sourceSy3RecordId: row.source_sy3_record_id, sourceWasLinked: row.source_was_linked } : null;
      });
    },
    getSource(actorId: string): Promise<SY4Source | null> {
      return authenticated(actorId, async client => {
        const row = (await client.query<SY4Source>(
          `select id,self_story_hypothesis as "selfStoryHypothesis" from public.see_clearly_sy3_records where user_id=$1 and module_id='see-clearly.sy3'`, [actorId],
        )).rows[0];
        return row ?? null;
      });
    },
    saveSection(actorId: string, sectionId: string): Promise<void> {
      return authenticated(actorId, async client => {
        await client.query(`insert into public.deep_dive_module_progress(user_id,curriculum_version_id,module_id,last_section_id)
          values($1,'phase-1-v1',$2,$3) on conflict(user_id,curriculum_version_id,module_id)
          do update set last_section_id=excluded.last_section_id,updated_at=now()
          where public.deep_dive_module_progress.completed_at is null`, [actorId, SY4_MODULE_ID, sectionId]);
      });
    },
    saveTruth(actorId: string, wording: string, sourceId: string | null): Promise<void> {
      if (!wording.trim()) throw new Error('A truth statement is required to save.');
      return authenticated(actorId, async client => {
        if (sourceId) {
          const source = await client.query(`select 1 from public.see_clearly_sy3_records where id=$1 and user_id=$2`, [sourceId, actorId]);
          if (!source.rowCount) throw new Error('Selected source is unavailable.');
        }
        await client.query(`insert into public.deep_dive_module_progress(user_id,curriculum_version_id,module_id,last_section_id)
          values($1,'phase-1-v1',$2,'reflection') on conflict(user_id,curriculum_version_id,module_id)
          do update set last_section_id='reflection',updated_at=now()
          where public.deep_dive_module_progress.completed_at is null`, [actorId, SY4_MODULE_ID]);
        const progress = (await client.query<{ id: string }>(
          `select id from public.deep_dive_module_progress where user_id=$1 and module_id=$2 for update`, [actorId, SY4_MODULE_ID],
        )).rows[0];
        await client.query(`insert into public.see_clearly_sy4_records(user_id,progress_id,source_sy3_record_id,source_was_linked,truth_to_live_from)
          values($1,$2,$3,$4,$5) on conflict(progress_id,user_id,module_id) do update set
          source_sy3_record_id=excluded.source_sy3_record_id,
          source_was_linked=public.see_clearly_sy4_records.source_was_linked or excluded.source_was_linked,
          truth_to_live_from=excluded.truth_to_live_from,updated_at=now()`,
        [actorId, progress.id, sourceId, Boolean(sourceId), wording]);
      });
    },
    saveReflection(actorId: string, body: string, advance: boolean): Promise<void> {
      return authenticated(actorId, async client => {
        const progress = (await client.query<{ id: string; completed_at: Date | null }>(
          `select id,completed_at from public.deep_dive_module_progress where user_id=$1 and module_id=$2 for update`, [actorId, SY4_MODULE_ID],
        )).rows[0];
        if (!progress) throw new Error('Open SY4 before reflecting.');
        await client.query(`insert into public.deep_dive_reflections(user_id,progress_id,prompt_id,body)
          values($1,$2,$3,$4) on conflict(progress_id,prompt_id,user_id) do update set body=excluded.body,updated_at=now()`,
        [actorId, progress.id, SY4_REFLECTION_PROMPT_ID, body]);
        if (advance && !progress.completed_at) await client.query(`update public.deep_dive_module_progress set last_section_id='carry-forward',updated_at=now() where id=$1 and user_id=$2`, [progress.id, actorId]);
      });
    },
    complete(actorId: string): Promise<void> {
      return authenticated(actorId, async client => {
        await client.query(`insert into public.deep_dive_module_progress(user_id,curriculum_version_id,module_id,last_section_id,completed_at)
          values($1,'phase-1-v1',$2,'carry-forward',now()) on conflict(user_id,curriculum_version_id,module_id) do update set
          last_section_id='carry-forward',completed_at=coalesce(public.deep_dive_module_progress.completed_at,now()),updated_at=now()
          where public.deep_dive_module_progress.completed_at is null`, [actorId, SY4_MODULE_ID]);
      });
    },
  };
}
