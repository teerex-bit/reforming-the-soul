import { notFound } from 'next/navigation';
import Link from 'next/link';
import { AppShell } from '../../../../components/design-system/AppShell';
import { AWAKEN_INTRODUCTION } from '../../../../content/deep-dive/v1';
import { awakenModuleNavigation } from '../../../../components/deep-dive/awaken-module-navigation';
import { getA1, getA2, getA3, getA4 } from '../../../../server/services/deep-dive-service';
import { getSC1 } from '../../../../server/services/see-clearly-sc1-service';
import { getSY2 } from '../../../../server/services/see-clearly-sy2-service';
import { getSY3 } from '../../../../server/services/see-clearly-sy3-service';
import { getSY4 } from '../../../../server/services/see-clearly-sy4-service';
import { getSG1 } from '../../../../server/services/see-clearly-sg1-service';
import { getSG2 } from '../../../../server/services/see-clearly-sg2-service';
import { getSG3 } from '../../../../server/services/see-clearly-sg3-service';
import { SeeClearlyStage } from '../../../../components/deep-dive/SeeClearlyStage';

export default async function StagePage({ params }: { params: Promise<{ stageId: string }> }) {
  const { stageId } = await params;
  if (stageId === 'see-clearly') {
    const [{ progress }, { progress: sy2 }, { progress: sy3 }, { progress: sy4 }, { progress: sg1 }, { progress: sg2 }, { progress: sg3 }] = await Promise.all([getSC1(), getSY2(), getSY3(), getSY4(), getSG1(), getSG2(), getSG3()]);
    const status = progress?.completedAt ? 'review' : progress ? 'resume' : 'begin';
    const sy2Status = sy2?.completedAt ? 'review' : sy2 ? 'resume' : 'begin';
    const sy3Status = sy3?.completedAt ? 'review' : sy3 ? 'resume' : 'begin';
    const sy4Status = sy4?.completedAt ? 'review' : sy4 ? 'resume' : 'begin';
    const sg1Status = sg1?.completedAt ? 'review' : sg1 ? 'resume' : 'begin';
    const sg2Status = sg2?.completedAt ? 'review' : sg2 ? 'resume' : 'begin';
    const sg3Status = sg3?.completedAt ? 'review' : sg3 ? 'resume' : 'begin';
    return <AppShell stage="See Clearly"><SeeClearlyStage status={status} sy2Status={sy2Status} sy3Status={sy3Status} sy4Status={sy4Status} sg1Status={sg1Status} sg2Status={sg2Status} sg3Status={sg3Status} /></AppShell>;
  }
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
