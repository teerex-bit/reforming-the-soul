'use client';

import { FormEvent, useState } from 'react';
import { createBrowserClient } from '../../../server/auth/browser-client';

export function safeNext() {
  const next = new URLSearchParams(window.location.search).get('next');
  if (!next || !next.startsWith('/') || next.includes('\\')) return '/dashboard';
  const target = new URL(next, window.location.origin);
  return target.origin === window.location.origin ? `${target.pathname}${target.search}` : '/dashboard';
}

export default function SignInPage() {
  const [error, setError] = useState<string | null>(null);
  async function signIn(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    try {
      const next = await createBrowserClient().auth.signInWithPassword({
        email: String(form.get('email') ?? ''), password: String(form.get('password') ?? ''), next: safeNext(),
      });
      window.location.assign(next);
    } catch {
      setError('Unable to sign in with those details.');
    }
  }
  return <main><h1>Sign in</h1><form onSubmit={signIn}><label htmlFor="email">Email</label><input id="email" name="email" type="email" autoComplete="email" required /><label htmlFor="password">Password</label><input id="password" name="password" type="password" autoComplete="current-password" required /><button type="submit">Sign in</button>{error && <p role="alert">{error}</p>}</form><a href="/sign-up">Create an account</a></main>;
}
