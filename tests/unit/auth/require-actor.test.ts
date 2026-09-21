import { describe, expect, it } from 'vitest';
import { AuthenticationRequiredError, requireActor } from '../../../server/auth/require-actor';

describe('requireActor', () => {
  it('returns identity only from a verified Supabase user', async () => {
    const actor = await requireActor({
      auth: {
        getUser: async () => ({
          data: { user: { id: 'verified-user-id', email: 'verified@example.test' } },
          error: null,
        }),
      },
    });

    expect(actor).toEqual({ id: 'verified-user-id', email: 'verified@example.test' });
  });

  it('fails closed for an expired or invalid session', async () => {
    await expect(requireActor({
      auth: {
        getUser: async () => ({ data: { user: null }, error: new Error('JWT expired') }),
      },
    })).rejects.toBeInstanceOf(AuthenticationRequiredError);
  });

  it('does not accept caller-supplied actor IDs', async () => {
    const client = {
      auth: {
        getUser: async () => ({
          data: { user: { id: 'verified-user-id', email: null } },
          error: null,
        }),
      },
    };

    const actor = await requireActor(client, {
      actorId: 'attacker-controlled-id',
      query: { user_id: 'attacker-controlled-id' },
    });

    expect(actor.id).toBe('verified-user-id');
  });
});
