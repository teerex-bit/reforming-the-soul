import { notFound, redirect } from 'next/navigation';
import { CurriculumRenderer } from '../../../../components/curriculum/CurriculumRenderer';
import { AppShell } from '../../../../components/design-system/AppShell';
import { PHASE_1_NODES } from '../../../../content/phase-1/v1/curriculum';
import { getCurriculumNode } from '../../../../server/services/curriculum-service';
import { saveAwakenObservation } from '../../../../server/services/observation-service';
import { AIReflectPanel } from '../../../../components/ai/AIReflectPanel';
import { saveConfirmedReflectInsight } from '../../../../server/services/ai-reflect-service';
import { saveSeeClearly } from '../../../../server/services/see-clearly-service';
import { createPractice } from '../../../../server/services/practice-service';
import { PracticeForm } from '../../../../components/practice/PracticeForm';

const awakenObservationIds = ['awaken.pay-attention.observe', 'awaken.pay-attention.inside', 'awaken.pay-attention.body'];
const seeClearlyIds = ['see-clearly.fact', 'see-clearly.interpretation', 'see-clearly.belief-expectation'];

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
  async function saveInsight(input: { threadId: string | null; insightText: string }) {
    'use server';
    await saveConfirmedReflectInsight(input);
    redirect('/formation/bridge.awaken-see-clearly');
  }
  async function saveClarity(values: Record<string, string>) {
    'use server';
    await saveSeeClearly({
      observableFactText: values.observable_fact_text ?? '',
      interpretationText: values.interpretation_text ?? '',
      beliefExpectationType: values.belief_expectation_type as 'belief' | 'expectation',
      beliefExpectationText: values.belief_expectation_text ?? '',
    });
    redirect('/formation/bridge.see-clearly-become');
  }
  const seeClearlyNodes = nodeId === 'see-clearly.fact'
    ? PHASE_1_NODES.filter(candidate => seeClearlyIds.includes(candidate.id))
    : undefined;
  async function savePractice(values: { controlTargetText: string; presentTruthText: string; nextRightStepText: string }) {
    'use server';
    const practice = await createPractice(values);
    redirect(`/practices/${practice.id}`);
  }

  return <AppShell stage={node.stage === 'see-clearly' ? 'See Clearly' : node.stage === 'become' ? 'Become' : 'Awaken'}>
    {nodeId === 'become.control' ? <PracticeForm submit={savePractice} /> : nodeId === 'awaken.pay-attention.reflect'
      ? <AIReflectPanel saveInsight={saveInsight} />
      : <CurriculumRenderer node={node} nodes={observationNodes ?? seeClearlyNodes} onSubmit={observationNodes ? save : seeClearlyNodes ? saveClarity : undefined} />}
  </AppShell>;
}
