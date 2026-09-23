'use client';

import { FormEvent, useEffect, useState } from 'react';

export default function UpdatePasswordPage() {
  const [accessToken, setAccessToken] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  useEffect(() => {
    const token = new URLSearchParams(window.location.hash.replace(/^#/, '')).get('access_token');
    if (token) setAccessToken(token);
    else setError('This recovery link is missing or expired. Request a new one.');
  }, []);

  async function updatePassword(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    const form = new FormData(event.currentTarget);
    const password = String(form.get('password') ?? '');
    const confirmation = String(form.get('confirmation') ?? '');
    if (password.length < 8) return setError('Password must be at least 8 characters.');
    if (password !== confirmation) return setError('Passwords do not match.');
    const response = await fetch('/auth/update-password', {
      method: 'POST', credentials: 'same-origin', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ accessToken, password }),
    });
    if (!response.ok) {
      const result = await response.json().catch(() => null) as { error?: string } | null;
      return setError(result?.error ?? 'Unable to update the password.');
    }
    setNotice('Password updated. Redirecting to sign in…');
    window.setTimeout(() => window.location.assign('/sign-in?password-updated=1'), 400);
  }

  return <main><h1>Set a new password</h1><p>Choose a new password for your Reforming the Soul account.</p><form onSubmit={updatePassword}><label htmlFor="password">New password</label><input id="password" name="password" type="password" autoComplete="new-password" minLength={8} required disabled={!accessToken} /><label htmlFor="confirmation">Confirm new password</label><input id="confirmation" name="confirmation" type="password" autoComplete="new-password" minLength={8} required disabled={!accessToken} /><button type="submit" disabled={!accessToken}>Update password</button>{notice && <p role="status">{notice}</p>}{error && <p role="alert">{error}</p>}</form></main>;
}
