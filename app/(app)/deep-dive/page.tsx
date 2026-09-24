import Link from 'next/link';
import { AppShell } from '../../../components/design-system/AppShell';
import { getA1 } from '../../../server/services/deep-dive-service';
export default async function DeepDiveHome() {
  const progress = await getA1();
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
      </section>
    </AppShell>
  );
}
