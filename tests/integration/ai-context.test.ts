import { randomUUID } from 'node:crypto';
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';
import { createTestPool } from '../helpers/db';
import { aiReflectRepository } from '../../server/data/ai-reflect-repository';
import { currentReflectFingerprint, reflectOnCurrentEntry, saveConfirmedReflectInsight } from '../../server/services/ai-reflect-service';
import { REFLECT_VERSIONS } from '../../server/ai/context-builder';
import { curriculumRepository } from '../../server/data/curriculum-repository';
import { saveAwakenObservation } from '../../server/services/observation-service';

const pool = createTestPool();
const actors: string[] = [];
async function actorAtReflect() {
  const id = randomUUID(); actors.push(id);
  await pool.query(`insert into auth.users (id,instance_id,aud,role,email,encrypted_password,email_confirmed_at,raw_app_meta_data,raw_user_meta_data,created_at,updated_at)
    values ($1,'00000000-0000-0000-0000-000000000000','authenticated','authenticated',$2,'',now(),'{}','{}',now(),now())`, [id, `${id}@rts.test`]);
  await saveAwakenObservation(
    { eventText: 'event exact', internalResponseText: 'inside exact', bodyCueText: 'body exact' },
    { repository: curriculumRepository({ pool }), actorClient: clientFor(id) },
  );
  return id;
}
const clientFor = (id: string) => ({ auth: { getUser: async () => ({ data: { user: { id, email: null } }, error: null }) } });

beforeAll(async () => undefined);
afterAll(async () => { for (const id of actors) await pool.query('delete from auth.users where id=$1', [id]); await pool.end(); });

describe('current-entry AI Reflect persistence boundary', () => {
  it('materializes only the authenticated owner current entries and stores content-free terminal metadata', async () => {
    const actor = await actorAtReflect();
    const provider = { respond: vi.fn().mockResolvedValue({ kind: 'success', value: { questions: ['What stood out most in that moment?'] }, providerRequestId: 'not-persisted' }) };
    const result = await reflectOnCurrentEntry({ intentId: randomUUID() }, { repository: aiReflectRepository({ pool }), provider, actorClient: clientFor(actor) });
    expect(result).toMatchObject({ kind: 'success' });
    const captured = provider.respond.mock.calls[0][0];
    expect(JSON.stringify(captured)).toContain('event exact');
    expect(JSON.stringify(captured)).not.toContain('selected_prior');
    const rows = await pool.query<Record<string, unknown>>('select * from public.ai_threads where user_id=$1', [actor]);
    expect(rows.rows).toHaveLength(1);
    expect(rows.rows[0].status).toBe('success');
    expect(Object.keys(rows.rows[0])).not.toEqual(expect.arrayContaining(['prompt', 'response', 'transcript', 'provider_conversation_id', 'journal_body']));
    expect(JSON.stringify(rows.rows[0])).not.toContain('not-persisted');
  });

  it('allows exactly one provider dispatch across concurrent matching intents', async () => {
    const actor = await actorAtReflect();
    const intentId = randomUUID();
    let release!: () => void;
    const gate = new Promise<void>(resolve => { release = resolve; });
    const provider = { respond: vi.fn(async () => { await gate; return { kind: 'success' as const, value: { questions: ['What did you notice?'] }, providerRequestId: null }; }) };
    const deps = { repository: aiReflectRepository({ pool }), provider, actorClient: clientFor(actor) };
    const first = reflectOnCurrentEntry({ intentId }, deps);
    while (provider.respond.mock.calls.length === 0) await new Promise(resolve => setTimeout(resolve, 5));
    const second = await reflectOnCurrentEntry({ intentId }, deps);
    expect(second).toMatchObject({ kind: 'in_progress' });
    release();
    await expect(first).resolves.toMatchObject({ kind: 'success' });
    await expect(reflectOnCurrentEntry({ intentId }, deps)).resolves.toMatchObject({ kind: 'already_completed' });
    expect(provider.respond).toHaveBeenCalledTimes(1);
  });

  it('terminalizes an abandoned pending lease without redispatch and keeps completion race-safe', async () => {
    const actor = await actorAtReflect();
    const repository = aiReflectRepository({ pool });
    const intentId = randomUUID();
    const input = { actorId: actor, intentId, requestFingerprint: currentReflectFingerprint(), ...REFLECT_VERSIONS };
    const first = await repository.reserve(input);
    if (first.kind !== 'dispatch') throw new Error('expected initial dispatch reservation');
    await pool.query("update public.ai_threads set updated_at=now()-interval '10 minutes' where id=$1", [first.threadId]);

    const raced = await Promise.allSettled([
      repository.reserve(input),
      repository.complete({ actorId: actor, threadId: first.threadId, status: 'success', durationMs: 1 }),
    ]);
    expect(raced[0]).toMatchObject({ status: 'fulfilled', value: { kind: 'already_completed', threadId: first.threadId } });
    const row = await pool.query<{ status: string }>('select status::text from public.ai_threads where id=$1', [first.threadId]);
    expect(['success', 'provider_error']).toContain(row.rows[0].status);
    await expect(repository.reserve(input)).resolves.toEqual({ kind: 'already_completed', threadId: first.threadId });
  });

  it('resolves a completed matching intent after curriculum has advanced', async () => {
    const actor = await actorAtReflect();
    const repository = aiReflectRepository({ pool });
    const input = { actorId: actor, intentId: randomUUID(), requestFingerprint: currentReflectFingerprint(), ...REFLECT_VERSIONS };
    const first = await repository.reserve(input);
    if (first.kind !== 'dispatch') throw new Error('expected initial dispatch reservation');
    await repository.complete({ actorId: actor, threadId: first.threadId, status: 'success', durationMs: 1 });
    await pool.query("update public.user_curriculum_state set current_node_id='bridge.awaken-see-clearly' where user_id=$1", [actor]);
    await expect(repository.reserve(input)).resolves.toEqual({ kind: 'already_completed', threadId: first.threadId });
  });

  it('rejects a conflicting fingerprint after curriculum has advanced', async () => {
    const actor = await actorAtReflect();
    const repository = aiReflectRepository({ pool });
    const input = { actorId: actor, intentId: randomUUID(), requestFingerprint: currentReflectFingerprint(), ...REFLECT_VERSIONS };
    const first = await repository.reserve(input);
    if (first.kind !== 'dispatch') throw new Error('expected initial dispatch reservation');
    await repository.complete({ actorId: actor, threadId: first.threadId, status: 'success', durationMs: 1 });
    await pool.query("update public.user_curriculum_state set current_node_id='bridge.awaken-see-clearly' where user_id=$1", [actor]);
    await expect(repository.reserve({ ...input, requestFingerprint: 'different' })).rejects.toMatchObject({ code: '23514' });
  });

  it('terminalizes a stale pending matching intent after curriculum has advanced', async () => {
    const actor = await actorAtReflect();
    const repository = aiReflectRepository({ pool });
    const input = { actorId: actor, intentId: randomUUID(), requestFingerprint: currentReflectFingerprint(), ...REFLECT_VERSIONS };
    const first = await repository.reserve(input);
    if (first.kind !== 'dispatch') throw new Error('expected initial dispatch reservation');
    await pool.query("update public.ai_threads set updated_at=now()-interval '10 minutes' where id=$1", [first.threadId]);
    await pool.query("update public.user_curriculum_state set current_node_id='bridge.awaken-see-clearly' where user_id=$1", [actor]);
    await expect(repository.reserve(input)).resolves.toEqual({ kind: 'already_completed', threadId: first.threadId });
    await expect(pool.query('select status::text from public.ai_threads where id=$1', [first.threadId]))
      .resolves.toMatchObject({ rows: [{ status: 'provider_error' }] });
  });

  it('rechecks Reflect eligibility after acquiring the same actor curriculum lock as insight save', async () => {
    const actor = await actorAtReflect();
    const blocker = await pool.connect();
    try {
      await blocker.query('begin');
      await blocker.query('set local role authenticated');
      await blocker.query("select set_config('request.jwt.claim.sub',$1,true)", [actor]);
      await blocker.query("select pg_advisory_xact_lock(hashtextextended($1,0))", [`${actor}:phase-1-v1`]);

      const reservation = aiReflectRepository({ pool }).reserve({
        actorId: actor, intentId: randomUUID(), requestFingerprint: currentReflectFingerprint(), ...REFLECT_VERSIONS,
      });
      let waiting = false;
      for (let attempt = 0; attempt < 50 && !waiting; attempt += 1) {
        const activity = await pool.query<{ waiting: boolean }>(
          `select exists(select 1 from pg_stat_activity where query like '%rts_private.reserve_ai_reflect%'
             and wait_event_type='Lock' and pid<>pg_backend_pid()) as waiting`,
        );
        waiting = activity.rows[0].waiting;
        if (!waiting) await new Promise(resolve => setTimeout(resolve, 10));
      }
      expect(waiting).toBe(true);
      await blocker.query("update public.user_curriculum_state set current_node_id='bridge.awaken-see-clearly' where user_id=$1", [actor]);
      await blocker.query('commit');
      await expect(reservation).resolves.toEqual({ kind: 'unavailable' });
      expect(await pool.query('select * from public.ai_threads where user_id=$1', [actor])).toMatchObject({ rows: [] });
    } finally {
      try { await blocker.query('rollback'); } catch { /* transaction may already be committed */ }
      blocker.release();
    }
  });

  it('rejects reuse of an owner intent with a different fingerprint', async () => {
    const actor = await actorAtReflect();
    const repository = aiReflectRepository({ pool });
    const intentId = randomUUID();
    const base = { actorId: actor, intentId, requestFingerprint: currentReflectFingerprint(), ...REFLECT_VERSIONS };
    await expect(repository.reserve(base)).resolves.toMatchObject({ kind: 'dispatch' });
    await expect(repository.reserve({ ...base, requestFingerprint: 'different' })).rejects.toMatchObject({ code: '23514' });
  });

  it('rejects cross-owner completion of another user reservation', async () => {
    const owner = await actorAtReflect();
    const other = await actorAtReflect();
    const repository = aiReflectRepository({ pool });
    const reserved = await repository.reserve({ actorId: owner, intentId: randomUUID(), requestFingerprint: currentReflectFingerprint(), ...REFLECT_VERSIONS });
    if (reserved.kind !== 'dispatch') throw new Error('expected dispatch reservation');
    await expect(repository.complete({ actorId: other, threadId: reserved.threadId, status: 'success', durationMs: 1 }))
      .rejects.toMatchObject({ code: '42501' });
  });

  it('does not dispatch for an authenticated user without owned current context', async () => {
    const owner = await actorAtReflect();
    const other = randomUUID(); actors.push(other);
    await pool.query(`insert into auth.users (id,instance_id,aud,role,email,encrypted_password,email_confirmed_at,raw_app_meta_data,raw_user_meta_data,created_at,updated_at)
      values ($1,'00000000-0000-0000-0000-000000000000','authenticated','authenticated',$2,'',now(),'{}','{}',now(),now())`, [other, `${other}@rts.test`]);
    const provider = { respond: vi.fn() };
    await expect(reflectOnCurrentEntry({ intentId: randomUUID() }, { repository: aiReflectRepository({ pool }), provider, actorClient: clientFor(other) }))
      .resolves.toEqual({ kind: 'unavailable' });
    expect(provider.respond).not.toHaveBeenCalled();
    expect(owner).not.toBe(other);
  });

  it('saves only separately confirmed exact wording and advances curriculum independently', async () => {
    const actor = await actorAtReflect();
    const repository = aiReflectRepository({ pool });
    const provider = { respond: vi.fn().mockResolvedValue({ kind: 'success', value: { questions: ['What did you notice?'] }, providerRequestId: null }) };
    const reflected = await reflectOnCurrentEntry({ intentId: randomUUID() }, { repository, provider, actorClient: clientFor(actor) });
    if (reflected.kind !== 'success') throw new Error('expected successful fixture reflection');
    await saveConfirmedReflectInsight({ threadId: reflected.threadId, insightText: '  I was bracing.  ' }, { repository, actorClient: clientFor(actor) });
    const entries = await pool.query<{ body: string }>("select body from public.journal_entries where user_id=$1 and entry_kind='added_insight'", [actor]);
    expect(entries.rows).toEqual([{ body: '  I was bracing.  ' }]);
    const state = await pool.query<{ current_node_id: string }>('select current_node_id from public.user_curriculum_state where user_id=$1', [actor]);
    expect(state.rows).toEqual([{ current_node_id: 'bridge.awaken-see-clearly' }]);
    expect(JSON.stringify(await pool.query('select * from public.ai_artifacts where user_id=$1', [actor]))).not.toContain('I was bracing');
  });

  it.each([
    ['refusal', { kind: 'refusal', safeMessage: 'safe refusal' }],
    ['incomplete', { kind: 'incomplete', reason: 'max_output_tokens' }],
    ['invalid', { kind: 'invalid', issues: ['wrong shape'] }],
    ['timeout', { kind: 'timeout' }],
    ['provider_error', { kind: 'provider_error', retryable: true }],
  ] as const)('stores only content-free %s outcome metadata', async (expected, providerResult) => {
    const actor = await actorAtReflect();
    const provider = { respond: vi.fn().mockResolvedValue(providerResult) };
    await expect(reflectOnCurrentEntry({ intentId: randomUUID() }, {
      repository: aiReflectRepository({ pool }), provider, actorClient: clientFor(actor),
    })).resolves.toMatchObject({ kind: expected });
    const threads = await pool.query<Record<string, unknown>>('select * from public.ai_threads where user_id=$1', [actor]);
    expect(threads.rows).toHaveLength(1);
    expect(threads.rows[0].status).toBe(expected);
    expect(JSON.stringify(threads.rows[0])).not.toContain('safe refusal');
    expect(await pool.query('select * from public.ai_artifacts where user_id=$1', [actor])).toMatchObject({ rows: [] });
  });
});
