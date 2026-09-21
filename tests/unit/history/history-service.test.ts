import { describe, expect, it, vi } from 'vitest';
import { getFormationHistory, type FormationHistoryRepository } from '../../../server/services/history-service';

const actorClient = { auth: { getUser: async () => ({ data: { user: { id: 'actor-a', email: null } }, error: null }) } };

describe('getFormationHistory', () => {
  it('loads only the verified actor history and returns the repository chronology unchanged', async () => {
    const history = [{
      journal: { id: 'j1', nodeId: 'awaken.pay-attention.observe', entryKind: 'event', body: '  My exact words  ', createdAt: '2026-09-21T10:00:00.000Z' },
      records: [], artifacts: [],
    }];
    const repository: FormationHistoryRepository = { list: vi.fn().mockResolvedValue(history) };

    await expect(getFormationHistory({ repository, actorClient })).resolves.toEqual(history);
    expect(repository.list).toHaveBeenCalledWith('actor-a');
  });
});
