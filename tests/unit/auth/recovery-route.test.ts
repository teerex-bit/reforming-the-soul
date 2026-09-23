import { afterEach, describe, expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';
import { POST } from '../../../app/auth/recovery/route';

describe('password recovery route', () => {
  afterEach(() => { vi.unstubAllEnvs(); vi.unstubAllGlobals(); });

  it('requests a Supabase recovery email that returns to update-password', async () => {
    vi.stubEnv('SUPABASE_URL', 'https://project.supabase.test');
    vi.stubEnv('SUPABASE_ANON_KEY', 'anon-key');
    const fetch = vi.fn().mockResolvedValue(new Response(null, { status: 200 }));
    vi.stubGlobal('fetch', fetch);

    const response = await POST(new NextRequest('https://rts.test/auth/recovery', {
      method: 'POST',
      headers: { origin: 'https://rts.test', 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'person@example.test' }),
    }));

    expect(response.status).toBe(204);
    expect(fetch).toHaveBeenCalledWith('https://project.supabase.test/auth/v1/recover?redirect_to=https%3A%2F%2Frts.test%2Fauth%2Fupdate-password', expect.objectContaining({
      method: 'POST',
      headers: { apikey: 'anon-key', 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'person@example.test' }),
    }));
  });

  it('logs only bounded, safe diagnostics when Supabase rejects recovery', async () => {
    vi.stubEnv('SUPABASE_URL', 'https://project.supabase.test');
    vi.stubEnv('SUPABASE_ANON_KEY', 'anon-key');
    const log = vi.spyOn(console, 'info').mockImplementation(() => undefined);
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response(JSON.stringify({
      code: 'unexpected_failure', message: 'diagnostic detail', access_token: 'do-not-log',
    }), { status: 500 })));

    const response = await POST(new NextRequest('https://rts.test/auth/recovery', {
      method: 'POST', headers: { origin: 'https://rts.test', 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'person@example.test' }),
    }));

    expect(response.status).toBe(502);
    expect(log).toHaveBeenCalledWith('[auth/recovery]', expect.objectContaining({ event: 'supabase_rejected', status: 500, code: 'unexpected_failure', message: 'diagnostic detail' }));
    expect(JSON.stringify(log.mock.calls)).not.toContain('do-not-log');
    expect(JSON.stringify(log.mock.calls)).not.toContain('person@example.test');
  });
});
