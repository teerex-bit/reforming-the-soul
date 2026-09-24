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
        <div className="deep-dive-module-links" aria-label="Awaken lessons">
          <Link className="button" href="/deep-dive/awaken/pay-attention">Begin Pay Attention</Link>
          <Link className="button button--secondary" href="/deep-dive/awaken/catch-yourself-being-you">Begin Catch Yourself Being You · A2</Link>
        </div>
      </section>
    </AppShell>
  );
}
