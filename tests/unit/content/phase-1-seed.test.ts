import { describe, expect, it } from 'vitest';
import { serializeCurriculumSeed, validateCurriculumSeed } from '../../../domain/curriculum';
import { PHASE_1_CURRICULUM, PHASE_1_NODE_IDS } from '../../../content/phase-1/v1';

const expectedIds = [
  'awaken.pay-attention',
  'awaken.pay-attention.observe',
  'awaken.pay-attention.inside',
  'awaken.pay-attention.body',
  'awaken.pay-attention.reflect',
  'bridge.awaken-see-clearly',
  'see-clearly.fact',
  'see-clearly.interpretation',
  'see-clearly.belief-expectation',
  'bridge.see-clearly-become',
  'become.control',
  'become.receive',
  'become.next-step',
  'become.practice.open',
  'become.practice.return',
  'become.practice.review',
];

describe('Phase 1 exact vertical-slice seed', () => {
  it('contains only the authorized stable node inventory in exact order', () => {
    expect(PHASE_1_NODE_IDS).toEqual(expectedIds);
    expect(validateCurriculumSeed(PHASE_1_CURRICULUM)).toEqual([]);
  });

  it('has unique node identities and order positions', () => {
    expect(new Set(PHASE_1_CURRICULUM.nodes.map(node => node.id)).size).toBe(16);
    expect(new Set(PHASE_1_CURRICULUM.nodes.map(node => node.order)).size).toBe(16);
  });

  it('resolves both cross-stage bridge targets', () => {
    const bridges = PHASE_1_CURRICULUM.nodes.filter(node => node.kind === 'bridge');
    expect(bridges.map(node => node.content)).toMatchObject([
      { fromStage: 'awaken', toStage: 'see-clearly', targetNodeId: 'see-clearly.fact' },
      { fromStage: 'see-clearly', toStage: 'become', targetNodeId: 'become.control' },
    ]);
  });

  it('preserves the exact authorized prompts, field requirements, and lifecycle metadata', () => {
    const byId = new Map(PHASE_1_CURRICULUM.nodes.map(node => [node.id, node]));
    expect(byId.get('awaken.pay-attention')?.content).toMatchObject({
      title: 'Pay Attention',
      teaching: 'Formation begins by paying attention to what is happening around you and within you. Notice before you explain, judge, or fix.',
    });
    expect(byId.get('awaken.pay-attention.observe')?.content).toMatchObject({
      prompt: 'What happened?',
      fields: [{ id: 'event_text', required: true, exactUserText: true }],
    });
    expect(byId.get('awaken.pay-attention.reflect')?.content).toMatchObject({
      interactionType: 'ai_reflect', action: 'Reflect with AI', saveAction: 'Save my added insight',
      aiContext: { currentEntry: true, priorEntryAccess: 'none' },
      fields: [{ id: 'added_insight_text', required: false, exactUserText: true }],
    });
    expect(byId.get('see-clearly.belief-expectation')?.content).toMatchObject({
      fields: [
        { id: 'belief_expectation_type', input: 'single_choice', required: true, exactUserText: false },
        { id: 'belief_expectation_text', required: true, exactUserText: true },
      ],
    });
    expect(byId.get('become.practice.open')?.content).toMatchObject({ lifecycleTarget: 'waiting_for_real_life' });
    expect(byId.get('become.practice.return')?.content).toMatchObject({ lifecycleTarget: 'ready_to_review' });
    expect(byId.get('become.practice.review')?.content).toMatchObject({
      saveAction: 'Save review', closeAction: 'Close practice', lifecycleTarget: 'reviewed',
    });
  });

  it('serializes deterministically and creates no Join curriculum node', () => {
    expect(serializeCurriculumSeed(PHASE_1_CURRICULUM)).toBe(
      serializeCurriculumSeed(structuredClone(PHASE_1_CURRICULUM)),
    );
    expect(PHASE_1_CURRICULUM.nodes.some(node => node.stage === 'join')).toBe(false);
  });

  it('rejects duplicate IDs, invalid stages, UI configuration, and extra content', () => {
    const duplicate = structuredClone(PHASE_1_CURRICULUM) as unknown as { nodes: Array<Record<string, unknown>> };
    duplicate.nodes[1].id = duplicate.nodes[0].id;
    expect(validateCurriculumSeed(duplicate)).toContain('duplicate curriculum node id: awaken.pay-attention');

    const invalidStage = structuredClone(PHASE_1_CURRICULUM) as unknown as { nodes: Array<Record<string, unknown>> };
    invalidStage.nodes[0].stage = 'walk';
    expect(validateCurriculumSeed(invalidStage)).toContain('node awaken.pay-attention has invalid stage: walk');

    const uiCoupled = structuredClone(PHASE_1_CURRICULUM) as unknown as { nodes: Array<Record<string, unknown>> };
    uiCoupled.nodes[1].component = 'TextareaCard';
    expect(validateCurriculumSeed(uiCoupled)).toContain(
      'node awaken.pay-attention.observe contains unsupported field: component',
    );

    const extra = structuredClone(PHASE_1_CURRICULUM) as unknown as { nodes: Array<Record<string, unknown>> };
    extra.nodes.push({ ...extra.nodes[0], id: 'join.unapproved', order: 17, stage: 'join' });
    expect(validateCurriculumSeed(extra)).toContain('seed contains unauthorized node: join.unapproved');

    const brokenBridge = structuredClone(PHASE_1_CURRICULUM) as unknown as { nodes: Array<Record<string, unknown>> };
    const bridge = brokenBridge.nodes.find(node => node.id === 'bridge.awaken-see-clearly')!;
    (bridge.content as { targetNodeId: string }).targetNodeId = 'see-clearly.missing';
    expect(validateCurriculumSeed(brokenBridge)).toContain(
      'bridge bridge.awaken-see-clearly target does not resolve: see-clearly.missing',
    );

    const invalidInteraction = structuredClone(PHASE_1_CURRICULUM) as unknown as { nodes: Array<Record<string, unknown>> };
    (invalidInteraction.nodes[1].content as Record<string, unknown>).interactionType = 'assessment';
    expect(validateCurriculumSeed(invalidInteraction)).toContain(
      'node awaken.pay-attention.observe has invalid interaction type: assessment',
    );

    const crossStageParent = structuredClone(PHASE_1_CURRICULUM) as unknown as { nodes: Array<Record<string, unknown>> };
    crossStageParent.nodes[6].parentId = 'awaken.pay-attention';
    expect(validateCurriculumSeed(crossStageParent)).toContain('node see-clearly.fact parent must be in the same stage');

    const swappedOrder = structuredClone(PHASE_1_CURRICULUM) as unknown as { nodes: Array<Record<string, unknown>> };
    [swappedOrder.nodes[1].order, swappedOrder.nodes[2].order] = [swappedOrder.nodes[2].order, swappedOrder.nodes[1].order];
    expect(validateCurriculumSeed(swappedOrder)).toContain(
      'node awaken.pay-attention.observe must have order 2',
    );

    const changedPrompt = structuredClone(PHASE_1_CURRICULUM) as unknown as { nodes: Array<Record<string, unknown>> };
    (changedPrompt.nodes[1].content as Record<string, unknown>).prompt = 'Tell us what happened.';
    expect(validateCurriculumSeed(changedPrompt)).toContain(
      'seed content fingerprint does not match the authorized vertical slice',
    );
  });

  it('contains no deferred product capability or spiritual scoring language', () => {
    const serialized = JSON.stringify(PHASE_1_CURRICULUM).toLowerCase();
    for (const prohibited of [
      'mentor_dashboard', 'community', 'social_feed', 'leaderboard', 'badge', 'streak',
      'maturity_score', 'fruit_score', 'subscription', 'ecommerce', 'native_mobile',
    ]) expect(serialized).not.toContain(prohibited);
  });
});
