'use client';

import { FormEvent, useState } from 'react';
import { createBrowserClient } from '../../../server/auth/browser-client';

export default function SignUpPage() {
  const [notice, setNotice] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  async function signUp(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    try {
      const next = await createBrowserClient().auth.signUp({
        email: String(form.get('email') ?? ''), password: String(form.get('password') ?? ''),
      });
      if (next === '/sign-in?check-email=1') setNotice('Check your email to confirm your account.');
      else window.location.assign(next);
    } catch {
      setError('Unable to create an account.');
    }
  }
  return <main><h1>Create an account</h1><form onSubmit={signUp}><label htmlFor="email">Email</label><input id="email" name="email" type="email" autoComplete="email" required /><label htmlFor="password">Password</label><input id="password" name="password" type="password" autoComplete="new-password" minLength={8} required /><button type="submit">Create account</button>{notice && <p role="status">{notice}</p>}{error && <p role="alert">{error}</p>}</form><a href="/sign-in">Sign in instead</a></main>;
}
