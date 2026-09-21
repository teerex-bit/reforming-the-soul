import { requireActor } from '../auth/require-actor';
import { curriculumRepository, type ObservationTransaction, type SeeClearlyInput } from '../data/curriculum-repository';

export type SeeClearlyRepository = Pick<ObservationTransaction, 'saveSeeClearly'>;
type ActorClient = Parameters<typeof requireActor>[0];
type Values = Omit<SeeClearlyInput, 'actorId'>;

function required(value: unknown, label: string): asserts value is string {
  if (typeof value !== 'string' || value.trim().length === 0) throw new Error(`${label} is required.`);
}

export async function saveSeeClearly(values: Values, dependencies: Readonly<{ repository?: SeeClearlyRepository; actorClient?: ActorClient }> = {}) {
  required(values.observableFactText, 'observable fact');
  required(values.interpretationText, 'interpretation');
  required(values.beliefExpectationText, 'belief or expectation text');
  if (values.beliefExpectationType !== 'belief' && values.beliefExpectationType !== 'expectation') throw new Error('belief or expectation type is required.');
  const actor = await requireActor(dependencies.actorClient, values);
  if (dependencies.repository) return dependencies.repository.saveSeeClearly({ actorId: actor.id, ...values });
  return curriculumRepository().transaction(transaction => transaction.saveSeeClearly({ actorId: actor.id, ...values }));
}
