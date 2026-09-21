import { describe, expect, it, vi } from 'vitest';
import { reflectOnCurrentEntry, saveConfirmedReflectInsight, type AiReflectRepository } from '../../../server/services/ai-reflect-service';

const actorClient = { auth: { getUser: async () => ({ data: { user: { id: 'actor-a', email: null } }, error: null }) } };
const intentId = '10000000-0000-4000-8000-000000000001';

function repository(result: Awaited<ReturnType<AiReflectRepository['reserve']>>): AiReflectRepository {
  return { reserve: vi.fn().mockResolvedValue(result), complete: vi.fn().mockResolvedValue(undefined), saveInsight: vi.fn().mockResolvedValue({ currentNodeId: 'bridge.awaken-see-clearly' }) };
}

describe('reflectOnCurrentEntry', () => {
  it('does not call the provider unless the repository returns owned current context', async () => {
    const store = repository({ kind: 'unavailable' });
    const provider = { respond: vi.fn() };
    await expect(reflectOnCurrentEntry({ intentId }, { repository: store, provider, actorClient })).resolves.toEqual({ kind: 'unavailable' });
    expect(provider.respond).not.toHaveBeenCalled();
  });

  it('dispatches only for the reservation winner and completes terminal metadata', async () => {
    const store = repository({ kind: 'dispatch', threadId: 'thread-1', context: { entries: [
      { id: 'e1', kind: 'event', body: 'event' }, { id: 'e2', kind: 'internal_response', body: 'inside' }, { id: 'e3', kind: 'body_cue', body: 'body' },
    ] } });
    const provider = { respond: vi.fn().mockResolvedValue({ kind: 'success', value: { questions: ['What did you notice?'] }, providerRequestId: null }) };
    await expect(reflectOnCurrentEntry({ intentId }, { repository: store, provider, actorClient })).resolves.toMatchObject({ kind: 'success', threadId: 'thread-1' });
    expect(store.complete).toHaveBeenCalledWith(expect.objectContaining({ actorId: 'actor-a', threadId: 'thread-1', status: 'success' }));
  });

  it.each(['already_completed', 'in_progress'] as const)('does not redispatch for %s reservations', async kind => {
    const store = repository({ kind, threadId: 'thread-1' });
    const provider = { respond: vi.fn() };
    await expect(reflectOnCurrentEntry({ intentId }, { repository: store, provider, actorClient })).resolves.toEqual({ kind, threadId: 'thread-1' });
    expect(provider.respond).not.toHaveBeenCalled();
  });

  it('rejects request-controlled actor and context fields', async () => {
    const store = repository({ kind: 'unavailable' });
    await expect(reflectOnCurrentEntry({ intentId, actorId: 'actor-b' } as never, {
      repository: store, provider: { respond: vi.fn() }, actorClient,
    })).rejects.toThrow('unsupported field');
  });
});

describe('saveConfirmedReflectInsight', () => {
  it('preserves separately confirmed wording byte-for-byte under the verified actor', async () => {
    const store = repository({ kind: 'unavailable' });
    await saveConfirmedReflectInsight({ threadId: '20000000-0000-4000-8000-000000000001', insightText: '  I was bracing.  ' }, { repository: store, actorClient });
    expect(store.saveInsight).toHaveBeenCalledWith({ actorId: 'actor-a', threadId: '20000000-0000-4000-8000-000000000001', insightText: '  I was bracing.  ' });
  });

  it('rejects whitespace-only wording before persistence', async () => {
    const store = repository({ kind: 'unavailable' });
    await expect(saveConfirmedReflectInsight({ threadId: null, insightText: ' \n ' }, { repository: store, actorClient })).rejects.toThrow('insight text is required');
    expect(store.saveInsight).not.toHaveBeenCalled();
  });
});
