import type { CurriculumNode, CurriculumSeed, InteractionDefinition } from '../../../domain/curriculum';
import { STAGE_ORDER } from '../../../domain/stages';

const field = (
  id: string,
  input: 'text' | 'multiline' | 'single_choice' = 'multiline',
  options?: readonly string[],
  required = true,
  exactUserText = true,
) => ({ id, input, required, exactUserText, ...(options ? { options } : {}) }) as const;

const interaction = (definition: Omit<InteractionDefinition, 'kind'>): InteractionDefinition => ({
  kind: 'interaction',
  ...definition,
});

export const PHASE_1_NODES: readonly CurriculumNode[] = [
  {
    id: 'awaken.pay-attention', version: 'phase-1-v1', stage: 'awaken', kind: 'session', parentId: null, order: 1,
    content: {
      kind: 'session', title: 'Pay Attention',
      teaching: 'Formation begins by paying attention to what is happening around you and within you. Notice before you explain, judge, or fix.',
    },
  },
  {
    id: 'awaken.pay-attention.observe', version: 'phase-1-v1', stage: 'awaken', kind: 'interaction', parentId: 'awaken.pay-attention', order: 2,
    content: interaction({ interactionType: 'notice', prompt: 'What happened?', help: 'Describe the situation in your own words.', fields: [field('event_text')] }),
  },
  {
    id: 'awaken.pay-attention.inside', version: 'phase-1-v1', stage: 'awaken', kind: 'interaction', parentId: 'awaken.pay-attention', order: 3,
    content: interaction({ interactionType: 'notice', prompt: 'What happened inside me?', help: 'Notice thoughts, emotions, impulses, or reactions without diagnosing them.', fields: [field('internal_response_text')] }),
  },
  {
    id: 'awaken.pay-attention.body', version: 'phase-1-v1', stage: 'awaken', kind: 'interaction', parentId: 'awaken.pay-attention', order: 4,
    content: interaction({ interactionType: 'notice', prompt: 'What did you notice in your body?', help: 'Name one body cue, such as tension, warmth, restlessness, heaviness, or a change in breathing.', fields: [field('body_cue_text', 'text')] }),
  },
  {
    id: 'awaken.pay-attention.reflect', version: 'phase-1-v1', stage: 'awaken', kind: 'interaction', parentId: 'awaken.pay-attention', order: 5,
    content: interaction({
      interactionType: 'ai_reflect', action: 'Reflect with AI',
      disclosure: 'AI can ask a careful follow-up. It is not an authority and will not diagnose you or tell you what God is saying.',
      output: '1–3 questions', fields: [field('added_insight_text', 'multiline', undefined, false)],
      saveAction: 'Save my added insight',
      aiContext: { currentEntry: true, priorEntryAccess: 'none' },
    }),
  },
  {
    id: 'bridge.awaken-see-clearly', version: 'phase-1-v1', stage: 'see-clearly', kind: 'bridge', parentId: null, order: 6,
    content: {
      kind: 'bridge', title: 'See clearly',
      teaching: 'A situation and the meaning we give it are related, but they are not the same. Separate what could be observed from what you concluded.',
      fromStage: 'awaken', toStage: 'see-clearly', targetNodeId: 'see-clearly.fact',
    },
  },
  {
    id: 'see-clearly.fact', version: 'phase-1-v1', stage: 'see-clearly', kind: 'interaction', parentId: null, order: 7,
    content: interaction({ interactionType: 'notice', prompt: 'What is the observable fact?', help: 'Write only what a camera or careful witness could observe.', fields: [field('observable_fact_text')] }),
  },
  {
    id: 'see-clearly.interpretation', version: 'phase-1-v1', stage: 'see-clearly', kind: 'interaction', parentId: null, order: 8,
    content: interaction({ interactionType: 'interpret', prompt: 'What is my interpretation?', help: 'Name the meaning, conclusion, or story you attached to the fact.', fields: [field('interpretation_text')] }),
  },
  {
    id: 'see-clearly.belief-expectation', version: 'phase-1-v1', stage: 'see-clearly', kind: 'interaction', parentId: null, order: 9,
    content: interaction({
      interactionType: 'name', prompt: 'What belief or expectation is present?',
      fields: [field('belief_expectation_type', 'single_choice', ['belief', 'expectation'], true, false), field('belief_expectation_text')],
    }),
  },
  {
    id: 'bridge.see-clearly-become', version: 'phase-1-v1', stage: 'become', kind: 'bridge', parentId: null, order: 10,
    content: {
      kind: 'bridge', title: 'Become in the present moment',
      teaching: 'You may not control the outcome, but you can receive what is true now and choose a faithful next step.',
      fromStage: 'see-clearly', toStage: 'become', targetNodeId: 'become.control',
    },
  },
  {
    id: 'become.control', version: 'phase-1-v1', stage: 'become', kind: 'interaction', parentId: null, order: 11,
    content: interaction({ interactionType: 'name', prompt: 'What outcome am I trying to control?', fields: [field('control_target_text')] }),
  },
  {
    id: 'become.receive', version: 'phase-1-v1', stage: 'become', kind: 'interaction', parentId: null, order: 12,
    content: interaction({ interactionType: 'reflect', prompt: 'What is actually true in the present moment?', help: 'Name what you can honestly receive as true now, without predicting the future.', fields: [field('present_truth_text')] }),
  },
  {
    id: 'become.next-step', version: 'phase-1-v1', stage: 'become', kind: 'interaction', parentId: null, order: 13,
    content: interaction({ interactionType: 'practice', prompt: 'What is the next right step?', help: 'Choose one concrete, appropriately bounded action.', fields: [field('next_right_step_text')] }),
  },
  {
    id: 'become.practice.open', version: 'phase-1-v1', stage: 'become', kind: 'interaction', parentId: null, order: 14,
    content: interaction({
      interactionType: 'practice', title: 'Open practice', action: 'Save as open practice',
      help: 'Leave this open and return after you have had an opportunity to practice.',
      output: 'Summary shows control_target_text, present_truth_text, and next_right_step_text separately.',
      lifecycleTarget: 'waiting_for_real_life',
    }),
  },
  {
    id: 'become.practice.return', version: 'phase-1-v1', stage: 'become', kind: 'interaction', parentId: null, order: 15,
    content: interaction({
      interactionType: 'return', title: 'Return to your practice',
      prompt: 'What happened when you took—or had an opportunity to take—the next right step?',
      fields: [field('practice_outcome_text')], lifecycleTarget: 'ready_to_review',
    }),
  },
  {
    id: 'become.practice.review', version: 'phase-1-v1', stage: 'become', kind: 'interaction', parentId: null, order: 16,
    content: interaction({
      interactionType: 'reflect', title: 'Review the practice', prompt: 'What are you noticing now?',
      help: 'Displays the original plan and outcome separately. No score or maturity judgment.',
      fields: [field('review_text')], saveAction: 'Save review', closeAction: 'Close practice', lifecycleTarget: 'reviewed',
    }),
  },
] as const;

export const PHASE_1_CURRICULUM: CurriculumSeed = {
  version: 'phase-1-v1',
  startNodeId: 'awaken.pay-attention.observe',
  terminalNodeId: 'become.practice.review',
  stages: STAGE_ORDER,
  nodes: PHASE_1_NODES,
};
