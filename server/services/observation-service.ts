import { requireActor } from '../auth/require-actor';
import { curriculumRepository, type CurriculumRepository } from '../data/curriculum-repository';

export type ObservationRepository = Pick<CurriculumRepository, 'transaction'>;
type ActorClient = Parameters<typeof requireActor>[0];
type AwakenValues = Readonly<{ eventText: string; internalResponseText: string; bodyCueText: string }>;

function required(value: unknown, label: string): asserts value is string {
  if (typeof value !== 'string' || value.trim().length === 0) throw new Error(`${label} is required.`);
}

export async function saveAwakenObservation(
  values: AwakenValues,
  dependencies: Readonly<{ repository?: ObservationRepository; actorClient?: ActorClient }> = {},
) {
  required(values.eventText, 'event text');
  required(values.internalResponseText, 'internal response text');
  required(values.bodyCueText, 'body cue text');
  const actor = await requireActor(dependencies.actorClient);
  const repository = dependencies.repository ?? curriculumRepository();
  return repository.transaction(transaction => transaction.saveAwakenObservation({
    actorId: actor.id,
    eventText: values.eventText,
    internalResponseText: values.internalResponseText,
    bodyCueText: values.bodyCueText,
  }));
}
