import { afterEach, describe, expect, it, vi } from 'vitest';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { createBrowserClient } from '../../../server/auth/browser-client';

describe('browser authentication client', () => {
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.unstubAllGlobals();
  });

  it('submits credentials only to the same-origin server boundary and never receives a session', async () => {
    const fetch = vi.fn().mockResolvedValue(new Response(null, { status: 200, headers: { 'x-rts-next': '/dashboard' } }));
    vi.stubGlobal('fetch', fetch);

    await expect(createBrowserClient().auth.signInWithPassword({
      email: 'person@example.test', password: 'password', next: '/dashboard',
    })).resolves.toBe('/dashboard');

    expect(fetch).toHaveBeenCalledWith(
      '/auth/callback?action=sign-in&next=%2Fdashboard',
      expect.objectContaining({ credentials: 'same-origin' }),
    );
  });

  it('does not include tokens, cookies, or direct Supabase Auth calls in browser source', async () => {
    const source = await readFile(path.resolve(process.cwd(), 'server/auth/browser-client.ts'), 'utf8');

    expect(source).not.toMatch(/access_token|refresh_token|document\.cookie|\/auth\/v1/);
  });
});
