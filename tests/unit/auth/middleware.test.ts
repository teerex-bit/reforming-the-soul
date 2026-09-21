import { describe, expect, it } from 'vitest';
import { authorizeProtectedRequest } from '../../../server/auth/middleware';

describe('authorizeProtectedRequest', () => {
  it('redirects unauthenticated protected-route access to sign-in', async () => {
    const result = await authorizeProtectedRequest(
      new Request('https://rts.test/dashboard?next=attacker-controlled'),
      { auth: { getUser: async () => ({ data: { user: null }, error: new Error('invalid JWT') }) } },
    );

    expect(result.kind).toBe('redirect');
    if (result.kind === 'redirect') {
      expect(result.location).toBe('/sign-in?next=%2Fdashboard%3Fnext%3Dattacker-controlled');
    }
  });

  it('allows a request only when Supabase verifies its current session', async () => {
    const result = await authorizeProtectedRequest(
      new Request('https://rts.test/dashboard'),
      { auth: { getUser: async () => ({ data: { user: { id: 'verified-user', email: null } }, error: null }) } },
    );

    expect(result).toEqual({ kind: 'next' });
  });
});
