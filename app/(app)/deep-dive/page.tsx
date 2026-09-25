import Link from 'next/link';
import { AppShell } from '../../../components/design-system/AppShell';
import { getA1, getA2, getA3, getA4 } from '../../../server/services/deep-dive-service';
import { awakenModuleNavigation } from '../../../components/deep-dive/awaken-module-navigation';
export default async function DeepDiveHome() {
  const [progress, a2Progress, a3Progress, a4Progress] = await Promise.all([getA1(), getA2(), getA3(), getA4()]);
  const a1 = awakenModuleNavigation('pay-attention', 'Pay Attention · A1', progress);
  const a2 = awakenModuleNavigation('catch-yourself-being-you', 'Catch Yourself Being You · A2', a2Progress);
  const a3 = awakenModuleNavigation('your-reactions-have-a-history', 'Your Reactions Have a History · A3', a3Progress);
  const a4 = awakenModuleNavigation('formation-is-not-identity', 'Formation Is Not Identity · A4', a4Progress);

  return (
    <AppShell stage="Awaken">
      <section className="deep-dive-home">
        <p className="eyebrow">AWAKEN</p>
        <h1>Pay Attention</h1>
        <p>Before you try to change yourself, learn to notice what is already happening inside you.</p>
        <Link className={progress?.completedAt ? 'deep-dive-home__quiet-link' : 'button'} href={progress ? a1.href : '/deep-dive/awaken'}>
          {progress ? a1.label : 'Begin'}
        </Link>
        {(progress?.completedAt || a2Progress) ? <p className="deep-dive-home__next"><Link href={a2.href}>{a2.label}</Link></p> : null}
        {(a2Progress?.completedAt || a3Progress) ? <p className="deep-dive-home__next"><Link href={a3.href}>{a3.label}</Link></p> : null}
        {(a3Progress?.completedAt || a4Progress) ? <p className="deep-dive-home__next"><Link href={a4.href}>{a4.label}</Link></p> : null}
      </section>
    </AppShell>
  );
}
