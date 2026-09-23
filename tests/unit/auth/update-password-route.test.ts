import { afterEach, describe, expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';
import { POST } from '../../../app/api/auth/update-password/route';

describe('password recovery flow', () => {
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.unstubAllGlobals();
  });

  it('accepts the recovery session token and updates the password before sign-in redirect', async () => {
    vi.stubEnv('SUPABASE_URL', 'https://project.supabase.test');
    vi.stubEnv('SUPABASE_ANON_KEY', 'anon-key');
    const fetch = vi.fn().mockResolvedValue(new Response(null, { status: 200 }));
    vi.stubGlobal('fetch', fetch);

    const response = await POST(new NextRequest('https://rts.test/auth/update-password', {
      method: 'POST',
      headers: { origin: 'https://rts.test', 'content-type': 'application/json' },
      body: JSON.stringify({ accessToken: 'recovery-access-token', password: 'new-password' }),
    }));

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ ok: true });
    expect(fetch).toHaveBeenCalledWith('https://project.supabase.test/auth/v1/user', expect.objectContaining({
      method: 'PUT',
      headers: expect.objectContaining({ Authorization: 'Bearer recovery-access-token' }),
      body: JSON.stringify({ password: 'new-password' }),
    }));
  });

  it('rejects recovery updates from another origin', async () => {
    const fetch = vi.fn();
    vi.stubGlobal('fetch', fetch);
    const response = await POST(new NextRequest('https://rts.test/auth/update-password', {
      method: 'POST',
      headers: { origin: 'https://attacker.test', 'content-type': 'application/json' },
      body: JSON.stringify({ accessToken: 'token', password: 'new-password' }),
    }));
    expect(response.status).toBe(403);
    expect(fetch).not.toHaveBeenCalled();
  });
});
