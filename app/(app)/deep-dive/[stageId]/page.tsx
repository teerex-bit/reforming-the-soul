import { notFound } from 'next/navigation';
import Link from 'next/link';
import { AppShell } from '../../../../components/design-system/AppShell';
import { AWAKEN_INTRODUCTION } from '../../../../content/deep-dive/v1';

export default async function StagePage({ params }: { params: Promise<{ stageId: string }> }) {
  const { stageId } = await params;
  if (stageId !== 'awaken') notFound();

  return (
    <AppShell stage="Awaken">
      <section className="deep-dive-home deep-dive-home--awaken">
        <p className="eyebrow">THE FORMATION JOURNEY · AWAKEN</p>
        <h1>Awaken</h1>
        <p className="deep-dive-introduction">{AWAKEN_INTRODUCTION}</p>
        <Link className="button" href="/deep-dive/awaken/pay-attention">Begin Pay Attention</Link>
      </section>
    </AppShell>
  );
}
