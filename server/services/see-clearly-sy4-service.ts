import { requireActor } from '../auth/require-actor';
import { deepDiveRepository } from '../data/deep-dive-repository';
import { seeClearlySY4Repository } from '../data/see-clearly-sy4-repository';
import { SY4_MODULE_ID, SY4_REFLECTION_PROMPT_ID } from '../../domain/deep-dive';
export async function getSY4() {
  const actor = await requireActor();
  const repo = seeClearlySY4Repository();
  const [progress, record, source] = await Promise.all([
    deepDiveRepository().get(actor.id, SY4_MODULE_ID, SY4_REFLECTION_PROMPT_ID), repo.getRecord(actor.id), repo.getSource(actor.id),
  ]);
  return { progress, record, source };
}
export async function saveSY4Section(section: string) { const actor = await requireActor(); return seeClearlySY4Repository().saveSection(actor.id, section); }
export async function saveSY4Truth(wording: string, sourceId: string | null) { const actor = await requireActor(); return seeClearlySY4Repository().saveTruth(actor.id, wording, sourceId); }
export async function saveSY4Reflection(body: string, advance = true) { const actor = await requireActor(); return seeClearlySY4Repository().saveReflection(actor.id, body, advance); }
export async function completeSY4() { const actor = await requireActor(); return seeClearlySY4Repository().complete(actor.id); }
export async function deleteSY4Reflection() {
  const actor = await requireActor();
  return deepDiveRepository().deleteReflection({ actorId: actor.id, moduleId: SY4_MODULE_ID, promptId: SY4_REFLECTION_PROMPT_ID });
}
