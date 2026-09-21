import { describe, expect, it, vi } from 'vitest';
import { closePractice, createPractice, recordPracticeReturn, reviewPractice, type PracticeRepository } from '../../../server/services/practice-service';

const actorClient = { auth: { getUser: async () => ({ data: { user: { id: 'actor-a', email: null } }, error: null }) } };

function repository(): PracticeRepository {
  return {
    create: vi.fn().mockResolvedValue({ id: 'practice-a', state: 'waiting_for_real_life', lockVersion: 0 }),
    recordReturn: vi.fn().mockResolvedValue({ id: 'practice-a', state: 'ready_to_review', lockVersion: 1 }),
    review: vi.fn().mockResolvedValue({ id: 'practice-a', state: 'reviewed', lockVersion: 2 }),
    close: vi.fn().mockResolvedValue({ id: 'practice-a', state: 'closed', lockVersion: 3 }),
    get: vi.fn(), getUnfinished: vi.fn(),
  };
}

describe('practice service', () => {
  it('creates a waiting practice from exact user wording and the verified actor', async () => {
    const store = repository();
    const values = { controlTargetText: '  control this  ', presentTruthText: '真実\nnow', nextRightStepText: ' call them ' };
    await createPractice(values, { repository: store, actorClient });
    expect(store.create).toHaveBeenCalledWith({ actorId: 'actor-a', ...values });
  });

  it('rejects whitespace-only practice wording before persistence', async () => {
    const store = repository();
    await expect(createPractice({ controlTargetText: ' ', presentTruthText: 'truth', nextRightStepText: 'step' }, { repository: store, actorClient })).rejects.toThrow('control target is required');
    expect(store.create).not.toHaveBeenCalled();
  });

  it('records return and review text with the caller-observed lock version', async () => {
    const store = repository();
    await recordPracticeReturn({ practiceId: 'practice-a', expectedLockVersion: 0, outcomeText: '  outcome  ' }, { repository: store, actorClient });
    await reviewPractice({ practiceId: 'practice-a', expectedLockVersion: 1, reviewText: '  review  ' }, { repository: store, actorClient });
    expect(store.recordReturn).toHaveBeenCalledWith({ actorId: 'actor-a', practiceId: 'practice-a', expectedLockVersion: 0, outcomeText: '  outcome  ' });
    expect(store.review).toHaveBeenCalledWith({ actorId: 'actor-a', practiceId: 'practice-a', expectedLockVersion: 1, reviewText: '  review  ' });
  });

  it('closes only from the caller-observed reviewed state', async () => {
    const store = repository();
    await closePractice({ practiceId: 'practice-a', expectedLockVersion: 2 }, { repository: store, actorClient });
    expect(store.close).toHaveBeenCalledWith({ actorId: 'actor-a', practiceId: 'practice-a', expectedLockVersion: 2 });
  });
});
