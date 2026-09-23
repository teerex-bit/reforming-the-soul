import { afterEach, describe, expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';
import { GET } from '../../../app/auth/review/route';

describe('review auth bootstrap', () => {
  afterEach(() => { vi.unstubAllEnvs(); vi.unstubAllGlobals(); });

  it('denies access when review mode is not explicitly enabled', async () => {
    vi.stubEnv('REVIEW_TEST_ACCESS', '');
    const response = await GET(new NextRequest('https://rts.test/auth/review'));
    expect(response.status).toBe(404);
  });

  it('creates a real session for only the designated review user', async () => {
    vi.stubEnv('REVIEW_TEST_ACCESS', 'true');
    vi.stubEnv('REVIEW_TEST_USER_EMAIL', 'review@example.test');
    vi.stubEnv('SUPABASE_URL', 'https://project.supabase.test');
    vi.stubEnv('SUPABASE_SERVICE_ROLE_KEY', 'service-role-test-key');
    const accessToken = ['header', Buffer.from(JSON.stringify({ sub: 'review-user-id' })).toString('base64url'), 'signature'].join('.');
    const actionLink = 'https://project.supabase.test/auth/v1/verify?token=test&type=magiclink';
    vi.stubGlobal('fetch', vi.fn()
      .mockResolvedValueOnce(new Response(JSON.stringify({ action_link: actionLink }), { status: 200 }))
      .mockResolvedValueOnce(new Response(null, { status: 302, headers: { location: `https://rts.test/awaken/lesson-1#access_token=${accessToken}&refresh_token=refresh-token&expires_in=3600` } }))
      .mockResolvedValueOnce(new Response(JSON.stringify({ id: 'review-user-id', email: 'review@example.test' }), { status: 200 })));

    const response = await GET(new NextRequest('https://rts.test/auth/review'));
    expect(response.status).toBe(307);
    expect(response.headers.get('location')).toBe('https://rts.test/awaken/lesson-1');
    expect(response.cookies.get('rts-auth-session')?.value).toContain('review-user-id');
  });
});
