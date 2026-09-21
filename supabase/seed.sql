insert into public.curriculum_versions (id, status, content_hash, published_at)
values ('phase-1-v1', 'active', 'aeed790c', '2026-09-20T00:00:00Z');

insert into public.curriculum_nodes (id, version_id, stage, kind, parent_id, sort_order, content)
values
  (
    'awaken.pay-attention', 'phase-1-v1', 'awaken', 'session', null, 1,
    '{"kind":"session","title":"Pay Attention","teaching":"Formation begins by paying attention to what is happening around you and within you. Notice before you explain, judge, or fix."}'::jsonb
  ),
  (
    'awaken.pay-attention.observe', 'phase-1-v1', 'awaken', 'interaction', 'awaken.pay-attention', 2,
    '{"kind":"interaction","interactionType":"notice","prompt":"What happened?","help":"Describe the situation in your own words.","fields":[{"id":"event_text","input":"multiline","required":true,"exactUserText":true}]}'::jsonb
  ),
  (
    'awaken.pay-attention.inside', 'phase-1-v1', 'awaken', 'interaction', 'awaken.pay-attention', 3,
    '{"kind":"interaction","interactionType":"notice","prompt":"What happened inside me?","help":"Notice thoughts, emotions, impulses, or reactions without diagnosing them.","fields":[{"id":"internal_response_text","input":"multiline","required":true,"exactUserText":true}]}'::jsonb
  ),
  (
    'awaken.pay-attention.body', 'phase-1-v1', 'awaken', 'interaction', 'awaken.pay-attention', 4,
    '{"kind":"interaction","interactionType":"notice","prompt":"What did you notice in your body?","help":"Name one body cue, such as tension, warmth, restlessness, heaviness, or a change in breathing.","fields":[{"id":"body_cue_text","input":"text","required":true,"exactUserText":true}]}'::jsonb
  ),
  (
    'awaken.pay-attention.reflect', 'phase-1-v1', 'awaken', 'interaction', 'awaken.pay-attention', 5,
    '{"kind":"interaction","interactionType":"ai_reflect","action":"Reflect with AI","disclosure":"AI can ask a careful follow-up. It is not an authority and will not diagnose you or tell you what God is saying.","output":"1–3 questions","fields":[{"id":"added_insight_text","input":"multiline","required":false,"exactUserText":true}],"saveAction":"Save my added insight","aiContext":{"currentEntry":true,"priorEntryAccess":"none"}}'::jsonb
  ),
  (
    'bridge.awaken-see-clearly', 'phase-1-v1', 'see-clearly', 'bridge', null, 6,
    '{"kind":"bridge","title":"See clearly","teaching":"A situation and the meaning we give it are related, but they are not the same. Separate what could be observed from what you concluded.","fromStage":"awaken","toStage":"see-clearly","targetNodeId":"see-clearly.fact"}'::jsonb
  ),
  (
    'see-clearly.fact', 'phase-1-v1', 'see-clearly', 'interaction', null, 7,
    '{"kind":"interaction","interactionType":"notice","prompt":"What is the observable fact?","help":"Write only what a camera or careful witness could observe.","fields":[{"id":"observable_fact_text","input":"multiline","required":true,"exactUserText":true}]}'::jsonb
  ),
  (
    'see-clearly.interpretation', 'phase-1-v1', 'see-clearly', 'interaction', null, 8,
    '{"kind":"interaction","interactionType":"interpret","prompt":"What is my interpretation?","help":"Name the meaning, conclusion, or story you attached to the fact.","fields":[{"id":"interpretation_text","input":"multiline","required":true,"exactUserText":true}]}'::jsonb
  ),
  (
    'see-clearly.belief-expectation', 'phase-1-v1', 'see-clearly', 'interaction', null, 9,
    '{"kind":"interaction","interactionType":"name","prompt":"What belief or expectation is present?","fields":[{"id":"belief_expectation_type","input":"single_choice","required":true,"exactUserText":false,"options":["belief","expectation"]},{"id":"belief_expectation_text","input":"multiline","required":true,"exactUserText":true}]}'::jsonb
  ),
  (
    'bridge.see-clearly-become', 'phase-1-v1', 'become', 'bridge', null, 10,
    '{"kind":"bridge","title":"Become in the present moment","teaching":"You may not control the outcome, but you can receive what is true now and choose a faithful next step.","fromStage":"see-clearly","toStage":"become","targetNodeId":"become.control"}'::jsonb
  ),
  (
    'become.control', 'phase-1-v1', 'become', 'interaction', null, 11,
    '{"kind":"interaction","interactionType":"name","prompt":"What outcome am I trying to control?","fields":[{"id":"control_target_text","input":"multiline","required":true,"exactUserText":true}]}'::jsonb
  ),
  (
    'become.receive', 'phase-1-v1', 'become', 'interaction', null, 12,
    '{"kind":"interaction","interactionType":"reflect","prompt":"What is actually true in the present moment?","help":"Name what you can honestly receive as true now, without predicting the future.","fields":[{"id":"present_truth_text","input":"multiline","required":true,"exactUserText":true}]}'::jsonb
  ),
  (
    'become.next-step', 'phase-1-v1', 'become', 'interaction', null, 13,
    '{"kind":"interaction","interactionType":"practice","prompt":"What is the next right step?","help":"Choose one concrete, appropriately bounded action.","fields":[{"id":"next_right_step_text","input":"multiline","required":true,"exactUserText":true}]}'::jsonb
  ),
  (
    'become.practice.open', 'phase-1-v1', 'become', 'interaction', null, 14,
    '{"kind":"interaction","interactionType":"practice","title":"Open practice","action":"Save as open practice","help":"Leave this open and return after you have had an opportunity to practice.","output":"Summary shows control_target_text, present_truth_text, and next_right_step_text separately.","lifecycleTarget":"waiting_for_real_life"}'::jsonb
  ),
  (
    'become.practice.return', 'phase-1-v1', 'become', 'interaction', null, 15,
    '{"kind":"interaction","interactionType":"return","title":"Return to your practice","prompt":"What happened when you took—or had an opportunity to take—the next right step?","fields":[{"id":"practice_outcome_text","input":"multiline","required":true,"exactUserText":true}],"lifecycleTarget":"ready_to_review"}'::jsonb
  ),
  (
    'become.practice.review', 'phase-1-v1', 'become', 'interaction', null, 16,
    '{"kind":"interaction","interactionType":"reflect","title":"Review the practice","prompt":"What are you noticing now?","help":"Displays the original plan and outcome separately. No score or maturity judgment.","fields":[{"id":"review_text","input":"multiline","required":true,"exactUserText":true}],"saveAction":"Save review","closeAction":"Close practice","lifecycleTarget":"reviewed"}'::jsonb
  );
