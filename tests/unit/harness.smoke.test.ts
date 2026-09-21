import { describe, expect, it } from 'vitest';
import { testActors } from '../helpers/auth';
import { createConcurrencyBarrier } from '../helpers/db';
import { createFakeAiProvider } from '../helpers/openai';

describe('unit and integration test helpers', () => {
  it('provides deterministic, distinct test actors', () => {
    expect(testActors.userA.id).toBe('00000000-0000-4000-8000-000000000001');
    expect(testActors.userB.id).toBe('00000000-0000-4000-8000-000000000002');
    expect(testActors.userA.id).not.toBe(testActors.userB.id);
  });

  it('coordinates deterministic concurrency without timing sleeps', async () => {
    const barrier = createConcurrencyBarrier(2);
    const arrivals: string[] = [];
    await Promise.all(['first', 'second'].map(async name => {
      arrivals.push(name);
      await barrier.arriveAndWait();
      arrivals.push(`${name}:released`);
    }));
    expect(arrivals.slice(0, 2).sort()).toEqual(['first', 'second']);
    expect(arrivals.slice(2).sort()).toEqual(['first:released', 'second:released']);
  });

  it('fails with a diagnostic when a concurrency participant never arrives', async () => {
    const barrier = createConcurrencyBarrier(2, 25);
    await expect(barrier.arriveAndWait()).rejects.toThrow(
      'concurrency barrier timed out after 25ms: 1 of 2 participants arrived',
    );
  });

  it('rejects surplus concurrency participants instead of silently releasing them', async () => {
    const barrier = createConcurrencyBarrier(1);
    await barrier.arriveAndWait();
    await expect(barrier.arriveAndWait()).rejects.toThrow(
      'concurrency barrier received more than 1 participants',
    );
  });

  it('uses a deterministic fake provider and never reads a live OpenAI key', async () => {
    const provider = createFakeAiProvider([{ kind: 'success', text: 'What did you notice?' }]);
    await expect(provider.respond({ mode: 'reflect', input: 'fixture' })).resolves.toEqual({
      kind: 'success',
      text: 'What did you notice?',
    });
    expect(provider.requests).toEqual([{ mode: 'reflect', input: 'fixture' }]);
  });
});
