'use client';

type Credentials = Readonly<{ email: string; password: string; next?: string }>;

async function submit(action: 'sign-in' | 'sign-up', credentials: Credentials) {
  const params = new URLSearchParams({ action });
  if (credentials.next) params.set('next', credentials.next);
  const response = await fetch(`/auth/callback?${params}`, {
    method: 'POST',
    credentials: 'same-origin',
    headers: { Accept: 'application/json', 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: credentials.email, password: credentials.password }),
  });
  if (!response.ok) throw new Error('Authentication request failed.');
  return response.headers.get('x-rts-next') ?? '/sign-in';
}

export function createBrowserClient() {
  return {
    auth: {
      signInWithPassword(credentials: Credentials) { return submit('sign-in', credentials); },
      signUp(credentials: Credentials) { return submit('sign-up', credentials); },
      async signOut() {
        await fetch('/auth/callback?action=sign-out', { method: 'POST', credentials: 'same-origin' });
      },
    },
  };
}
