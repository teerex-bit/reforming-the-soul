import { NextRequest, NextResponse } from 'next/server';
import {
  AUTH_SESSION_COOKIE,
  createPkcePair,
  createServerClient,
  PKCE_VERIFIER_COOKIE,
  serializeSession,
  SESSION_COOKIE_MAX_AGE,
} from '../../../server/auth/server-client';

function destination(request: NextRequest, fallback = '/dashboard') {
  const candidate = request.nextUrl.searchParams.get('next');
  if (!candidate || !candidate.startsWith('/') || candidate.includes('\\')) return fallback;
  const target = new URL(candidate, request.nextUrl.origin);
  if (target.origin !== request.nextUrl.origin || target.protocol !== request.nextUrl.protocol) return fallback;
  return `${target.pathname}${target.search}`;
}

function redirect(request: NextRequest, path: string) {
  return NextResponse.redirect(new URL(path, request.url));
}

function isSameOriginPost(request: NextRequest) {
  return request.headers.get('origin') === request.nextUrl.origin;
}

function sessionCookie(request: NextRequest, value: string) {
  return {
    value,
    httpOnly: true,
    sameSite: 'lax' as const,
    secure: request.nextUrl.protocol === 'https:',
    path: '/',
    maxAge: SESSION_COOKIE_MAX_AGE,
  };
}

function complete(request: NextRequest, path: string, sessionValue?: string) {
  const response = request.headers.get('accept')?.includes('application/json')
    ? new NextResponse(null, { status: 204, headers: { 'x-rts-next': path } })
    : redirect(request, path);
  if (sessionValue) response.cookies.set({ name: AUTH_SESSION_COOKIE, ...sessionCookie(request, sessionValue) });
  return response;
}

async function credentials(request: NextRequest) {
  const contentType = request.headers.get('content-type') ?? '';
  const body = contentType.includes('application/json') ? await request.json() : Object.fromEntries(await request.formData());
  return {
    email: typeof body.email === 'string' ? body.email : '',
    password: typeof body.password === 'string' ? body.password : '',
  };
}

export async function GET(request: NextRequest) {
  const code = request.nextUrl.searchParams.get('code');
  if (!code) return redirect(request, '/sign-in');
  const session = await createServerClient(request.cookies).auth.exchangeCodeForSession(code);
  if (!session) return redirect(request, '/sign-in');

  const response = complete(request, '/dashboard', serializeSession(session));
  response.cookies.set({ name: PKCE_VERIFIER_COOKIE, value: '', path: '/auth/callback', maxAge: 0 });
  return response;
}

export async function POST(request: NextRequest) {
  if (!isSameOriginPost(request)) return new NextResponse(null, { status: 403 });
  const action = request.nextUrl.searchParams.get('action');
  const auth = createServerClient(request.cookies).auth;
  if (action === 'sign-out') {
    await auth.signOut();
    const response = complete(request, '/sign-in');
    response.cookies.delete(AUTH_SESSION_COOKIE);
    return response;
  }

  const input = await credentials(request);
  if (!input.email || !input.password) return complete(request, '/sign-in?error=auth');
  if (action === 'sign-in') {
    const session = await auth.signInWithPassword(input);
    return session
      ? complete(request, destination(request), serializeSession(session))
      : complete(request, '/sign-in?error=auth');
  }
  if (action === 'sign-up') {
    const pkce = await createPkcePair();
    const session = await auth.signUp({
      ...input,
      emailRedirectTo: new URL('/auth/callback', request.url).toString(),
      codeChallenge: pkce.challenge,
    });
    const response = session
      ? complete(request, destination(request), serializeSession(session))
      : complete(request, '/sign-in?check-email=1');
    response.cookies.set({ name: PKCE_VERIFIER_COOKIE,
      value: pkce.verifier,
      httpOnly: true,
      sameSite: 'lax',
      secure: request.nextUrl.protocol === 'https:',
      path: '/auth/callback',
      maxAge: 60 * 15,
    });
    return response;
  }
  return new NextResponse(null, { status: 405 });
}
