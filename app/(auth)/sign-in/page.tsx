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
  const [recoveryOpen, setRecoveryOpen] = useState(false);
  const [recoveryNotice, setRecoveryNotice] = useState<string | null>(null);
  const [recoveryError, setRecoveryError] = useState<string | null>(null);
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
  async function recover(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setRecoveryNotice(null); setRecoveryError(null);
    const email = String(new FormData(event.currentTarget).get('recovery-email') ?? '').trim();
    try { await createBrowserClient().auth.resetPasswordForEmail(email); setRecoveryNotice('Check your email for a password reset link.'); }
    catch { setRecoveryError('Unable to request a password reset.'); }
  }
  return <main><h1>Sign in</h1><form onSubmit={signIn}><label htmlFor="email">Email</label><input id="email" name="email" type="email" autoComplete="email" required /><label htmlFor="password">Password</label><input id="password" name="password" type="password" autoComplete="current-password" required /><button type="submit">Sign in</button>{error && <p role="alert">{error}</p>}</form><button type="button" onClick={() => setRecoveryOpen((open) => !open)}>Forgot password?</button>{recoveryOpen && <form onSubmit={recover}><label htmlFor="recovery-email">Email</label><input id="recovery-email" name="recovery-email" type="email" autoComplete="email" required /><button type="submit">Send password reset link</button>{recoveryNotice && <p role="status">{recoveryNotice}</p>}{recoveryError && <p role="alert">{recoveryError}</p>}</form>}<a href="/sign-up">Create an account</a></main>;
}
