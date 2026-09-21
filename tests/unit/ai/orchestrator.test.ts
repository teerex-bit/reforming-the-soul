import { describe, expect, it, vi } from 'vitest';
import { runReflect } from '../../../server/ai/orchestrator';
import type { AiProvider } from '../../../server/ai/openai-adapter';

const context = { entries: [
  { id: 'e1', kind: 'event', body: 'A meeting changed.' },
  { id: 'e2', kind: 'internal_response', body: 'I felt dismissed.' },
  { id: 'e3', kind: 'body_cue', body: 'My jaw tightened.' },
] } as const;

describe('Reflect orchestration', () => {
  it('returns validated questions from a strict provider result', async () => {
    const provider: AiProvider = { respond: vi.fn().mockResolvedValue({
      kind: 'success', value: { questions: ['What did you notice just before your jaw tightened?'] }, providerRequestId: 'req-1',
    }) };
    await expect(runReflect(context, provider)).resolves.toMatchObject({ kind: 'success' });
    expect(provider.respond).toHaveBeenCalledWith(expect.objectContaining({ store: false }));
  });

  it.each(['refusal', 'incomplete', 'invalid', 'timeout', 'provider_error'] as const)(
    'preserves an explicit %s result without fallback parsing', async kind => {
      const result = kind === 'refusal' ? { kind, safeMessage: 'I cannot help with that request.' }
        : kind === 'incomplete' ? { kind, reason: 'max_output_tokens' }
        : kind === 'invalid' ? { kind, issues: ['wrong shape'] }
        : kind === 'provider_error' ? { kind, retryable: true }
        : { kind };
      const provider: AiProvider = { respond: vi.fn().mockResolvedValue(result) };
      await expect(runReflect(context, provider)).resolves.toEqual(result);
    },
  );
});
