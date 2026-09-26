import { requireActor } from '../auth/require-actor';
import { deepDiveRepository } from '../data/deep-dive-repository';
import { seeClearlySG3Repository } from '../data/see-clearly-sg3-repository';
import { SG3_MODULE_ID, SG3_REFLECTION_PROMPT_ID } from '../../domain/deep-dive';

export async function getSG3() {
  const actor = await requireActor();
  const repo = seeClearlySG3Repository();
  const [progress, record] = await Promise.all([
    deepDiveRepository().get(actor.id, SG3_MODULE_ID, SG3_REFLECTION_PROMPT_ID), repo.getRecord(actor.id),
  ]);
  return { progress, record };
}
export async function saveSG3Section(section: string) { const actor = await requireActor(); return seeClearlySG3Repository().saveSection(actor.id, section); }
export async function saveSG3Record(observation: string) { const actor = await requireActor(); return seeClearlySG3Repository().saveRecord(actor.id, observation); }
export async function deleteSG3Record() { const actor = await requireActor(); return seeClearlySG3Repository().deleteRecord(actor.id); }
export async function saveSG3Reflection(body: string, advance = true) { const actor = await requireActor(); return seeClearlySG3Repository().saveReflection(actor.id, body, advance); }
export async function completeSG3() { const actor = await requireActor(); return seeClearlySG3Repository().complete(actor.id); }
export async function deleteSG3Reflection() {
  const actor = await requireActor();
  return deepDiveRepository().deleteReflection({ actorId: actor.id, moduleId: SG3_MODULE_ID, promptId: SG3_REFLECTION_PROMPT_ID });
}
