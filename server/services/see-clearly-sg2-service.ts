import { requireActor } from '../auth/require-actor';
import { deepDiveRepository } from '../data/deep-dive-repository';
import { seeClearlySG2Repository } from '../data/see-clearly-sg2-repository';
import { SG2_MODULE_ID, SG2_REFLECTION_PROMPT_ID } from '../../domain/deep-dive';

export async function getSG2() {
  const actor = await requireActor();
  const repo = seeClearlySG2Repository();
  const [progress, record] = await Promise.all([
    deepDiveRepository().get(actor.id, SG2_MODULE_ID, SG2_REFLECTION_PROMPT_ID), repo.getRecord(actor.id),
  ]);
  return { progress, record };
}
export async function saveSG2Section(section: string) { const actor = await requireActor(); return seeClearlySG2Repository().saveSection(actor.id, section); }
export async function saveSG2Record(situation: string, expectation: string) { const actor = await requireActor(); return seeClearlySG2Repository().saveRecord(actor.id, situation, expectation); }
export async function deleteSG2Record() { const actor = await requireActor(); return seeClearlySG2Repository().deleteRecord(actor.id); }
export async function saveSG2Reflection(body: string, advance = true) { const actor = await requireActor(); return seeClearlySG2Repository().saveReflection(actor.id, body, advance); }
export async function completeSG2() { const actor = await requireActor(); return seeClearlySG2Repository().complete(actor.id); }
export async function deleteSG2Reflection() {
  const actor = await requireActor();
  return deepDiveRepository().deleteReflection({ actorId: actor.id, moduleId: SG2_MODULE_ID, promptId: SG2_REFLECTION_PROMPT_ID });
}
