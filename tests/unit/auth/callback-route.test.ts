import { afterEach, describe, expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';
import { GET, isSameOriginPost, POST } from '../../../app/auth/callback/route';
import { AUTH_SESSION_COOKIE, PKCE_VERIFIER_COOKIE, SESSION_COOKIE_MAX_AGE } from '../../../server/auth/server-client';

const session = {
  access_token: 'server-only-access-token',
  refresh_token: 'server-only-refresh-token',
  expires_in: 3600,
  user: { id: 'verified-user', email: 'verified@example.test' },
};

function configureAuth(fetch: ReturnType<typeof vi.fn>) {
  vi.stubEnv('SUPABASE_URL', 'https://project.supabase.test');
  vi.stubEnv('SUPABASE_ANON_KEY', 'anon-key');
  vi.stubGlobal('fetch', fetch);
}

const sameOrigin = { origin: 'https://rts.test' };

describe('auth callback route', () => {
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.unstubAllGlobals();
  });

  it('uses the request URL origin when Next normalizes nextUrl for the production runtime', () => {
    const request = {
      headers: new Headers({ origin: 'http://127.0.0.1:4187' }),
      url: 'http://127.0.0.1:4187/auth/callback?action=sign-up',
      nextUrl: new URL('http://localhost:4187/auth/callback?action=sign-up'),
    } as unknown as NextRequest;

    expect(isSameOriginPost(request)).toBe(true);
  });

  it('initiates sign-up with a PKCE challenge and retains its verifier only in an HttpOnly callback cookie', async () => {
    const fetch = vi.fn().mockResolvedValue(new Response(JSON.stringify({ user: session.user, session: null }), { status: 200 }));
    configureAuth(fetch);
    const form = new FormData();
    form.set('email', 'person@example.test');
    form.set('password', 'password');

    const response = await POST(new NextRequest('https://rts.test/auth/callback?action=sign-up', {
      method: 'POST', body: form, headers: sameOrigin,
    }));
    const signupBody = JSON.parse(fetch.mock.calls[0][1].body as string);

    expect(response.headers.get('location')).toBe('https://rts.test/sign-in?check-email=1');
    expect(response.headers.get('set-cookie')).toContain(`${PKCE_VERIFIER_COOKIE}=`);
    expect(response.headers.get('set-cookie')).toContain('HttpOnly');
    expect(fetch).toHaveBeenNthCalledWith(1,
      'https://project.supabase.test/auth/v1/signup?redirect_to=https%3A%2F%2Frts.test%2Fauth%2Fcallback',
      expect.anything(),
    );
    expect(signupBody.options).toBeUndefined();
    expect(signupBody.code_challenge).toMatch(/^[A-Za-z0-9_-]{43}$/);
    expect(signupBody.code_challenge_method).toBe('s256');
  });

  it('exchanges a callback code, verifies the returned session, and issues a refresh-capable HttpOnly session cookie', async () => {
    const fetch = vi.fn()
      .mockResolvedValueOnce(new Response(JSON.stringify(session), { status: 200 }))
      .mockResolvedValueOnce(new Response(JSON.stringify(session.user), { status: 200 }));
    configureAuth(fetch);
    const request = new NextRequest('https://rts.test/auth/callback?code=confirmation-code', {
      headers: { cookie: `${PKCE_VERIFIER_COOKIE}=pkce-verifier` },
    });

    const response = await GET(request);

    expect(fetch).toHaveBeenNthCalledWith(1, 'https://project.supabase.test/auth/v1/token?grant_type=pkce', expect.objectContaining({
      body: JSON.stringify({ auth_code: 'confirmation-code', code_verifier: 'pkce-verifier' }),
    }));
    expect(response.headers.get('location')).toBe('https://rts.test/dashboard');
    expect(response.headers.get('set-cookie')).toContain(`${AUTH_SESSION_COOKIE}=`);
    expect(response.headers.get('set-cookie')).toContain('HttpOnly');
    expect(response.headers.get('set-cookie')).toContain(`Max-Age=${SESSION_COOKIE_MAX_AGE}`);
    expect(response.headers.get('set-cookie')).toContain(`${PKCE_VERIFIER_COOKIE}=; Path=/auth/callback; Max-Age=0`);
  });

  it('issues password sessions server-side and rejects a backslash external next target', async () => {
    const fetch = vi.fn()
      .mockResolvedValueOnce(new Response(JSON.stringify(session), { status: 200 }))
      .mockResolvedValueOnce(new Response(JSON.stringify(session.user), { status: 200 }));
    configureAuth(fetch);
    const form = new FormData();
    form.set('email', 'person@example.test');
    form.set('password', 'password');

    const response = await POST(new NextRequest('https://rts.test/auth/callback?action=sign-in&next=/%5Cevil.example', {
      method: 'POST', body: form, headers: sameOrigin,
    }));

    expect(response.headers.get('location')).toBe('https://rts.test/dashboard');
    expect(response.headers.get('set-cookie')).toContain('HttpOnly');
    expect(response.headers.get('set-cookie')).not.toContain('Max-Age=3600');
  });

  it.each(['sign-in', 'sign-up', 'sign-out'])('rejects cross-origin %s posts before calling Auth', async action => {
    const fetch = vi.fn();
    configureAuth(fetch);
    const response = await POST(new NextRequest(`https://rts.test/auth/callback?action=${action}`, {
      method: 'POST', headers: { origin: 'https://attacker.test', 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'person@example.test', password: 'password' }),
    }));

    expect(response.status).toBe(403);
    expect(fetch).not.toHaveBeenCalled();
  });

  it('accepts a same-origin sign-out post', async () => {
    const fetch = vi.fn();
    configureAuth(fetch);
    const response = await POST(new NextRequest('https://rts.test/auth/callback?action=sign-out', {
      method: 'POST', headers: sameOrigin,
    }));

    expect(response.headers.get('location')).toBe('https://rts.test/sign-in');
    expect(response.status).toBe(307);
  });
});
