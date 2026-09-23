import { NextRequest, NextResponse } from 'next/server';
import { AUTH_SESSION_COOKIE, SESSION_COOKIE_MAX_AGE, serializeSession } from '../../../server/auth/server-client';

const REVIEW_PATH = '/deep-dive/awaken/pay-attention';

function fail(stage: 'flag_missing' | 'review_user_missing' | 'server_secret_missing' | 'supabase_url_missing' | 'generate_link_failed' | 'token_exchange_failed' | 'user_mismatch') {
  console.info('[auth/review]', stage);
  return new NextResponse(null, { status: 404 });
}

function cookie(request: NextRequest, value: string) {
  return { value, httpOnly: true, sameSite: 'lax' as const, secure: request.nextUrl.protocol === 'https:', path: '/', maxAge: SESSION_COOKIE_MAX_AGE };
}

function redirect(request: NextRequest, session?: string) {
  const response = NextResponse.redirect(new URL(REVIEW_PATH, request.url));
  if (session) response.cookies.set({ name: AUTH_SESSION_COOKIE, ...cookie(request, session) });
  return response;
}

export async function GET(request: NextRequest) {
  if (process.env.REVIEW_TEST_ACCESS !== 'true') return fail('flag_missing');
  const email = process.env.REVIEW_TEST_USER_EMAIL;
  const serviceKey = process.env.SUPABASE_SECRET_KEY ?? process.env.SUPABASE_SERVICE_ROLE_KEY;
  const url = (process.env.NEXT_PUBLIC_SUPABASE_URL ?? process.env.SUPABASE_URL)?.replace(/\/$/, '');
  if (!email) return fail('review_user_missing');
  if (!serviceKey) return fail('server_secret_missing');
  if (!url) return fail('supabase_url_missing');

  const generated = await fetch(`${url}/auth/v1/admin/generate_link`, {
    method: 'POST',
    headers: { apikey: serviceKey, Authorization: `Bearer ${serviceKey}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ type: 'magiclink', email, redirect_to: new URL(REVIEW_PATH, request.url).toString() }),
  });
  const generatedBody = await generated.json().catch(() => null) as { action_link?: unknown } | null;
  if (!generated.ok || typeof generatedBody?.action_link !== 'string') return fail('generate_link_failed');

  const verified = await fetch(generatedBody.action_link, { redirect: 'manual' });
  const location = verified.headers.get('location');
  if (!location) return fail('token_exchange_failed');
  const redirected = new URL(location, request.url);
  const params = new URLSearchParams(redirected.hash.slice(1));
  const accessToken = params.get('access_token');
  const refreshToken = params.get('refresh_token');
  const expiresIn = Number(params.get('expires_in') ?? 3600);
  if (!accessToken || !refreshToken || !Number.isFinite(expiresIn)) return fail('token_exchange_failed');

  const userResponse = await fetch(`${url}/auth/v1/user`, { headers: { apikey: serviceKey, Authorization: `Bearer ${accessToken}` } });
  const user = await userResponse.json().catch(() => null) as { id?: unknown; email?: unknown } | null;
  if (!userResponse.ok) return fail('token_exchange_failed');
  if (typeof user?.id !== 'string' || user.email !== email) return fail('user_mismatch');
  const session = serializeSession({ access_token: accessToken, refresh_token: refreshToken, expires_in: expiresIn, user: { id: user.id, email } });
  return redirect(request, session);
}
