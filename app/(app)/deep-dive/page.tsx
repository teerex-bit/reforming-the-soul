import Link from 'next/link';
import { AppShell } from '../../../components/design-system/AppShell';
import { getA1, getA2, getA3, getA4 } from '../../../server/services/deep-dive-service';
export default async function DeepDiveHome() {
  const [progress, a2Progress, a3Progress, a4Progress] = await Promise.all([getA1(), getA2(), getA3(), getA4()]);
  const href = progress
    ? `/deep-dive/awaken/pay-attention?section=${progress.completedAt ? 'entry' : progress.lastSectionId}`
    : '/deep-dive/awaken';

  return (
    <AppShell stage="Awaken">
      <section className="deep-dive-home">
        <p className="eyebrow">AWAKEN</p>
        <h1>Pay Attention</h1>
        <p>Before you try to change yourself, learn to notice what is already happening inside you.</p>
        <Link className={progress?.completedAt ? 'deep-dive-home__quiet-link' : 'button'} href={href}>
          {progress?.completedAt ? 'Pay Attention' : progress ? 'Continue where I left off' : 'Begin'}
        </Link>
        {(progress?.completedAt || a2Progress) ? <p className="deep-dive-home__next"><Link href={a2Progress ? `/deep-dive/awaken/catch-yourself-being-you?section=${a2Progress.completedAt ? 'entry' : a2Progress.lastSectionId}` : '/deep-dive/awaken/catch-yourself-being-you'}>{a2Progress?.completedAt ? '' : a2Progress ? 'Continue ' : 'Begin '}Catch Yourself Being You · A2</Link></p> : null}
        {(a2Progress?.completedAt || a3Progress) ? <p className="deep-dive-home__next"><Link href={`/deep-dive/awaken/your-reactions-have-a-history?section=${a3Progress?.completedAt ? 'entry' : a3Progress?.lastSectionId ?? 'entry'}`}>{a3Progress?.completedAt ? '' : a3Progress ? 'Continue ' : 'Begin '}Your Reactions Have a History · A3</Link></p> : null}
        {(a3Progress?.completedAt || a4Progress) ? <p className="deep-dive-home__next"><Link href={`/deep-dive/awaken/formation-is-not-identity?section=${a4Progress?.completedAt ? 'entry' : a4Progress?.lastSectionId ?? 'entry'}`}>{a4Progress?.completedAt ? '' : a4Progress ? 'Continue ' : 'Begin '}Formation Is Not Identity · A4</Link></p> : null}
      </section>
    </AppShell>
  );
}
