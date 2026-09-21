export const AUTH_SESSION_COOKIE = 'rts-auth-session';
export const PKCE_VERIFIER_COOKIE = 'rts-pkce-verifier';
export const SESSION_COOKIE_MAX_AGE = 60 * 60 * 24 * 30;
type BrowserSession = Readonly<{
  access_token: string;
  refresh_token: string;
  expires_in: number;
  user: Readonly<{ id: string; email: string | null }>;
}>;

export type CookieSource = Readonly<{ get(name: string): { value: string } | undefined }>;
export type VerifiedUser = Readonly<{ id: string; email: string | null }>;

type AuthResponse = Partial<BrowserSession> & { session?: BrowserSession; error?: { message?: string } };

function serverConfiguration() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL ?? process.env.SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY
    ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
    ?? process.env.SUPABASE_ANON_KEY;
  if (!url || !key) throw new Error('Supabase URL and anon key are required.');
  return { url: url.replace(/\/$/, ''), key };
}

function decodeSession(value: string | undefined): BrowserSession | null {
  if (!value) return null;
  try {
    return JSON.parse(decodeURIComponent(value)) as BrowserSession;
  } catch {
    return null;
  }
}

function isSession(value: unknown): value is BrowserSession {
  return Boolean(value) && typeof value === 'object'
    && typeof (value as BrowserSession).access_token === 'string'
    && typeof (value as BrowserSession).refresh_token === 'string'
    && typeof (value as BrowserSession).expires_in === 'number'
    && typeof (value as BrowserSession).user?.id === 'string';
}

function sessionFrom(value: AuthResponse | null): BrowserSession | null {
  const candidate = value?.session ?? value;
  return isSession(candidate) ? candidate : null;
}

function base64Url(bytes: Uint8Array) {
  let binary = '';
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

export async function createPkcePair() {
  const verifier = base64Url(crypto.getRandomValues(new Uint8Array(32)));
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(verifier));
  return { verifier, challenge: base64Url(new Uint8Array(digest)) };
}

export function serializeSession(session: BrowserSession) {
  return JSON.stringify(session);
}

export function createServerClient(cookies: CookieSource) {
  const session = () => decodeSession(cookies.get(AUTH_SESSION_COOKIE)?.value);
  const request = async (path: string, init: RequestInit = {}) => {
    const { url, key } = serverConfiguration();
    return fetch(`${url}/auth/v1/${path}`, {
      ...init,
      headers: { apikey: key, 'Content-Type': 'application/json', ...init.headers },
    });
  };
  const getUserForToken = async (accessToken: string) => {
    const response = await request('user', { headers: { Authorization: `Bearer ${accessToken}` } });
    if (!response.ok) return { data: { user: null }, error: new Error('Supabase session verification failed.') } as const;
    const body = await response.json().catch(() => null) as Partial<VerifiedUser> | null;
    if (!body || typeof body.id !== 'string' || body.id.length === 0) {
      return { data: { user: null }, error: new Error('Supabase returned an invalid user.') } as const;
    }
    return { data: { user: { id: body.id, email: typeof body.email === 'string' ? body.email : null } }, error: null } as const;
  };

  return {
    auth: {
      async getUser() {
        const current = session();
        if (!current || !isSession(current)) {
          return { data: { user: null }, error: new Error('No valid session cookie.') } as const;
        }
        return getUserForToken(current.access_token);
      },
      async refreshSession() {
        const current = session();
        if (!current || !isSession(current)) return null;
        const response = await request('token?grant_type=refresh_token', {
          method: 'POST', body: JSON.stringify({ refresh_token: current.refresh_token }),
        });
        const next = await response.json().catch(() => null);
        if (!response.ok || !isSession(next)) return null;
        const verified = await getUserForToken(next.access_token);
        return verified.data.user ? next : null;
      },
      async exchangeCodeForSession(code: string) {
        const verifier = cookies.get(PKCE_VERIFIER_COOKIE)?.value;
        if (!verifier) return null;
        const response = await request('token?grant_type=pkce', {
          method: 'POST', body: JSON.stringify({ auth_code: code, code_verifier: verifier }),
        });
        const next = sessionFrom(await response.json().catch(() => null));
        if (!response.ok || !next) return null;
        const verified = await getUserForToken(next.access_token);
        return verified.data.user ? next : null;
      },
      async signInWithPassword(credentials: { email: string; password: string }) {
        const response = await request('token?grant_type=password', {
          method: 'POST', body: JSON.stringify(credentials),
        });
        const next = sessionFrom(await response.json().catch(() => null));
        if (!response.ok || !next) return null;
        const verified = await getUserForToken(next.access_token);
        return verified.data.user ? next : null;
      },
      async signUp(credentials: { email: string; password: string; emailRedirectTo: string; codeChallenge: string }) {
        const response = await request(`signup?redirect_to=${encodeURIComponent(credentials.emailRedirectTo)}`, {
          method: 'POST',
          body: JSON.stringify({
            email: credentials.email,
            password: credentials.password,
            code_challenge: credentials.codeChallenge,
            code_challenge_method: 's256',
          }),
        });
        const next = sessionFrom(await response.json().catch(() => null));
        if (!response.ok || !next) return null;
        const verified = await getUserForToken(next.access_token);
        return verified.data.user ? next : null;
      },
      async signOut() {
        const current = session();
        if (current && isSession(current)) {
          await request('logout', { method: 'POST', headers: { Authorization: `Bearer ${current.access_token}` } });
        }
      },
    },
  };
}
