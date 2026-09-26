import { requireActor } from '../auth/require-actor';
import { deepDiveRepository } from '../data/deep-dive-repository';
import { seeClearlySY2Repository, type SY2Chain } from '../data/see-clearly-sy2-repository';
import { SY2_MODULE_ID, SY2_REFLECTION_PROMPT_ID, sy2ChainFields } from '../../domain/deep-dive';

export async function getSY2() {
  const actor = await requireActor();
  const repository = seeClearlySY2Repository();
  const [progress, record, source] = await Promise.all([
    deepDiveRepository().get(actor.id, SY2_MODULE_ID, SY2_REFLECTION_PROMPT_ID),
    repository.getRecord(actor.id), repository.getSource(actor.id),
  ]);
  return { progress, record, source };
}
export async function saveSY2Section(sectionId: string) {
  const actor = await requireActor();
  return seeClearlySY2Repository().saveSection(actor.id, sectionId);
}
export async function saveSY2Chain(values: SY2Chain) {
  if (!sy2ChainFields.some(field => values[field]?.trim())) throw new Error('Enter a link before saving a trace.');
  const actor = await requireActor();
  return seeClearlySY2Repository().saveChain(actor.id, values);
}
export async function saveSY2Reflection(body: string, advance = true) {
  if (!body.trim()) throw new Error('Write a reflection or continue without writing.');
  const actor = await requireActor();
  return seeClearlySY2Repository().saveReflection(actor.id, body.trim(), advance);
}
export async function completeSY2() {
  const actor = await requireActor();
  return seeClearlySY2Repository().complete(actor.id);
}
