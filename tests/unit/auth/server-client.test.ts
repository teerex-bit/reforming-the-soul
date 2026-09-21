import { afterEach, describe, expect, it, vi } from 'vitest';
import { AUTH_SESSION_COOKIE, createServerClient } from '../../../server/auth/server-client';

const session = JSON.stringify({
  access_token: 'untrusted-looking-token',
  refresh_token: 'refresh-token',
  expires_in: 3600,
  user: { id: 'attacker-controlled-id', email: 'attacker@example.test' },
});

describe('server authentication client', () => {
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.unstubAllGlobals();
  });

  it('uses Supabase user verification instead of the ID embedded in the session cookie', async () => {
    vi.stubEnv('SUPABASE_URL', 'https://project.supabase.test');
    vi.stubEnv('SUPABASE_ANON_KEY', 'anon-key');
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response(JSON.stringify({
      id: 'verified-user-id', email: 'verified@example.test',
    }), { status: 200 })));
    const client = createServerClient({ get: name => name === AUTH_SESSION_COOKIE ? { value: session } : undefined });

    await expect(client.auth.getUser()).resolves.toEqual({
      data: { user: { id: 'verified-user-id', email: 'verified@example.test' } }, error: null,
    });
  });

  it('fails closed when Supabase rejects the access token', async () => {
    vi.stubEnv('SUPABASE_URL', 'https://project.supabase.test');
    vi.stubEnv('SUPABASE_ANON_KEY', 'anon-key');
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response(null, { status: 401 })));
    const client = createServerClient({ get: name => name === AUTH_SESSION_COOKIE ? { value: session } : undefined });

    await expect(client.auth.getUser()).resolves.toMatchObject({ data: { user: null }, error: expect.any(Error) });
  });
});
