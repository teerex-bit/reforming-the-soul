import { requireActor } from '../auth/require-actor';
import { deepDiveRepository } from '../data/deep-dive-repository';
import {
  A1_MODULE_ID,
  A1_REFLECTION_PROMPT_ID,
  A2_MODULE_ID,
  A2_REFLECTION_PROMPT_ID,
  type A1SectionId,
} from '../../domain/deep-dive';

export async function getA1() {
  const actor = await requireActor();
  return deepDiveRepository().get(actor.id, A1_MODULE_ID, A1_REFLECTION_PROMPT_ID);
}

export async function saveA1Section(sectionId: A1SectionId) {
  const actor = await requireActor();
  return deepDiveRepository().saveSection({ actorId: actor.id, moduleId: A1_MODULE_ID, sectionId });
}

export async function saveA1Reflection(body: string) {
  const actor = await requireActor();
  return deepDiveRepository().saveReflection({
    actorId: actor.id,
    moduleId: A1_MODULE_ID,
    promptId: A1_REFLECTION_PROMPT_ID,
    body,
  });
}

export async function deleteA1Reflection() {
  const actor = await requireActor();
  return deepDiveRepository().deleteReflection({
    actorId: actor.id,
    moduleId: A1_MODULE_ID,
    promptId: A1_REFLECTION_PROMPT_ID,
  });
}

export async function completeA1() {
  const actor = await requireActor();
  return deepDiveRepository().complete({ actorId: actor.id, moduleId: A1_MODULE_ID });
}

export async function getA2() {
  const actor = await requireActor();
  return deepDiveRepository().get(actor.id, A2_MODULE_ID, A2_REFLECTION_PROMPT_ID);
}

export async function saveA2Section(sectionId: string) {
  const actor = await requireActor();
  return deepDiveRepository().saveSection({ actorId: actor.id, moduleId: A2_MODULE_ID, sectionId });
}

export async function saveA2Reflection(body: string) {
  const actor = await requireActor();
  return deepDiveRepository().saveReflection({
    actorId: actor.id,
    moduleId: A2_MODULE_ID,
    promptId: A2_REFLECTION_PROMPT_ID,
    body,
  });
}

export async function deleteA2Reflection() {
  const actor = await requireActor();
  return deepDiveRepository().deleteReflection({
    actorId: actor.id,
    moduleId: A2_MODULE_ID,
    promptId: A2_REFLECTION_PROMPT_ID,
  });
}

export async function completeA2() {
  const actor = await requireActor();
  return deepDiveRepository().complete({ actorId: actor.id, moduleId: A2_MODULE_ID });
}
