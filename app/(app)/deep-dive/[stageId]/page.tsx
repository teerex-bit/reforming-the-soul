import { notFound } from 'next/navigation';
import Link from 'next/link';
import { AppShell } from '../../../../components/design-system/AppShell';
import { AWAKEN_INTRODUCTION } from '../../../../content/deep-dive/v1';
import { awakenModuleNavigation } from '../../../../components/deep-dive/awaken-module-navigation';
import { getA1, getA2, getA3, getA4 } from '../../../../server/services/deep-dive-service';

export default async function StagePage({ params }: { params: Promise<{ stageId: string }> }) {
  const { stageId } = await params;
  if (stageId !== 'awaken') notFound();
  const [a1, a2, a3, a4] = await Promise.all([getA1(), getA2(), getA3(), getA4()]);
  const lessons = [
    awakenModuleNavigation('pay-attention', 'Pay Attention · A1', a1),
    awakenModuleNavigation('catch-yourself-being-you', 'Catch Yourself Being You · A2', a2),
    awakenModuleNavigation('your-reactions-have-a-history', 'Your Reactions Have a History · A3', a3),
    awakenModuleNavigation('formation-is-not-identity', 'Formation Is Not Identity · A4', a4),
  ];

  return (
    <AppShell stage="Awaken">
      <section className="deep-dive-home deep-dive-home--awaken">
        <p className="eyebrow">THE FORMATION JOURNEY · AWAKEN</p>
        <h1>Awaken</h1>
        <p className="deep-dive-introduction">{AWAKEN_INTRODUCTION}</p>
        <div className="deep-dive-module-links" aria-label="Awaken lessons">
          {lessons.map((lesson, index) => <Link className={index === 0 ? 'button' : 'button button--secondary'} href={lesson.href} key={lesson.href}>{lesson.label}</Link>)}
        </div>
      </section>
    </AppShell>
  );
}
