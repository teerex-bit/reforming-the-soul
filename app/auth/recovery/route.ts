import { NextRequest, NextResponse } from 'next/server';
import { isSameOriginRequest } from '../../../server/http/same-origin';

export async function POST(request: NextRequest) {
  const correlationId = crypto.randomUUID();
  const diagnostic = (event: string, details: Record<string, unknown> = {}) => {
    console.info('[auth/recovery]', { event, correlationId, timestamp: new Date().toISOString(), ...details });
  };
  diagnostic('reached');
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
    const raw = await response.text();
    let details: Record<string, unknown> = {};
    try {
      const parsed = JSON.parse(raw) as Record<string, unknown>;
      for (const key of ['code', 'error', 'error_code', 'msg', 'message']) {
        if (typeof parsed[key] === 'string') details[key] = parsed[key];
      }
    } catch {
      details.body = raw.slice(0, 300);
    }
    diagnostic('supabase_rejected', { status: response.status, ...details });
    return NextResponse.json({ error: 'Unable to request password recovery.' }, { status: 502 });
  }
  diagnostic('supabase_accepted', { status: response.status });
  return new NextResponse(null, { status: 204 });
}
