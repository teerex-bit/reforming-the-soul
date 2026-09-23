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
    expect(fetch).toHaveBeenCalledWith('https://project.supabase.test/auth/v1/recover', expect.objectContaining({
      method: 'POST',
      headers: { apikey: 'anon-key', 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'person@example.test', redirect_to: 'https://rts.test/auth/update-password' }),
    }));
  });
});
