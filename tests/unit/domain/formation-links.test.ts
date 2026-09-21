import { describe, expect, it, vi } from 'vitest';
import { saveSeeClearly, type SeeClearlyRepository } from '../../../server/services/see-clearly-service';

const actorClient = { auth: { getUser: async () => ({ data: { user: { id: 'actor-1', email: null } }, error: null }) } };

function repository(): SeeClearlyRepository & { save: ReturnType<typeof vi.fn> } {
  const save = vi.fn().mockResolvedValue({ currentNodeId: 'bridge.see-clearly-become' });
  return { saveSeeClearly: save, save };
}

describe('See Clearly formation input', () => {
  it('keeps exact wording separate and permits exactly one structured belief type', async () => {
    const store = repository();
    const input = { observableFactText: '  The door closed.\n', interpretationText: ' I thought she was angry. ', beliefExpectationType: 'belief' as const, beliefExpectationText: ' Conflict means rejection. ' };
    await expect(saveSeeClearly(input, { repository: store, actorClient })).resolves.toEqual({ currentNodeId: 'bridge.see-clearly-become' });
    expect(store.save).toHaveBeenCalledWith({ actorId: 'actor-1', ...input });
  });

  it.each(['', 'belief,expectation', 'both', 'BELIEF'])("rejects invalid belief/expectation type %j", async beliefExpectationType => {
    const store = repository();
    await expect(saveSeeClearly({ observableFactText: 'fact', interpretationText: 'meaning', beliefExpectationType: beliefExpectationType as never, beliefExpectationText: 'words' }, { repository: store, actorClient })).rejects.toThrow('belief or expectation type is required');
    expect(store.save).not.toHaveBeenCalled();
  });

  it('rejects whitespace-only wording before persistence', async () => {
    const store = repository();
    await expect(saveSeeClearly({ observableFactText: '\u2003', interpretationText: 'meaning', beliefExpectationType: 'expectation', beliefExpectationText: 'words' }, { repository: store, actorClient })).rejects.toThrow('observable fact is required');
    expect(store.save).not.toHaveBeenCalled();
  });
});
