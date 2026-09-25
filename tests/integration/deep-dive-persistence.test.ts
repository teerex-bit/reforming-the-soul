import { randomUUID } from 'node:crypto';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import {
  A1_MODULE_ID,
  A1_REFLECTION_PROMPT_ID,
  A2_MODULE_ID,
  A2_REFLECTION_PROMPT_ID,
  A3_MODULE_ID,
  A3_REFLECTION_PROMPT_ID,
  A4_MODULE_ID,
  A4_REFLECTION_PROMPT_ID,
} from '../../domain/deep-dive';
import { deepDiveRepository } from '../../server/data/deep-dive-repository';
import { createTestPool, withAuthenticatedActor } from '../helpers/db';

const pool = createTestPool();
const repository = deepDiveRepository();
const ownerId = randomUUID();
const otherId = randomUUID();

beforeAll(async () => {
  for (const [id, email] of [[ownerId, `${ownerId}@rts.test`], [otherId, `${otherId}@rts.test`]]) {
    await pool.query(
      `insert into auth.users(id,instance_id,aud,role,email,encrypted_password,email_confirmed_at,
                            raw_app_meta_data,raw_user_meta_data,created_at,updated_at)
       values($1,'00000000-0000-0000-0000-000000000000','authenticated','authenticated',$2,'',now(),'{}','{}',now(),now())`,
      [id, email],
    );
  }
});

afterAll(async () => {
  await pool.query('delete from auth.users where id=any($1::uuid[])', [[ownerId, otherId]]);
  await pool.end();
});

describe('Deep Dive module persistence contract', () => {
  it('saves and resumes the existing A1 module and reflection unchanged', async () => {
    await repository.saveSection({ actorId: ownerId, moduleId: A1_MODULE_ID, sectionId: 'reflection' });
    await repository.saveReflection({
      actorId: ownerId,
      moduleId: A1_MODULE_ID,
      promptId: A1_REFLECTION_PROMPT_ID,
      body: 'A1 wording stays exact.',
    });

    await expect(repository.get(ownerId, A1_MODULE_ID, A1_REFLECTION_PROMPT_ID)).resolves.toMatchObject({
      lastSectionId: 'reflection',
      reflection: 'A1 wording stays exact.',
    });
  });

  it('saves and resumes A2 under its canonical module and first-response prompt IDs', async () => {
    await repository.saveSection({ actorId: ownerId, moduleId: A2_MODULE_ID, sectionId: 'first-response' });
    await repository.saveReflection({
      actorId: ownerId,
      moduleId: A2_MODULE_ID,
      promptId: A2_REFLECTION_PROMPT_ID,
      body: 'My first response was to withdraw.',
    });

    await expect(repository.get(ownerId, A2_MODULE_ID, A2_REFLECTION_PROMPT_ID)).resolves.toMatchObject({
      lastSectionId: 'first-response',
      reflection: 'My first response was to withdraw.',
    });
  });

  it('keeps progress and reflections invisible to another authenticated user', async () => {
    const result = await withAuthenticatedActor(pool, otherId, async client => client.query(
      `select p.module_id,r.prompt_id from public.deep_dive_module_progress p
       left join public.deep_dive_reflections r on (r.progress_id,r.user_id)=(p.id,p.user_id)
       where p.user_id=$1`,
      [ownerId],
    ));

    expect(result.rows).toEqual([]);
    await expect(repository.get(otherId, A2_MODULE_ID, A2_REFLECTION_PROMPT_ID)).resolves.toBeNull();
  });

  it('keeps A3 and A4 progress, completion, and reflections distinct from A1/A2', async () => {
    for (const [moduleId, promptId, body] of [
      [A3_MODULE_ID, A3_REFLECTION_PROMPT_ID, 'I may have learned to withdraw.'],
      [A4_MODULE_ID, A4_REFLECTION_PROMPT_ID, 'Withdrawal is not my identity.'],
    ] as const) {
      await repository.saveSection({ actorId: ownerId, moduleId, sectionId: 'reflection' });
      await repository.saveReflection({ actorId: ownerId, moduleId, promptId, body });
      await expect(repository.get(ownerId, moduleId, promptId)).resolves.toMatchObject({ lastSectionId: 'reflection', reflection: body, completedAt: null });
      await repository.complete({ actorId: ownerId, moduleId });
      await expect(repository.get(ownerId, moduleId, promptId)).resolves.toMatchObject({ lastSectionId: 'carry-forward', reflection: body });
      await expect(repository.get(otherId, moduleId, promptId)).resolves.toBeNull();
    }
    await expect(repository.get(ownerId, A1_MODULE_ID, A1_REFLECTION_PROMPT_ID)).resolves.toMatchObject({ reflection: 'A1 wording stays exact.' });
    await expect(repository.get(ownerId, A2_MODULE_ID, A2_REFLECTION_PROMPT_ID)).resolves.toMatchObject({ reflection: 'My first response was to withdraw.' });
  });
});
