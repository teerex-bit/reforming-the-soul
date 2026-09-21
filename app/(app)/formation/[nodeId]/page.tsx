import { notFound, redirect } from 'next/navigation';
import { CurriculumRenderer } from '../../../../components/curriculum/CurriculumRenderer';
import { AppShell } from '../../../../components/design-system/AppShell';
import { PHASE_1_NODES } from '../../../../content/phase-1/v1/curriculum';
import { getCurriculumNode } from '../../../../server/services/curriculum-service';
import { saveAwakenObservation } from '../../../../server/services/observation-service';

const awakenObservationIds = ['awaken.pay-attention.observe', 'awaken.pay-attention.inside', 'awaken.pay-attention.body'];

export default async function FormationNodePage({ params }: { params: Promise<{ nodeId: string }> }) {
  const { nodeId } = await params;
  const node = getCurriculumNode(nodeId);
  if (!node) notFound();

  async function save(values: Record<string, string>) {
    'use server';
    await saveAwakenObservation({
      eventText: values.event_text ?? '',
      internalResponseText: values.internal_response_text ?? '',
      bodyCueText: values.body_cue_text ?? '',
    });
    redirect('/formation/awaken.pay-attention.reflect');
  }

  const observationNodes = nodeId === 'awaken.pay-attention.observe'
    ? PHASE_1_NODES.filter(candidate => awakenObservationIds.includes(candidate.id))
    : undefined;
  return <AppShell stage={node.stage === 'see-clearly' ? 'See Clearly' : node.stage === 'become' ? 'Become' : 'Awaken'}>
    <CurriculumRenderer node={node} nodes={observationNodes} onSubmit={observationNodes ? save : undefined} />
  </AppShell>;
}
