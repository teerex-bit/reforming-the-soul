import { requireActor } from '../auth/require-actor';
import { deepDiveRepository } from '../data/deep-dive-repository';
import { seeClearlySG1Repository } from '../data/see-clearly-sg1-repository';
import { SG1_MODULE_ID, SG1_REFLECTION_PROMPT_ID } from '../../domain/deep-dive';

export async function getSG1() {
  const actor = await requireActor();
  const repo = seeClearlySG1Repository();
  const [progress, record] = await Promise.all([
    deepDiveRepository().get(actor.id, SG1_MODULE_ID, SG1_REFLECTION_PROMPT_ID), repo.getRecord(actor.id),
  ]);
  return { progress, record };
}
export async function saveSG1Section(section: string) { const actor = await requireActor(); return seeClearlySG1Repository().saveSection(actor.id, section); }
export async function saveSG1Image(wording: string, influenceNote: string | null) { const actor = await requireActor(); return seeClearlySG1Repository().saveImage(actor.id, wording, influenceNote); }
export async function deleteSG1Image() { const actor = await requireActor(); return seeClearlySG1Repository().deleteImage(actor.id); }
export async function saveSG1Reflection(body: string, advance = true) { const actor = await requireActor(); return seeClearlySG1Repository().saveReflection(actor.id, body, advance); }
export async function completeSG1() { const actor = await requireActor(); return seeClearlySG1Repository().complete(actor.id); }
export async function deleteSG1Reflection() {
  const actor = await requireActor();
  return deepDiveRepository().deleteReflection({ actorId: actor.id, moduleId: SG1_MODULE_ID, promptId: SG1_REFLECTION_PROMPT_ID });
}
