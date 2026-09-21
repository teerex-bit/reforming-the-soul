import { describe, expect, it, vi } from 'vitest';
import { buildReflectRequest } from '../../../server/ai/context-builder';
import { openAiProvider } from '../../../server/ai/openai-adapter';

const request = buildReflectRequest({ entries: [{ id: 'e1', kind: 'event', body: 'event' }] });

describe('OpenAI adapter', () => {
  it('sends store false, no tools, and parses only strict structured output', async () => {
    const fetch = vi.fn().mockResolvedValue(new Response(JSON.stringify({
      id: 'req-1', status: 'completed', output: [{ type: 'message', content: [{ type: 'output_text', text: '{"questions":["What did you notice?"]}' }] }],
    }), { status: 200 }));
    const provider = openAiProvider({ apiKey: 'test-key', fetch });
    await expect(provider.respond(request)).resolves.toMatchObject({ kind: 'success', providerRequestId: 'req-1' });
    const body = JSON.parse(fetch.mock.calls[0][1].body);
    expect(body.store).toBe(false);
    expect(body).not.toHaveProperty('tools');
    expect(JSON.stringify(body.input)).toContain('CURRENT_USER_ENTRY_UNTRUSTED_DATA');
    expect(body.input.at(-1).role).toBe('user');
  });

  it('keeps selected prior journal wording in an untrusted user-role block', async () => {
    const fetch = vi.fn().mockResolvedValue(new Response(JSON.stringify({
      status: 'completed', output: [{ content: [{ type: 'output_text', text: '{"questions":["What did you notice?"]}' }] }],
    }), { status: 200 }));
    await openAiProvider({ apiKey: 'test-key', fetch }).respond(buildReflectRequest({
      entries: [{ id: 'current', kind: 'practice_review', body: 'current' }],
      selectedPrior: { id: 'prior', kind: 'event', body: 'prior' },
    }));
    const body = JSON.parse(fetch.mock.calls[0][1].body);
    expect(body.input.find((block: { content: { text: string }[] }) => block.content[0].text.includes('SELECTED_PRIOR')).role).toBe('user');
  });

  it('maps refusal, incomplete, invalid, timeout, and provider failures explicitly', async () => {
    const cases = [
      [new Response(JSON.stringify({ output: [{ content: [{ type: 'refusal' }] }] }), { status: 200 }), 'refusal'],
      [new Response(JSON.stringify({ status: 'incomplete', incomplete_details: { reason: 'max_output_tokens' } }), { status: 200 }), 'incomplete'],
      [new Response(JSON.stringify({ status: 'completed' }), { status: 200 }), 'invalid'],
      [new Response('', { status: 429 }), 'provider_error'],
    ] as const;
    for (const [response, kind] of cases) {
      const provider = openAiProvider({ apiKey: 'test-key', fetch: vi.fn().mockResolvedValue(response) });
      await expect(provider.respond(request)).resolves.toMatchObject({ kind });
    }
    const timeout = Object.assign(new Error('timeout'), { name: 'TimeoutError' });
    await expect(openAiProvider({ apiKey: 'test-key', fetch: vi.fn().mockRejectedValue(timeout) }).respond(request)).resolves.toEqual({ kind: 'timeout' });
  });
});
