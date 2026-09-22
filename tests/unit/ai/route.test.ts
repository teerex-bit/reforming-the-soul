import { describe, expect, it, vi } from 'vitest';
import { handleAiReflectPost } from '../../../app/api/ai/reflect/handler';

describe('AI Reflect route', () => {
  it('uses no-store responses and rejects prior-entry context input', async () => {
    const response = await handleAiReflectPost(new Request('http://localhost/api/ai/reflect', {
      method: 'POST', headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ intentId: crypto.randomUUID(), priorEntryId: crypto.randomUUID() }),
    }), { reflect: vi.fn() });
    expect(response.status).toBe(400);
    expect(response.headers.get('cache-control')).toBe('no-store');
  });

  it('rejects cross-origin dispatch before invoking the service', async () => {
    const reflect = vi.fn();
    const response = await handleAiReflectPost(new Request('https://rts.test/api/ai/reflect', {
      method: 'POST', headers: { origin: 'https://attacker.test', 'content-type': 'application/json' },
      body: JSON.stringify({ intentId: crypto.randomUUID() }),
    }), { reflect });
    expect(response.status).toBe(403);
    expect(reflect).not.toHaveBeenCalled();
  });

  it('returns a neutral conflict for intent fingerprint reuse', async () => {
    const conflict = Object.assign(new Error('conflict'), { code: '23514' });
    const response = await handleAiReflectPost(new Request('https://rts.test/api/ai/reflect', {
      method: 'POST', headers: { origin: 'https://rts.test', 'content-type': 'application/json' },
      body: JSON.stringify({ intentId: crypto.randomUUID() }),
    }), { reflect: vi.fn().mockRejectedValue(conflict) });
    expect(response.status).toBe(409);
    expect(await response.json()).toEqual({ kind: 'conflict' });
  });
});
