import Link from 'next/link';
import { AppShell } from '../../../components/design-system/AppShell';
import { getA1, getA2 } from '../../../server/services/deep-dive-service';
export default async function DeepDiveHome() {
  const [progress, a2Progress] = await Promise.all([getA1(), getA2()]);
  const href = progress
    ? `/deep-dive/awaken/pay-attention?section=${progress.lastSectionId}`
    : '/deep-dive/awaken';

  return (
    <AppShell stage="Awaken">
      <section className="deep-dive-home">
        <p className="eyebrow">AWAKEN</p>
        <h1>Pay Attention</h1>
        <p>Before you try to change yourself, learn to notice what is already happening inside you.</p>
        <Link className="button" href={href}>
          {progress?.completedAt ? 'Open lesson' : progress ? 'Continue where I left off' : 'Begin'}
        </Link>
        {progress?.completedAt ? <p className="deep-dive-home__next"><Link href={a2Progress ? `/deep-dive/awaken/catch-yourself-being-you?section=${a2Progress.lastSectionId}` : '/deep-dive/awaken/catch-yourself-being-you'}>{a2Progress?.completedAt ? 'Open' : a2Progress ? 'Continue' : 'Begin'} Catch Yourself Being You · A2</Link></p> : null}
      </section>
    </AppShell>
  );
}
