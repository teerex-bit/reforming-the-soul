import pg from 'pg';
import type { DeepDiveModuleId, DeepDiveProgress, DeepDivePromptId } from '../../domain/deep-dive';

type Input = Readonly<{ actorId: string }>;
let pool: pg.Pool | undefined;

function databasePool() {
  const url = process.env.RTS_DATABASE_URL
    ?? process.env.DATABASE_URL
    ?? (process.env.RTS_TEST_MODE === '1' ? process.env.TEST_DATABASE_URL : undefined);
  if (!url) throw new Error('RTS_DATABASE_URL or DATABASE_URL is required for Deep Dive persistence.');
  return pool ??= new pg.Pool({ connectionString: url });
}

async function authenticated<T>(actorId: string, run: (client: pg.PoolClient) => Promise<T>) {
  const client = await databasePool().connect();
  try {
    await client.query('begin');
    await client.query('set local role authenticated');
    await client.query("select set_config('request.jwt.claims', $1, true)", [JSON.stringify({ sub: actorId })]);
    await client.query("select set_config('request.jwt.claim.sub', $1, true)", [actorId]);
    const result = await run(client);
    await client.query('commit');
    return result;
  } catch (error) {
    await client.query('rollback');
    throw error;
  } finally {
    client.release();
  }
}

export interface DeepDiveRepository {
  get(actorId: string, moduleId: DeepDiveModuleId, promptId: DeepDivePromptId): Promise<DeepDiveProgress | null>;
  saveSection(input: Input & { moduleId: DeepDiveModuleId; sectionId: string }): Promise<void>;
  saveReflection(input: Input & { moduleId: DeepDiveModuleId; promptId: DeepDivePromptId; body: string }): Promise<void>;
  deleteReflection(input: Input & { moduleId: DeepDiveModuleId; promptId: DeepDivePromptId }): Promise<void>;
  complete(input: Input & { moduleId: DeepDiveModuleId }): Promise<void>;
}

export function deepDiveRepository(): DeepDiveRepository {
  return {
    get: (actorId, moduleId, promptId) => authenticated(actorId, async client => {
      const row = (await client.query(
        `select p.id,p.last_section_id,p.completed_at,r.body
         from public.deep_dive_module_progress p
         left join public.deep_dive_reflections r
           on (r.progress_id,r.user_id)=(p.id,p.user_id) and r.prompt_id=$3
         where p.user_id=$1 and p.module_id=$2`,
        [actorId, moduleId, promptId],
      )).rows[0];
      return row ? {
        id: row.id,
        lastSectionId: row.last_section_id,
        completedAt: row.completed_at,
        reflection: row.body ?? null,
      } : null;
    }),

    saveSection: input => authenticated(input.actorId, async client => {
      await client.query(
        `insert into public.deep_dive_module_progress(user_id,curriculum_version_id,module_id,last_section_id)
         values($1,'phase-1-v1',$2,$3)
         on conflict(user_id,curriculum_version_id,module_id)
         do update set last_section_id=excluded.last_section_id,updated_at=now()`,
        [input.actorId, input.moduleId, input.sectionId],
      );
    }),

    saveReflection: input => authenticated(input.actorId, async client => {
      await client.query(
        `insert into public.deep_dive_module_progress(user_id,curriculum_version_id,module_id,last_section_id)
         values($1,'phase-1-v1',$2,'reflection')
         on conflict(user_id,curriculum_version_id,module_id) do update set updated_at=now()`,
        [input.actorId, input.moduleId],
      );
      await client.query(
        `insert into public.deep_dive_reflections(user_id,progress_id,prompt_id,body)
         select $1,id,$3,$4 from public.deep_dive_module_progress where user_id=$1 and module_id=$2
         on conflict(progress_id,prompt_id,user_id) do update set body=excluded.body,updated_at=now()`,
        [input.actorId, input.moduleId, input.promptId, input.body],
      );
    }),

    deleteReflection: input => authenticated(input.actorId, async client => {
      await client.query(
        `delete from public.deep_dive_reflections
         where user_id=$1 and prompt_id=$3
           and progress_id in (
             select id from public.deep_dive_module_progress where user_id=$1 and module_id=$2
           )`,
        [input.actorId, input.moduleId, input.promptId],
      );
    }),

    complete: input => authenticated(input.actorId, async client => {
      await client.query(
        `insert into public.deep_dive_module_progress(user_id,curriculum_version_id,module_id,last_section_id,completed_at)
         values($1,'phase-1-v1',$2,'carry-forward',now())
         on conflict(user_id,curriculum_version_id,module_id)
         do update set last_section_id='carry-forward',
                       completed_at=coalesce(public.deep_dive_module_progress.completed_at,now()),
                       updated_at=now()`,
        [input.actorId, input.moduleId],
      );
    }),
  };
}
