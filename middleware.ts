import { NextRequest, NextResponse } from 'next/server';
import { AUTH_SESSION_COOKIE, refreshProtectedSession } from './server/auth/middleware';

export async function middleware(request: NextRequest) {
  const { result, session } = await refreshProtectedSession(request);
  if (result.kind === 'redirect') return NextResponse.redirect(new URL(result.location, request.url));

  const response = NextResponse.next();
  if (session) {
    response.cookies.set(AUTH_SESSION_COOKIE, session, {
      httpOnly: true,
      sameSite: 'lax',
      secure: request.nextUrl.protocol === 'https:',
      path: '/',
      maxAge: 60 * 60 * 24 * 7,
    });
  }
  return response;
}

export const config = { matcher: ['/dashboard/:path*', '/formation/:path*', '/practices/:path*'] };
