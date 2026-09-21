import { describe, expect, it, vi } from 'vitest';
import { deleteJournalEntry, type JournalDeletionRepository } from '../../../server/services/journal-deletion-service';

const actorClient = { auth: { getUser: async () => ({ data: { user: { id: '00000000-0000-4000-8000-000000000001', email: null } }, error: null }) } };

describe('journal deletion service', () => {
  it('uses only the verified actor and returns content-free deletion counts', async () => {
    const repository: JournalDeletionRepository = { deleteWithDependencies: vi.fn().mockResolvedValue({
      deletedEntryId: '10000000-0000-4000-8000-000000000001', dependentArtifactCount: 1,
      dependentRecordCount: 2, dependentLinkCount: 3, grantCount: 1,
    }) };
    await expect(deleteJournalEntry({ entryId: '10000000-0000-4000-8000-000000000001' }, { repository, actorClient })).resolves.toEqual({
      kind: 'deleted', dependentArtifactCount: 1, dependentRecordCount: 2, dependentLinkCount: 3, grantCount: 1,
    });
    expect(repository.deleteWithDependencies).toHaveBeenCalledWith('00000000-0000-4000-8000-000000000001', '10000000-0000-4000-8000-000000000001');
  });

  it('returns the same neutral result for missing and other-owner IDs', async () => {
    const repository: JournalDeletionRepository = { deleteWithDependencies: vi.fn().mockResolvedValue(null) };
    await expect(deleteJournalEntry({ entryId: '10000000-0000-4000-8000-000000000099' }, { repository, actorClient })).resolves.toEqual({ kind: 'unavailable' });
  });

  it('rejects invalid IDs before touching the repository', async () => {
    const repository: JournalDeletionRepository = { deleteWithDependencies: vi.fn() };
    await expect(deleteJournalEntry({ entryId: 'not-an-id' }, { repository, actorClient })).rejects.toThrow(/UUID/);
    expect(repository.deleteWithDependencies).not.toHaveBeenCalled();
  });
});
