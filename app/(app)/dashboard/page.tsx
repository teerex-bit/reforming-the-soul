import Link from 'next/link';
import { AppShell } from '../../../components/design-system/AppShell';
import { currentJourneyResume } from '../../../server/services/current-journey';
import { getUnfinishedPractice } from '../../../server/services/practice-service';
import { PracticePanel } from '../../../components/design-system/PracticePanel';

export default async function DashboardPage() {
  const [resume, practice] = await Promise.all([currentJourneyResume(), getUnfinishedPractice()]);
  const stage = resume.stage;
  return <AppShell stage={stage}>
    <section className="reflection-panel">
      <p className="eyebrow">CURRENT STAGE</p>
      <h1>{stage}</h1>
      <p>Continue your journey where you left off.</p>
      <Link className="button" href={resume.href}>Resume</Link>
    </section>
    {practice ? <PracticePanel state={practice.state.replaceAll('_',' ')} nextStep={practice.nextRightStepText} returnAction={<Link className="button" href={`/practices/${practice.id}`}>Return to this practice</Link>} /> : null}
    <p><Link href="/history">View formation history</Link></p>
  </AppShell>;
}
