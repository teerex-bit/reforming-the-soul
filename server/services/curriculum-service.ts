import { requireActor } from '../auth/require-actor';
import { curriculumNode, curriculumRepository, type CurriculumRepository, type ResumeState } from '../data/curriculum-repository';

type ActorClient = Parameters<typeof requireActor>[0];

export function getCurriculumNode(nodeId: string) {
  return curriculumNode(nodeId);
}

export async function resumeCurriculum(dependencies: Readonly<{ repository?: Pick<CurriculumRepository, 'getResumeState'>; actorClient?: ActorClient }> = {}): Promise<ResumeState> {
  const actor = await requireActor(dependencies.actorClient);
  const state = await (dependencies.repository ?? curriculumRepository()).getResumeState(actor.id);
  return state ?? { currentNodeId: 'awaken.pay-attention.observe', state: 'not_started', completedNodeIds: [] };
}
