import { describe, expect, it, vi } from 'vitest';
import { saveAwakenObservation, type ObservationRepository } from '../../../server/services/observation-service';

const actorClient = {
  auth: { getUser: async () => ({ data: { user: { id: 'actor-1', email: 'actor@example.test' } }, error: null }) },
};

function repository(): ObservationRepository & { transaction: ReturnType<typeof vi.fn>; save: ReturnType<typeof vi.fn> } {
  const save = vi.fn().mockResolvedValue({ currentNodeId: 'awaken.pay-attention.reflect' });
  return {
    save,
    transaction: vi.fn(async run => run({ saveAwakenObservation: save })),
  };
}

describe('saveAwakenObservation', () => {
  it('passes all three Awaken values byte-for-byte with only the verified actor to an atomic repository operation', async () => {
    const store = repository();
    const values = {
      eventText: '  A café table tipped\nwithout warning  ',
      internalResponseText: '驚いた\n  and tense ',
      bodyCueText: ' tight shoulders ',
    };

    await expect(saveAwakenObservation(values, { repository: store, actorClient })).resolves.toEqual({
      currentNodeId: 'awaken.pay-attention.reflect',
    });

    expect(store.save).toHaveBeenCalledWith({
      actorId: 'actor-1',
      eventText: values.eventText,
      internalResponseText: values.internalResponseText,
      bodyCueText: values.bodyCueText,
    });
  });

  it('rejects an empty value before it begins an atomic write', async () => {
    const store = repository();

    await expect(saveAwakenObservation({
      eventText: '', internalResponseText: 'inside', bodyCueText: 'body',
    }, { repository: store, actorClient })).rejects.toThrow('event text is required');

    expect(store.transaction).not.toHaveBeenCalled();
  });

  it('rejects a non-text request value before it begins an atomic write', async () => {
    const store = repository();

    await expect(saveAwakenObservation({
      eventText: {} as never, internalResponseText: 'inside', bodyCueText: 'body',
    }, { repository: store, actorClient })).rejects.toThrow('event text is required');

    expect(store.transaction).not.toHaveBeenCalled();
  });

  it('rejects whitespace-only wording without rewriting valid surrounding whitespace', async () => {
    const store = repository();

    await expect(saveAwakenObservation({
      eventText: ' \n\t ', internalResponseText: 'inside', bodyCueText: 'body',
    }, { repository: store, actorClient })).rejects.toThrow('event text is required');
    expect(store.transaction).not.toHaveBeenCalled();

    await saveAwakenObservation({
      eventText: '  event  ', internalResponseText: 'inside', bodyCueText: 'body',
    }, { repository: store, actorClient });
    expect(store.save).toHaveBeenLastCalledWith(expect.objectContaining({ eventText: '  event  ' }));
  });

  it('constructs the repository input from the verified actor rather than an extra request actorId', async () => {
    const store = repository();
    const untrustedValues = {
      eventText: 'event', internalResponseText: 'inside', bodyCueText: 'body', actorId: 'other-actor',
    };

    await saveAwakenObservation(untrustedValues, { repository: store, actorClient });

    expect(store.save).toHaveBeenCalledWith(expect.objectContaining({ actorId: 'actor-1' }));
  });
});
