begin;
select plan(11);

insert into auth.users (id, instance_id, aud, role, email, encrypted_password, email_confirmed_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at)
values
  ('00000000-0000-4000-8000-0000000000a1', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'owner-a@example.test', '', now(), '{}', '{}', now(), now()),
  ('00000000-0000-4000-8000-0000000000b2', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'owner-b@example.test', '', now(), '{}', '{}', now(), now());

insert into public.journal_entries (id, user_id, curriculum_version_id, node_id, entry_kind, body) values
  ('30000000-0000-4000-8000-0000000000a1', '00000000-0000-4000-8000-0000000000a1', 'phase-1-v1', 'awaken.pay-attention.observe', 'event', 'A'),
  ('30000000-0000-4000-8000-0000000000b2', '00000000-0000-4000-8000-0000000000b2', 'phase-1-v1', 'awaken.pay-attention.observe', 'event', 'B'),
  ('30000000-0000-4000-8000-0000000000a2', '00000000-0000-4000-8000-0000000000a1', 'phase-1-v1', 'become.control', 'control_target', 'A control'),
  ('30000000-0000-4000-8000-0000000000a3', '00000000-0000-4000-8000-0000000000a1', 'phase-1-v1', 'become.receive', 'present_truth', 'A truth'),
  ('30000000-0000-4000-8000-0000000000a4', '00000000-0000-4000-8000-0000000000a1', 'phase-1-v1', 'become.next-step', 'next_right_step', 'A step');
insert into public.practices (id, user_id, curriculum_version_id, node_id, control_target_entry_id, present_truth_entry_id, next_right_step_entry_id, state)
values ('40000000-0000-4000-8000-0000000000a1', '00000000-0000-4000-8000-0000000000a1', 'phase-1-v1', 'become.practice.open',
  '30000000-0000-4000-8000-0000000000a2', '30000000-0000-4000-8000-0000000000a3', '30000000-0000-4000-8000-0000000000a4', 'waiting_for_real_life');
insert into public.ai_threads (id, user_id, intent_id, request_fingerprint, mode, stage, curriculum_version_id, node_id, status,
  model_id, global_policy_version, stage_policy_version, mode_policy_version, output_schema_version)
values ('50000000-0000-4000-8000-0000000000a1', '00000000-0000-4000-8000-0000000000a1', '50000000-0000-4000-8000-000000000001',
  'fingerprint-a', 'reflect', 'awaken', 'phase-1-v1', 'awaken.pay-attention.reflect', 'success', 'test-model', 'g1', 's1', 'm1', 'o1');
insert into public.ai_artifacts (id, user_id, thread_id, artifact_type, content, status, provenance, model_id,
  global_policy_version, stage_policy_version, mode_policy_version, output_schema_version)
values ('60000000-0000-4000-8000-0000000000a1', '00000000-0000-4000-8000-0000000000a1', '50000000-0000-4000-8000-0000000000a1',
  'summary', '{"summary":"test"}', 'suggested', 'ai_suggested', 'test-model', 'g1', 's1', 'm1', 'o1');
insert into public.ai_context_grants (id, user_id, journal_entry_id, scope)
values
  ('70000000-0000-4000-8000-0000000000a1', '00000000-0000-4000-8000-0000000000a1', '30000000-0000-4000-8000-0000000000a1', 'single_entry_reflect'),
  ('70000000-0000-4000-8000-0000000000b2', '00000000-0000-4000-8000-0000000000b2', '30000000-0000-4000-8000-0000000000b2', 'single_entry_reflect');
insert into public.formation_records (id, user_id, curriculum_version_id, node_id, record_type, value_text, source_journal_entry_id, provenance)
values ('61000000-0000-4000-8000-0000000000b2', '00000000-0000-4000-8000-0000000000b2', 'phase-1-v1',
  'see-clearly.fact', 'observable_fact', 'B fact', '30000000-0000-4000-8000-0000000000b2', 'user_authored');

set local role authenticated;
select set_config('request.jwt.claim.sub', '00000000-0000-4000-8000-0000000000a1', true);

select throws_like(
  $$insert into public.formation_records (user_id, curriculum_version_id, node_id, record_type, value_text, source_journal_entry_id, provenance)
    values ('00000000-0000-4000-8000-0000000000a1', 'phase-1-v1', 'see-clearly.fact', 'observable_fact', 'cross',
      '30000000-0000-4000-8000-0000000000b2', 'user_authored')$$,
  '%foreign key%', 'formation records cannot reference another owner journal'
);
select throws_like(
  $$insert into public.ai_context_grants (user_id, journal_entry_id, scope)
    values ('00000000-0000-4000-8000-0000000000a1', '30000000-0000-4000-8000-0000000000b2', 'single_entry_reflect')$$,
  '%permission denied%', 'AI grants cannot be inserted directly'
);
select throws_like(
  $$insert into public.ai_artifact_sources (user_id, artifact_id, journal_entry_id, source_role)
    values ('00000000-0000-4000-8000-0000000000a1', '60000000-0000-4000-8000-0000000000a1',
      '30000000-0000-4000-8000-0000000000b2', 'current')$$,
  '%foreign key%', 'AI artifact sources cannot reference another owner journal'
);
select throws_like(
  $$insert into public.ai_artifact_sources (user_id, artifact_id, journal_entry_id, context_grant_id, grant_revision, source_role)
    values ('00000000-0000-4000-8000-0000000000a1', '60000000-0000-4000-8000-0000000000a1',
      '30000000-0000-4000-8000-0000000000a2', '70000000-0000-4000-8000-0000000000a1', 1, 'selected_prior')$$,
  '%foreign key%', 'selected-prior source grant must be for the same journal entry'
);
select throws_like(
  $$insert into public.ai_artifact_sources (user_id, artifact_id, journal_entry_id, context_grant_id, grant_revision, source_role)
    values ('00000000-0000-4000-8000-0000000000a1', '60000000-0000-4000-8000-0000000000a1',
      '30000000-0000-4000-8000-0000000000a2', '70000000-0000-4000-8000-0000000000b2', 1, 'selected_prior')$$,
  '%foreign key%', 'AI artifact sources cannot cite another owner grant'
);
select throws_like(
  $$insert into public.formation_links (user_id, link_type, source_journal_entry_id, target_formation_record_id)
    values ('00000000-0000-4000-8000-0000000000a1', 'awaken_to_see_clearly',
      '30000000-0000-4000-8000-0000000000a1', '61000000-0000-4000-8000-0000000000b2')$$,
  '%foreign key%', 'formation links reject cross-owner endpoints'
);
select throws_like(
  $$insert into public.practice_returns (user_id, practice_id, outcome_entry_id)
    values ('00000000-0000-4000-8000-0000000000b2', '40000000-0000-4000-8000-0000000000a1',
      '30000000-0000-4000-8000-0000000000b2')$$,
  '%permission denied%', 'practice returns cannot be inserted directly or attached cross-owner'
);
select throws_like(
  $$update public.practices set user_id = '00000000-0000-4000-8000-0000000000b2'
    where id = '40000000-0000-4000-8000-0000000000a1'$$,
  '%permission denied%', 'owned rows cannot be reassigned'
);
select throws_like(
  $$update public.ai_artifacts set status = 'confirmed', provenance = 'user_confirmed_ai'
    where id = '60000000-0000-4000-8000-0000000000a1'$$,
  '%permission denied%', 'AI artifact state and provenance cannot be mutated directly'
);

reset role;
select throws_like(
  $$insert into public.ai_context_grants (user_id, journal_entry_id, scope)
    values ('00000000-0000-4000-8000-0000000000a1', '30000000-0000-4000-8000-0000000000b2', 'single_entry_reflect')$$,
  '%foreign key%', 'AI grant cross-owner relation fails at its composite foreign key'
);
select throws_like(
  $$insert into public.practice_returns (user_id, practice_id, outcome_entry_id)
    values ('00000000-0000-4000-8000-0000000000b2', '40000000-0000-4000-8000-0000000000a1',
      '30000000-0000-4000-8000-0000000000b2')$$,
  '%foreign key%', 'practice-return cross-owner relation fails at its composite foreign key'
);

select * from finish();
rollback;
