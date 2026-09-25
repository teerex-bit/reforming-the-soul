import { redirect } from 'next/navigation';
import { AuthenticationRequiredError, requireActor } from '../../server/auth/require-actor';

export default async function AuthenticatedAppLayout({ children }: { children: React.ReactNode }) {
  try {
    await requireActor();
  } catch (error) {
    if (error instanceof AuthenticationRequiredError) redirect('/sign-in');
    throw error;
  }
  return children;
}
