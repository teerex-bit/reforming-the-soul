import Link from 'next/link';
import { AppShell } from '../../../components/design-system/AppShell';
import { resumeCurriculum } from '../../../server/services/curriculum-service';

function stageLabel(nodeId: string): 'Awaken' | 'See Clearly' | 'Become' | 'Join' {
  if (nodeId.startsWith('see-clearly') || nodeId === 'bridge.awaken-see-clearly') return 'See Clearly';
  if (nodeId.startsWith('become') || nodeId === 'bridge.see-clearly-become') return 'Become';
  return 'Awaken';
}

export default async function DashboardPage() {
  const resume = await resumeCurriculum();
  const stage = stageLabel(resume.currentNodeId);
  return <AppShell stage={stage}>
    <section className="reflection-panel">
      <p className="eyebrow">CURRENT STAGE</p>
      <h1>{stage}</h1>
      <p>Your curriculum resume point is kept separate from any practice you may later open or return to.</p>
      <Link className="button" href={`/formation/${resume.currentNodeId}`}>Resume</Link>
    </section>
  </AppShell>;
}
