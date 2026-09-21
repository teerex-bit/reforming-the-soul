import { requireActor } from '../auth/require-actor';
import { formationHistoryRepository, type FormationHistoryRepository } from '../data/history-repository';
export type { FormationHistoryRepository, FormationHistoryItem } from '../data/history-repository';

type ActorClient = Parameters<typeof requireActor>[0];
export async function getFormationHistory(dependencies: Readonly<{ repository?: FormationHistoryRepository; actorClient?: ActorClient }> = {}) {
  const actor = await requireActor(dependencies.actorClient);
  return (dependencies.repository ?? formationHistoryRepository()).list(actor.id);
}
