import { requireActor } from '../auth/require-actor';
import { deepDiveRepository } from '../data/deep-dive-repository';
import { seeClearlySC1Repository, type SC1Record } from '../data/see-clearly-sc1-repository';
import { SC1_MODULE_ID, SC1_REFLECTION_PROMPT_ID } from '../../domain/deep-dive';

export async function getSC1() {
  const actor = await requireActor();
  const repository = seeClearlySC1Repository();
  const [progress, record, sources] = await Promise.all([
    deepDiveRepository().get(actor.id, SC1_MODULE_ID, SC1_REFLECTION_PROMPT_ID),
    repository.getRecord(actor.id), repository.listSources(actor.id),
  ]);
  return { progress, record, sources };
}

export async function saveSC1Section(sectionId: string) {
  const actor = await requireActor();
  return seeClearlySC1Repository().saveSection(actor.id, sectionId);
}

export async function saveSC1Response(values: SC1Record) {
  if (!values.eventFacts.trim() || !values.automaticInterpretation.trim()) {
    throw new Error('Write what happened and the meaning you gave it.');
  }
  const actor = await requireActor();
  return seeClearlySC1Repository().saveResponse(actor.id, values);
}

export async function saveSC1Reflection(body: string) {
  if (!body.trim()) throw new Error('Write a reflection or continue without writing.');
  const actor = await requireActor();
  return seeClearlySC1Repository().saveReflection(actor.id, body);
}

export async function editSC1Reflection(body: string) {
  if (!body.trim()) throw new Error('Write a reflection before saving.');
  const actor = await requireActor();
  return seeClearlySC1Repository().editReflection(actor.id, body.trim());
}

export async function completeSC1() {
  const actor = await requireActor();
  return seeClearlySC1Repository().complete(actor.id);
}
