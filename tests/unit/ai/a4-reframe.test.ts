import { describe, expect, it, vi } from 'vitest';
import { A4_NEUTRAL_REFRAME, requestA4Reframe, safeA4Reframe } from '../../../server/ai/a4-reframe';

const actorClient = { auth: { getUser: async () => ({ data: { user: { id: 'owner', email: null } }, error: null }) } };
const success = 'I learned to move toward control in some situations, but this is not the whole truth of who I am.';
const response = (text: string) => new Response(JSON.stringify({ status: 'completed', output: [{ content: [{ type: 'output_text', text }] }] }), { status: 200 });

describe('bounded A4 reframe', () => {
  it('sends only the current statement as untrusted data with store false', async () => {
    const mockFetch = vi.fn().mockResolvedValue(response(success));
    await expect(requestA4Reframe('I like to be in control.', { actorClient, apiKey: 'test', fetch: mockFetch })).resolves.toBe(success);
    const payload = JSON.parse(mockFetch.mock.calls[0][1].body);
    expect(payload.store).toBe(false);
    expect(payload.input).toHaveLength(2);
    expect(payload.input[1]).toMatchObject({ role: 'user', content: [{ text: 'I like to be in control.' }] });
    expect(JSON.stringify(payload)).not.toContain('journal');
  });
  it.each([
    ['I am intimidating.', 'I learned to respond in ways that can feel intimidating, but this is not the whole truth of who I am.'],
    ['I avoid conflict.', 'I learned to avoid conflict in some situations, but this is not the whole truth of who I am.'],
  ])('preserves the participant meaning for %s', async (statement, reframe) => {
    await expect(requestA4Reframe(statement, { actorClient, apiKey: 'test', fetch: vi.fn().mockResolvedValue(response(reframe)) })).resolves.toBe(reframe);
  });
  it('rejects unrelated fluent output', async () => {
    await expect(requestA4Reframe('I avoid conflict.', { actorClient, apiKey: 'test', fetch: vi.fn().mockResolvedValue(response(success)) })).resolves.toBe(A4_NEUTRAL_REFRAME);
  });
  it('rejects invented causes, diagnosis, theological certainty and malformed responses', () => {
    for (const text of [
      'I learned to avoid conflict because of childhood trauma, but this is not the whole truth of who I am.',
      'I learned to control things due to a disorder, but this is not the whole truth of who I am.',
      'God says I must change, but this is not the whole truth of who I am.',
      'I like to be in control.',
      '```I learned to withdraw, but this is not the whole truth of who I am.```',
    ]) expect(safeA4Reframe(text)).toBe(A4_NEUTRAL_REFRAME);
  });
  it('uses neutral fallback on failure, timeout, no key or invalid input', async () => {
    const timeout = vi.fn().mockRejectedValue(Object.assign(new Error('timeout'), { name: 'TimeoutError' }));
    await expect(requestA4Reframe('I avoid conflict.', { actorClient, apiKey: 'test', fetch: timeout })).resolves.toBe(A4_NEUTRAL_REFRAME);
    await expect(requestA4Reframe('I avoid conflict.', { actorClient, apiKey: '', fetch: timeout })).resolves.toBe(A4_NEUTRAL_REFRAME);
    await expect(requestA4Reframe(' x '.repeat(501), { actorClient, apiKey: 'test', fetch: timeout })).resolves.toBe(A4_NEUTRAL_REFRAME);
  });
  it('requires an authenticated user even if AI is unavailable', async () => {
    await expect(requestA4Reframe('I avoid conflict.', { apiKey: '', actorClient: { auth: { getUser: async () => ({ data: { user: null }, error: null }) } } })).rejects.toThrow(/authenticated/i);
  });
});
