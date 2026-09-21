import { describe, expect, it, vi } from 'vitest';
import { grantPriorEntryPermission, reflectOnPracticeReview, revokePriorEntryPermission } from '../../../server/services/ai-context-grant-service';

const actorClient = { auth: { getUser: vi.fn(async () => ({ data: { user: { id: 'user-a' } }, error: null })) } } as any;

describe('selected prior entry permission service', () => {
  it('uses the verified actor for grant and revoke', async () => {
    const entryId = '22222222-2222-4222-8222-222222222222', grantId = '33333333-3333-4333-8333-333333333333';
    const repository = { grant: vi.fn(async () => ({ id: grantId, revision: 1, revokedAt: null })), revoke: vi.fn(async () => ({ id: grantId, revision: 2, revokedAt: 'now' })) } as any;
    await grantPriorEntryPermission({ journalEntryId: entryId }, { actorClient, repository });
    await revokePriorEntryPermission({ grantId, expectedRevision: 1 }, { actorClient, repository });
    expect(repository.grant).toHaveBeenCalledWith({ actorId: 'user-a', journalEntryId: entryId });
    expect(repository.revoke).toHaveBeenCalledWith({ actorId: 'user-a', grantId, expectedRevision: 1 });
  });

  it('does not call the provider when the selected prior authorization is unavailable', async () => {
    const provider = { respond: vi.fn() };
    const repository = { reserve: vi.fn(async () => ({ kind: 'unavailable' })) } as any;
    await expect(reflectOnPracticeReview({ intentId: '11111111-1111-4111-8111-111111111111', currentEntryId: '22222222-2222-4222-8222-222222222222', priorEntryId: '33333333-3333-4333-8333-333333333333', grantId: '44444444-4444-4444-8444-444444444444', grantRevision: 1 }, { actorClient, repository, provider })).resolves.toEqual({ kind: 'unavailable' });
    expect(provider.respond).not.toHaveBeenCalled();
  });
});
