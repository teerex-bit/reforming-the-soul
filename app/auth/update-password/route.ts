import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '../../../server/auth/server-client';
import { isSameOriginRequest } from '../../../server/http/same-origin';

export async function POST(request: NextRequest) {
  if (!isSameOriginRequest(request)) return new NextResponse(null, { status: 403 });
  const body = await request.json().catch(() => null) as { accessToken?: unknown; password?: unknown } | null;
  const accessToken = typeof body?.accessToken === 'string' ? body.accessToken : '';
  const password = typeof body?.password === 'string' ? body.password : '';
  if (!accessToken || password.length < 8) return NextResponse.json({ error: 'A valid recovery session and password are required.' }, { status: 400 });
  const updated = await createServerClient(request.cookies).auth.updatePassword(accessToken, password);
  return updated
    ? NextResponse.json({ ok: true })
    : NextResponse.json({ error: 'The recovery session is invalid or expired.' }, { status: 401 });
}
