import pg from 'pg';
import { SC1_MODULE_ID, SC1_REFLECTION_PROMPT_ID } from '../../domain/deep-dive';

export type SC1Record = Readonly<{ eventFacts: string; automaticInterpretation: string; sourceEntryId: string | null }>;
export type SC1Source = Readonly<{ id: string; body: string; createdAt: Date }>;

let pool: pg.Pool | undefined;
function databasePool() {
  const url = process.env.RTS_DATABASE_URL
    ?? process.env.DATABASE_URL
    ?? (process.env.RTS_TEST_MODE === '1' ? process.env.TEST_DATABASE_URL : undefined);
  if (!url) throw new Error('RTS_DATABASE_URL or DATABASE_URL is required for SC1 persistence.');
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

export function seeClearlySC1Repository() {
  return {
    getRecord(actorId: string): Promise<SC1Record | null> {
      return authenticated(actorId, async client => {
        const row = (await client.query<{ event_facts: string; automatic_interpretation: string; source_entry_id: string | null }>(
          `select r.event_facts,r.automatic_interpretation,r.source_entry_id
           from public.see_clearly_sc1_records r
           join public.deep_dive_module_progress p on (p.id,p.user_id,p.module_id)=(r.progress_id,r.user_id,r.module_id)
           where r.user_id=$1 and p.module_id=$2`, [actorId, SC1_MODULE_ID],
        )).rows[0];
        return row ? { eventFacts: row.event_facts, automaticInterpretation: row.automatic_interpretation, sourceEntryId: row.source_entry_id } : null;
      });
    },
    listSources(actorId: string): Promise<SC1Source[]> {
      return authenticated(actorId, async client => {
        const result = await client.query<{ id: string; body: string; created_at: Date }>(
          `select id,body,created_at from public.journal_entries
           where user_id=$1 and node_id='awaken.pay-attention.observe' and entry_kind='event'
           order by created_at desc limit 10`, [actorId],
        );
        return result.rows.map(row => ({ id: row.id, body: row.body, createdAt: row.created_at }));
      });
    },
    saveSection(actorId: string, sectionId: string): Promise<void> {
      return authenticated(actorId, async client => {
        if (['reflection', 'practice', 'carry-forward'].includes(sectionId)) {
          const prior = (await client.query(
            `select 1 from public.see_clearly_sc1_records where user_id=$1 limit 1`, [actorId],
          )).rowCount;
          if (!prior) throw new Error('Complete the SC1 interaction before continuing.');
        }
        await client.query(
          `insert into public.deep_dive_module_progress(user_id,curriculum_version_id,module_id,last_section_id)
           values($1,'phase-1-v1',$2,$3)
           on conflict(user_id,curriculum_version_id,module_id)
           do update set last_section_id=excluded.last_section_id,updated_at=now()
           where public.deep_dive_module_progress.completed_at is null`, [actorId, SC1_MODULE_ID, sectionId],
        );
      });
    },
    saveResponse(actorId: string, values: SC1Record): Promise<void> {
      return authenticated(actorId, async client => {
        if (values.sourceEntryId) {
          const source = (await client.query(
            `select 1 from public.journal_entries where id=$1 and user_id=$2
             and node_id='awaken.pay-attention.observe' and entry_kind='event'`, [values.sourceEntryId, actorId],
          )).rowCount;
          if (!source) throw new Error('Choose an Awaken moment that belongs to you.');
        }
        await client.query(
          `insert into public.deep_dive_module_progress(user_id,curriculum_version_id,module_id,last_section_id)
           values($1,'phase-1-v1',$2,'reflection')
           on conflict(user_id,curriculum_version_id,module_id)
           do update set last_section_id='reflection',updated_at=now()
           where public.deep_dive_module_progress.completed_at is null`, [actorId, SC1_MODULE_ID],
        );
        const progress = (await client.query<{ id: string; completed_at: Date | null }>(
          `select id,completed_at from public.deep_dive_module_progress
           where user_id=$1 and module_id=$2 for update`, [actorId, SC1_MODULE_ID],
        )).rows[0];
        if (!progress || progress.completed_at) throw new Error('SC1 review is read-only.');
        await client.query(
          `insert into public.see_clearly_sc1_records(user_id,progress_id,source_entry_id,event_facts,automatic_interpretation)
           values($1,$2,$3,$4,$5)
           on conflict(progress_id,user_id,module_id)
           do update set source_entry_id=excluded.source_entry_id,event_facts=excluded.event_facts,
                         automatic_interpretation=excluded.automatic_interpretation,updated_at=now()`,
          [actorId, progress.id, values.sourceEntryId, values.eventFacts, values.automaticInterpretation],
        );
      });
    },
    saveReflection(actorId: string, body: string): Promise<void> {
      return authenticated(actorId, async client => {
        const progress = (await client.query<{ id: string; completed_at: Date | null }>(
          `select p.id,p.completed_at from public.deep_dive_module_progress p
           join public.see_clearly_sc1_records r on (r.progress_id,r.user_id,r.module_id)=(p.id,p.user_id,p.module_id)
           where p.user_id=$1 and p.module_id=$2 for update of p`, [actorId, SC1_MODULE_ID],
        )).rows[0];
        if (!progress || progress.completed_at) throw new Error('Complete the SC1 interaction before reflecting.');
        await client.query(
          `insert into public.deep_dive_reflections(user_id,progress_id,prompt_id,body)
           values($1,$2,$3,$4)
           on conflict(progress_id,prompt_id,user_id) do update set body=excluded.body,updated_at=now()`,
          [actorId, progress.id, SC1_REFLECTION_PROMPT_ID, body],
        );
        await client.query(
          `update public.deep_dive_module_progress set last_section_id='practice',updated_at=now()
           where id=$1 and user_id=$2`, [progress.id, actorId],
        );
      });
    },
    editReflection(actorId: string, body: string): Promise<void> {
      return authenticated(actorId, async client => {
        const progress = (await client.query<{ id: string }>(
          `select p.id from public.deep_dive_module_progress p
           join public.see_clearly_sc1_records r
             on (r.progress_id,r.user_id,r.module_id)=(p.id,p.user_id,p.module_id)
           where p.user_id=$1 and p.module_id=$2`, [actorId, SC1_MODULE_ID],
        )).rows[0];
        if (!progress) throw new Error('Complete the SC1 moment before reflecting.');
        await client.query(
          `insert into public.deep_dive_reflections(user_id,progress_id,prompt_id,body)
           values($1,$2,$3,$4)
           on conflict(progress_id,prompt_id,user_id)
           do update set body=excluded.body,updated_at=now()`,
          [actorId, progress.id, SC1_REFLECTION_PROMPT_ID, body],
        );
      });
    },
    complete(actorId: string): Promise<void> {
      return authenticated(actorId, async client => {
        const progress = (await client.query<{ id: string }>(
          `select p.id from public.deep_dive_module_progress p
           join public.see_clearly_sc1_records r on (r.progress_id,r.user_id,r.module_id)=(p.id,p.user_id,p.module_id)
           where p.user_id=$1 and p.module_id=$2 for update of p`, [actorId, SC1_MODULE_ID],
        )).rows[0];
        if (!progress) throw new Error('Complete the SC1 interaction before finishing the lesson.');
        await client.query(
          `update public.deep_dive_module_progress
           set last_section_id='carry-forward',completed_at=coalesce(completed_at,now()),updated_at=now()
           where id=$1 and user_id=$2 and completed_at is null`, [progress.id, actorId],
        );
      });
    },
  };
}
