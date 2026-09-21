import { AUTH_SESSION_COOKIE, createServerClient, serializeSession, type CookieSource, type VerifiedUser } from './server-client';

type MiddlewareClient = Readonly<{
  auth: {
    getUser(): Promise<{ data: { user: VerifiedUser | null }; error: Error | null }>;
  };
}>;

export type AuthorizationResult =
  | Readonly<{ kind: 'next' }>
  | Readonly<{ kind: 'redirect'; location: string }>;

function requestCookies(request: Request): CookieSource {
  const values = new Map(request.headers.get('cookie')?.split(';').map(part => {
    const [name, ...rest] = part.trim().split('=');
    return [name, rest.join('=')];
  }) ?? []);
  return { get(name) { const value = values.get(name); return value === undefined ? undefined : { value }; } };
}

function signInLocation(request: Request) {
  const url = new URL(request.url);
  return `/sign-in?next=${encodeURIComponent(`${url.pathname}${url.search}`)}`;
}

export async function authorizeProtectedRequest(request: Request, injectedClient?: MiddlewareClient): Promise<AuthorizationResult> {
  const client = injectedClient ?? createServerClient(requestCookies(request));
  const { data, error } = await client.auth.getUser();
  return !error && data.user ? { kind: 'next' } : { kind: 'redirect', location: signInLocation(request) };
}

export async function refreshProtectedSession(request: Request) {
  const cookies = requestCookies(request);
  const client = createServerClient(cookies);
  const result = await authorizeProtectedRequest(request, client);
  if (result.kind === 'next') return { result, session: null } as const;
  const session = await client.auth.refreshSession();
  if (!session) return { result, session: null } as const;
  return { result: { kind: 'next' } as const, session: serializeSession(session) } as const;
}

export { AUTH_SESSION_COOKIE };
