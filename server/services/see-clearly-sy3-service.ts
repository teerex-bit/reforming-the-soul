import { requireActor } from '../auth/require-actor';
import { deepDiveRepository } from '../data/deep-dive-repository';
import { seeClearlySY3Repository } from '../data/see-clearly-sy3-repository';
import { SY3_MODULE_ID, SY3_REFLECTION_PROMPT_ID } from '../../domain/deep-dive';
export async function getSY3() {
  const actor = await requireActor();
  const repo = seeClearlySY3Repository();
  const [progress, record, source] = await Promise.all([
    deepDiveRepository().get(actor.id, SY3_MODULE_ID, SY3_REFLECTION_PROMPT_ID), repo.getRecord(actor.id), repo.getSource(actor.id),
  ]);
  return { progress, record, source };
}
export async function saveSY3Section(section: string) { const actor = await requireActor(); return seeClearlySY3Repository().saveSection(actor.id, section); }
export async function saveSY3Story(wording: string, sourceId: string | null) { const actor = await requireActor(); return seeClearlySY3Repository().saveStory(actor.id, wording, sourceId); }
export async function saveSY3Reflection(body: string, advance = true) { const actor = await requireActor(); return seeClearlySY3Repository().saveReflection(actor.id, body, advance); }
export async function completeSY3() { const actor = await requireActor(); return seeClearlySY3Repository().complete(actor.id); }
export async function deleteSY3Reflection() {
  const actor = await requireActor();
  return deepDiveRepository().deleteReflection({ actorId: actor.id, moduleId: SY3_MODULE_ID, promptId: SY3_REFLECTION_PROMPT_ID });
}
