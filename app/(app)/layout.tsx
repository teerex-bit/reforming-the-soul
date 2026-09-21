import { redirect } from 'next/navigation';
import { AuthenticationRequiredError, requireActor } from '../../server/auth/require-actor';

export default async function AuthenticatedAppLayout({ children }: { children: React.ReactNode }) {
  try {
    await requireActor();
  } catch (error) {
    if (error instanceof AuthenticationRequiredError) redirect('/sign-in');
    throw error;
  }
  return <>{children}<form action="/auth/callback?action=sign-out" method="post"><button type="submit">Sign out</button></form></>;
}
