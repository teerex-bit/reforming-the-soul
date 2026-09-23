import { NextRequest, NextResponse } from 'next/server';
import { isSameOriginRequest } from '../../../server/http/same-origin';

export async function POST(request: NextRequest) {
  if (!isSameOriginRequest(request)) return new NextResponse(null, { status: 403 });
  const body = await request.json().catch(() => null) as { email?: unknown } | null;
  const email = typeof body?.email === 'string' ? body.email.trim() : '';
  if (!email) return NextResponse.json({ error: 'Email is required.' }, { status: 400 });
  const url = (process.env.NEXT_PUBLIC_SUPABASE_URL ?? process.env.SUPABASE_URL)?.replace(/\/$/, '');
  const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? process.env.SUPABASE_ANON_KEY;
  if (!url || !key) return NextResponse.json({ error: 'Supabase configuration is missing.' }, { status: 500 });
  const response = await fetch(`${url}/auth/v1/recover`, {
    method: 'POST', headers: { apikey: key, 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, redirect_to: new URL('/auth/update-password', request.url).toString() }),
  });
  if (!response.ok) return NextResponse.json({ error: 'Unable to request password recovery.' }, { status: 502 });
  return new NextResponse(null, { status: 204 });
}
