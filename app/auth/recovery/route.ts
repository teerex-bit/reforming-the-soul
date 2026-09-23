import { NextRequest, NextResponse } from 'next/server';
import { isSameOriginRequest } from '../../../server/http/same-origin';

function safeSupabaseErrorBody(raw: string) {
  const trimmed = raw.trim().slice(0, 1000);
  try {
    const parsed = JSON.parse(trimmed) as Record<string, unknown>;
    const safe: Record<string, unknown> = {};
    for (const key of ['error', 'error_code', 'code', 'message', 'msg', 'hint', 'status']) {
      if (typeof parsed[key] === 'string' || typeof parsed[key] === 'number') safe[key] = parsed[key];
    }
    return Object.keys(safe).length ? safe : trimmed;
  } catch {
    return trimmed;
  }
}

export async function POST(request: NextRequest) {
  if (!isSameOriginRequest(request)) return new NextResponse(null, { status: 403 });
  const body = await request.json().catch(() => null) as { email?: unknown } | null;
  const email = typeof body?.email === 'string' ? body.email.trim() : '';
  if (!email) return NextResponse.json({ error: 'Email is required.' }, { status: 400 });
  const url = (process.env.NEXT_PUBLIC_SUPABASE_URL ?? process.env.SUPABASE_URL)?.replace(/\/$/, '');
  const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? process.env.SUPABASE_ANON_KEY;
  if (!url || !key) return NextResponse.json({ error: 'Supabase configuration is missing.' }, { status: 500 });
  const redirectTo = new URL('/auth/update-password', request.url).toString();
  const response = await fetch(`${url}/auth/v1/recover?redirect_to=${encodeURIComponent(redirectTo)}`, {
    method: 'POST', headers: { apikey: key, 'Content-Type': 'application/json' },
    body: JSON.stringify({ email }),
  });
  if (!response.ok) {
    const errorBody = safeSupabaseErrorBody(await response.text());
    console.error('[auth/recovery] Supabase recovery rejected request', {
      status: response.status,
      body: errorBody,
    });
    return NextResponse.json({ error: 'Unable to request password recovery.' }, { status: 502 });
  }
  return new NextResponse(null, { status: 204 });
}
