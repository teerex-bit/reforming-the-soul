import { requireActor } from '../auth/require-actor';
import { deepDiveRepository } from '../data/deep-dive-repository';
import {
  A1_MODULE_ID,
  A1_REFLECTION_PROMPT_ID,
  A2_MODULE_ID,
  A2_REFLECTION_PROMPT_ID,
  A3_MODULE_ID,
  A3_REFLECTION_PROMPT_ID,
  A4_MODULE_ID,
  A4_REFLECTION_PROMPT_ID,
  type A1SectionId,
  type DeepDiveModuleId,
  type DeepDivePromptId,
} from '../../domain/deep-dive';

export async function editDeepDiveReflection(moduleId: DeepDiveModuleId, promptId: DeepDivePromptId, body: string) {
  if (!body.trim()) throw new Error('Write a reflection before saving.');
  const actor = await requireActor();
  return deepDiveRepository().editReflection({ actorId: actor.id, moduleId, promptId, body: body.trim() });
}

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

export async function getA3() {
  const actor = await requireActor();
  return deepDiveRepository().get(actor.id, A3_MODULE_ID, A3_REFLECTION_PROMPT_ID);
}
export async function saveA3Section(sectionId: string) {
  const actor = await requireActor();
  return deepDiveRepository().saveSection({ actorId: actor.id, moduleId: A3_MODULE_ID, sectionId });
}
export async function saveA3Reflection(body: string) {
  const actor = await requireActor();
  return deepDiveRepository().saveReflection({ actorId: actor.id, moduleId: A3_MODULE_ID, promptId: A3_REFLECTION_PROMPT_ID, body });
}
export async function completeA3() {
  const actor = await requireActor();
  return deepDiveRepository().complete({ actorId: actor.id, moduleId: A3_MODULE_ID });
}
export async function getA4() {
  const actor = await requireActor();
  return deepDiveRepository().get(actor.id, A4_MODULE_ID, A4_REFLECTION_PROMPT_ID);
}
export async function saveA4Section(sectionId: string) {
  const actor = await requireActor();
  return deepDiveRepository().saveSection({ actorId: actor.id, moduleId: A4_MODULE_ID, sectionId });
}
export async function saveA4Reflection(body: string) {
  const actor = await requireActor();
  return deepDiveRepository().saveReflection({ actorId: actor.id, moduleId: A4_MODULE_ID, promptId: A4_REFLECTION_PROMPT_ID, body });
}
export async function completeA4() {
  const actor = await requireActor();
  return deepDiveRepository().complete({ actorId: actor.id, moduleId: A4_MODULE_ID });
}
