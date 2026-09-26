import pg from 'pg';
import { SG1_MODULE_ID, SG1_REFLECTION_PROMPT_ID } from '../../domain/deep-dive';

export type SG1Record = Readonly<{ learnedGodImage: string; sourceInfluenceNote: string | null }>;
let pool: pg.Pool | undefined;
function databasePool() {
  const url = process.env.RTS_DATABASE_URL ?? process.env.DATABASE_URL ?? (process.env.RTS_TEST_MODE === '1' ? process.env.TEST_DATABASE_URL : undefined);
  if (!url) throw new Error('Database URL is required for SG1 persistence.');
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
export function seeClearlySG1Repository() {
  return {
    getRecord(actorId: string): Promise<SG1Record | null> {
      return authenticated(actorId, async client => {
        const row = (await client.query<{ learned_god_image: string; source_influence_note: string | null }>(
          `select learned_god_image,source_influence_note from public.see_clearly_sg1_records where user_id=$1 and module_id=$2`, [actorId, SG1_MODULE_ID],
        )).rows[0];
        return row ? { learnedGodImage: row.learned_god_image, sourceInfluenceNote: row.source_influence_note } : null;
      });
    },
    saveSection(actorId: string, sectionId: string): Promise<void> {
      return authenticated(actorId, async client => {
        await client.query(`insert into public.deep_dive_module_progress(user_id,curriculum_version_id,module_id,last_section_id)
          values($1,'phase-1-v1',$2,$3) on conflict(user_id,curriculum_version_id,module_id)
          do update set last_section_id=excluded.last_section_id,updated_at=now()
          where public.deep_dive_module_progress.completed_at is null`, [actorId, SG1_MODULE_ID, sectionId]);
      });
    },
    saveImage(actorId: string, wording: string, influenceNote: string | null): Promise<void> {
      if (!wording.trim()) throw new Error('God-image wording is required to save.');
      return authenticated(actorId, async client => {
        await client.query(`insert into public.deep_dive_module_progress(user_id,curriculum_version_id,module_id,last_section_id)
          values($1,'phase-1-v1',$2,'reflection') on conflict(user_id,curriculum_version_id,module_id)
          do update set last_section_id='reflection',updated_at=now()
          where public.deep_dive_module_progress.completed_at is null`, [actorId, SG1_MODULE_ID]);
        const progress = (await client.query<{ id: string }>(
          `select id from public.deep_dive_module_progress where user_id=$1 and module_id=$2 for update`, [actorId, SG1_MODULE_ID],
        )).rows[0];
        await client.query(`insert into public.see_clearly_sg1_records(user_id,progress_id,learned_god_image,source_influence_note)
          values($1,$2,$3,$4) on conflict(progress_id,user_id,module_id) do update set
          learned_god_image=excluded.learned_god_image,source_influence_note=excluded.source_influence_note,updated_at=now()`,
        [actorId, progress.id, wording, influenceNote?.trim() ? influenceNote : null]);
      });
    },
    deleteImage(actorId: string): Promise<void> {
      return authenticated(actorId, async client => {
        await client.query(`delete from public.see_clearly_sg1_records where user_id=$1 and module_id=$2`, [actorId, SG1_MODULE_ID]);
      });
    },
    saveReflection(actorId: string, body: string, advance: boolean): Promise<void> {
      return authenticated(actorId, async client => {
        const progress = (await client.query<{ id: string; completed_at: Date | null }>(
          `select id,completed_at from public.deep_dive_module_progress where user_id=$1 and module_id=$2 for update`, [actorId, SG1_MODULE_ID],
        )).rows[0];
        if (!progress) throw new Error('Open SG1 before reflecting.');
        await client.query(`insert into public.deep_dive_reflections(user_id,progress_id,prompt_id,body)
          values($1,$2,$3,$4) on conflict(progress_id,prompt_id,user_id) do update set body=excluded.body,updated_at=now()`,
        [actorId, progress.id, SG1_REFLECTION_PROMPT_ID, body]);
        if (advance && !progress.completed_at) await client.query(`update public.deep_dive_module_progress set last_section_id='carry-forward',updated_at=now() where id=$1 and user_id=$2`, [progress.id, actorId]);
      });
    },
    complete(actorId: string): Promise<void> {
      return authenticated(actorId, async client => {
        await client.query(`insert into public.deep_dive_module_progress(user_id,curriculum_version_id,module_id,last_section_id,completed_at)
          values($1,'phase-1-v1',$2,'carry-forward',now()) on conflict(user_id,curriculum_version_id,module_id) do update set
          last_section_id='carry-forward',completed_at=coalesce(public.deep_dive_module_progress.completed_at,now()),updated_at=now()
          where public.deep_dive_module_progress.completed_at is null`, [actorId, SG1_MODULE_ID]);
      });
    },
  };
}
