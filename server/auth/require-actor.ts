import { cookies } from 'next/headers';
import { createServerClient, type VerifiedUser } from './server-client';

export type AuthenticatedActor = Readonly<{ id: string; email: string | null }>;
type ActorClient = Readonly<{ auth: { getUser(): Promise<{ data: { user: VerifiedUser | null }; error: Error | null }> } }>;

export class AuthenticationRequiredError extends Error {
  constructor() {
    super('An authenticated session is required.');
    this.name = 'AuthenticationRequiredError';
  }
}

export async function requireActor(client?: ActorClient, untrustedRequestInput?: unknown): Promise<AuthenticatedActor> {
  void untrustedRequestInput;
  const activeClient = client ?? createServerClient(await cookies());
  const { data, error } = await activeClient.auth.getUser();
  if (error || !data.user || !data.user.id) throw new AuthenticationRequiredError();
  return { id: data.user.id, email: data.user.email };
}
