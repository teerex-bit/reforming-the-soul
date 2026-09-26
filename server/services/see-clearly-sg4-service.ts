import { requireActor } from '../auth/require-actor';
import { deepDiveRepository } from '../data/deep-dive-repository';
import { seeClearlySG4Repository } from '../data/see-clearly-sg4-repository';
import { SG4_MODULE_ID, SG4_REFLECTION_PROMPT_ID } from '../../domain/deep-dive';

export async function getSG4() {
  const actor = await requireActor();
  const repo = seeClearlySG4Repository();
  const [progress, record] = await Promise.all([
    deepDiveRepository().get(actor.id, SG4_MODULE_ID, SG4_REFLECTION_PROMPT_ID), repo.getRecord(actor.id),
  ]);
  return { progress, record };
}
export async function saveSG4Section(section: string) { const actor = await requireActor(); return seeClearlySG4Repository().saveSection(actor.id, section); }
export async function saveSG4Record(situation: string, trustMeaning: string) { const actor = await requireActor(); return seeClearlySG4Repository().saveRecord(actor.id, situation, trustMeaning); }
export async function deleteSG4Record() { const actor = await requireActor(); return seeClearlySG4Repository().deleteRecord(actor.id); }
export async function saveSG4Reflection(body: string, advance = true) { const actor = await requireActor(); return seeClearlySG4Repository().saveReflection(actor.id, body, advance); }
export async function completeSG4() { const actor = await requireActor(); return seeClearlySG4Repository().complete(actor.id); }
export async function deleteSG4Reflection() {
  const actor = await requireActor();
  return deepDiveRepository().deleteReflection({ actorId: actor.id, moduleId: SG4_MODULE_ID, promptId: SG4_REFLECTION_PROMPT_ID });
}
