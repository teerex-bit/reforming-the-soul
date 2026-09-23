import { requireActor } from '../auth/require-actor';
import { deepDiveRepository } from '../data/deep-dive-repository';
import type { A1SectionId } from '../../domain/deep-dive';
export async function getA1() { const actor = await requireActor(); return deepDiveRepository().get(actor.id); }
export async function saveA1Section(sectionId: A1SectionId) { const actor = await requireActor(); return deepDiveRepository().saveSection({ actorId: actor.id, sectionId }); }
export async function saveA1Reflection(body: string) { const actor = await requireActor(); return deepDiveRepository().saveReflection({ actorId: actor.id, body }); }
export async function deleteA1Reflection() { const actor = await requireActor(); return deepDiveRepository().deleteReflection({ actorId: actor.id }); }
export async function completeA1() { const actor = await requireActor(); return deepDiveRepository().complete({ actorId: actor.id }); }
