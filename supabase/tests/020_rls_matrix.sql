begin;
select plan(36);

insert into auth.users (id, instance_id, aud, role, email, encrypted_password, email_confirmed_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at)
values
  ('00000000-0000-4000-8000-0000000000a1', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'task3-a@example.test', '', now(), '{}', '{}', now(), now()),
  ('00000000-0000-4000-8000-0000000000b2', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'task3-b@example.test', '', now(), '{}', '{}', now(), now());

insert into public.profiles (id, user_id)
values ('10000000-0000-4000-8000-0000000000b2', '00000000-0000-4000-8000-0000000000b2');
insert into public.user_curriculum_state (id, user_id, curriculum_version_id, current_node_id, state, completed_node_ids)
values ('11000000-0000-4000-8000-0000000000b2', '00000000-0000-4000-8000-0000000000b2', 'phase-1-v1', 'awaken.pay-attention.observe', 'in_progress', array[]::text[]);
insert into public.journal_entries (id, user_id, curriculum_version_id, node_id, entry_kind, body) values
  ('20000000-0000-4000-8000-0000000000a1', '00000000-0000-4000-8000-0000000000a1', 'phase-1-v1', 'awaken.pay-attention.observe', 'event', 'User A exact words'),
  ('21000000-0000-4000-8000-0000000000a1', '00000000-0000-4000-8000-0000000000a1', 'phase-1-v1', 'become.control', 'control_target', 'A control'),
  ('22000000-0000-4000-8000-0000000000a1', '00000000-0000-4000-8000-0000000000a1', 'phase-1-v1', 'become.receive', 'present_truth', 'A truth'),
  ('23000000-0000-4000-8000-0000000000a1', '00000000-0000-4000-8000-0000000000a1', 'phase-1-v1', 'become.next-step', 'next_right_step', 'A step'),
  ('24000000-0000-4000-8000-0000000000a1', '00000000-0000-4000-8000-0000000000a1', 'phase-1-v1', 'become.practice.return', 'practice_outcome', 'A outcome'),
  ('20000000-0000-4000-8000-0000000000b2', '00000000-0000-4000-8000-0000000000b2', 'phase-1-v1', 'awaken.pay-attention.observe', 'event', 'User B exact words'),
  ('21000000-0000-4000-8000-0000000000b2', '00000000-0000-4000-8000-0000000000b2', 'phase-1-v1', 'become.control', 'control_target', 'B control'),
  ('22000000-0000-4000-8000-0000000000b2', '00000000-0000-4000-8000-0000000000b2', 'phase-1-v1', 'become.receive', 'present_truth', 'B truth'),
  ('23000000-0000-4000-8000-0000000000b2', '00000000-0000-4000-8000-0000000000b2', 'phase-1-v1', 'become.next-step', 'next_right_step', 'B step'),
  ('24000000-0000-4000-8000-0000000000b2', '00000000-0000-4000-8000-0000000000b2', 'phase-1-v1', 'become.practice.return', 'practice_outcome', 'B outcome');
insert into public.formation_records (id, user_id, curriculum_version_id, node_id, record_type, value_text, source_journal_entry_id, provenance) values
  ('30000000-0000-4000-8000-0000000000a1', '00000000-0000-4000-8000-0000000000a1', 'phase-1-v1', 'see-clearly.fact', 'observable_fact', 'A fact', '20000000-0000-4000-8000-0000000000a1', 'user_authored'),
  ('30000000-0000-4000-8000-0000000000b2', '00000000-0000-4000-8000-0000000000b2', 'phase-1-v1', 'see-clearly.fact', 'observable_fact', 'B fact', '20000000-0000-4000-8000-0000000000b2', 'user_authored');
insert into public.practices (id, user_id, curriculum_version_id, node_id, control_target_entry_id, present_truth_entry_id, next_right_step_entry_id, state) values
  ('40000000-0000-4000-8000-0000000000a1', '00000000-0000-4000-8000-0000000000a1', 'phase-1-v1', 'become.practice.open', '21000000-0000-4000-8000-0000000000a1', '22000000-0000-4000-8000-0000000000a1', '23000000-0000-4000-8000-0000000000a1', 'ready_to_review'),
  ('40000000-0000-4000-8000-0000000000b2', '00000000-0000-4000-8000-0000000000b2', 'phase-1-v1', 'become.practice.open', '21000000-0000-4000-8000-0000000000b2', '22000000-0000-4000-8000-0000000000b2', '23000000-0000-4000-8000-0000000000b2', 'ready_to_review');
insert into public.practice_returns (id, user_id, practice_id, outcome_entry_id) values
  ('41000000-0000-4000-8000-0000000000a1', '00000000-0000-4000-8000-0000000000a1', '40000000-0000-4000-8000-0000000000a1', '24000000-0000-4000-8000-0000000000a1'),
  ('41000000-0000-4000-8000-0000000000b2', '00000000-0000-4000-8000-0000000000b2', '40000000-0000-4000-8000-0000000000b2', '24000000-0000-4000-8000-0000000000b2');
insert into public.formation_links (id, user_id, link_type, source_practice_id, target_journal_entry_id) values
  ('42000000-0000-4000-8000-0000000000a1', '00000000-0000-4000-8000-0000000000a1', 'practice_to_return', '40000000-0000-4000-8000-0000000000a1', '24000000-0000-4000-8000-0000000000a1'),
  ('42000000-0000-4000-8000-0000000000b2', '00000000-0000-4000-8000-0000000000b2', 'practice_to_return', '40000000-0000-4000-8000-0000000000b2', '24000000-0000-4000-8000-0000000000b2');
insert into public.ai_threads (id, user_id, intent_id, request_fingerprint, mode, stage, curriculum_version_id, node_id, status, model_id, global_policy_version, stage_policy_version, mode_policy_version, output_schema_version) values
  ('50000000-0000-4000-8000-0000000000a1', '00000000-0000-4000-8000-0000000000a1', '51000000-0000-4000-8000-0000000000a1', 'fp-a', 'reflect', 'awaken', 'phase-1-v1', 'awaken.pay-attention.reflect', 'success', 'test-model', 'g1', 's1', 'm1', 'o1'),
  ('50000000-0000-4000-8000-0000000000b2', '00000000-0000-4000-8000-0000000000b2', '51000000-0000-4000-8000-0000000000b2', 'fp-b', 'reflect', 'awaken', 'phase-1-v1', 'awaken.pay-attention.reflect', 'success', 'test-model', 'g1', 's1', 'm1', 'o1');
insert into public.ai_artifacts (id, user_id, thread_id, artifact_type, content, status, provenance, model_id, global_policy_version, stage_policy_version, mode_policy_version, output_schema_version) values
  ('60000000-0000-4000-8000-0000000000a1', '00000000-0000-4000-8000-0000000000a1', '50000000-0000-4000-8000-0000000000a1', 'summary', '{"summary":"A"}', 'suggested', 'ai_suggested', 'test-model', 'g1', 's1', 'm1', 'o1'),
  ('60000000-0000-4000-8000-0000000000b2', '00000000-0000-4000-8000-0000000000b2', '50000000-0000-4000-8000-0000000000b2', 'summary', '{"summary":"B"}', 'suggested', 'ai_suggested', 'test-model', 'g1', 's1', 'm1', 'o1');
insert into public.ai_context_grants (id, user_id, journal_entry_id, scope) values
  ('70000000-0000-4000-8000-0000000000a1', '00000000-0000-4000-8000-0000000000a1', '20000000-0000-4000-8000-0000000000a1', 'single_entry_reflect'),
  ('70000000-0000-4000-8000-0000000000b2', '00000000-0000-4000-8000-0000000000b2', '20000000-0000-4000-8000-0000000000b2', 'single_entry_reflect');
insert into public.ai_artifact_sources (id, user_id, artifact_id, journal_entry_id, source_role) values
  ('71000000-0000-4000-8000-0000000000a1', '00000000-0000-4000-8000-0000000000a1', '60000000-0000-4000-8000-0000000000a1', '20000000-0000-4000-8000-0000000000a1', 'current'),
  ('71000000-0000-4000-8000-0000000000b2', '00000000-0000-4000-8000-0000000000b2', '60000000-0000-4000-8000-0000000000b2', '20000000-0000-4000-8000-0000000000b2', 'current');
insert into public.audit_events (id, user_id, event_type, object_type, object_id) values
  ('80000000-0000-4000-8000-0000000000a1', '00000000-0000-4000-8000-0000000000a1', 'journal_entry_deleted', 'journal_entry', '20000000-0000-4000-8000-0000000000a1'),
  ('80000000-0000-4000-8000-0000000000b2', '00000000-0000-4000-8000-0000000000b2', 'journal_entry_deleted', 'journal_entry', '20000000-0000-4000-8000-0000000000b2');

set local role authenticated;
select set_config('request.jwt.claim.sub', '00000000-0000-4000-8000-0000000000a1', true);
select is(current_user, 'authenticated', 'matrix runs under the real authenticated role');
select is(auth.uid()::text, '00000000-0000-4000-8000-0000000000a1', 'auth.uid resolves User A');

select lives_ok($$insert into public.profiles (id, user_id) values ('10000000-0000-4000-8000-0000000000a1', '00000000-0000-4000-8000-0000000000a1')$$, 'User A can insert its profile');
select lives_ok($$insert into public.user_curriculum_state (id, user_id, curriculum_version_id, current_node_id, state, completed_node_ids) values ('11000000-0000-4000-8000-0000000000a1', '00000000-0000-4000-8000-0000000000a1', 'phase-1-v1', 'awaken.pay-attention.observe', 'in_progress', array[]::text[])$$, 'User A can insert its curriculum state');
select lives_ok($$insert into public.journal_entries (id, user_id, curriculum_version_id, node_id, entry_kind, body) values ('20100000-0000-4000-8000-0000000000a1', '00000000-0000-4000-8000-0000000000a1', 'phase-1-v1', 'awaken.pay-attention.inside', 'internal_response', 'A second exact entry')$$, 'User A can insert exact journal wording');
select lives_ok($$insert into public.formation_records (id, user_id, curriculum_version_id, node_id, record_type, value_text, source_journal_entry_id, provenance) values ('30100000-0000-4000-8000-0000000000a1', '00000000-0000-4000-8000-0000000000a1', 'phase-1-v1', 'see-clearly.fact', 'observable_fact', 'A second fact', '20100000-0000-4000-8000-0000000000a1', 'user_authored')$$, 'User A can insert same-owner structured data');
select lives_ok($$insert into public.practices (id, user_id, curriculum_version_id, node_id, control_target_entry_id, present_truth_entry_id, next_right_step_entry_id, state) values ('40100000-0000-4000-8000-0000000000a1', '00000000-0000-4000-8000-0000000000a1', 'phase-1-v1', 'become.practice.open', '21000000-0000-4000-8000-0000000000a1', '22000000-0000-4000-8000-0000000000a1', '23000000-0000-4000-8000-0000000000a1', 'draft')$$, 'User A can insert an owned initial practice');
select lives_ok($$insert into public.formation_links (id, user_id, link_type, source_journal_entry_id, target_formation_record_id) values ('42100000-0000-4000-8000-0000000000a1', '00000000-0000-4000-8000-0000000000a1', 'awaken_to_see_clearly', '20000000-0000-4000-8000-0000000000a1', '30100000-0000-4000-8000-0000000000a1')$$, 'User A can insert a same-owner typed link');
select lives_ok($$insert into public.ai_threads (id, user_id, intent_id, request_fingerprint, mode, stage, curriculum_version_id, node_id, status, model_id, global_policy_version, stage_policy_version, mode_policy_version, output_schema_version) values ('50100000-0000-4000-8000-0000000000a1', '00000000-0000-4000-8000-0000000000a1', '51100000-0000-4000-8000-0000000000a1', 'fp-a-2', 'reflect', 'awaken', 'phase-1-v1', 'awaken.pay-attention.reflect', 'success', 'test-model', 'g1', 's1', 'm1', 'o1')$$, 'User A can insert owned content-free AI thread metadata');
select lives_ok($$insert into public.ai_artifacts (id, user_id, thread_id, artifact_type, content, status, provenance, model_id, global_policy_version, stage_policy_version, mode_policy_version, output_schema_version) values ('60100000-0000-4000-8000-0000000000a1', '00000000-0000-4000-8000-0000000000a1', '50100000-0000-4000-8000-0000000000a1', 'summary', '{"summary":"A2"}', 'suggested', 'ai_suggested', 'test-model', 'g1', 's1', 'm1', 'o1')$$, 'User A can insert an owned suggested AI artifact');
select lives_ok($$insert into public.ai_artifact_sources (id, user_id, artifact_id, journal_entry_id, source_role) values ('71100000-0000-4000-8000-0000000000a1', '00000000-0000-4000-8000-0000000000a1', '60100000-0000-4000-8000-0000000000a1', '20100000-0000-4000-8000-0000000000a1', 'current')$$, 'User A can insert same-owner AI source provenance');

select results_eq(
  $$select * from (values
    ('ai_artifact_sources', (select count(*)::integer from public.ai_artifact_sources)), ('ai_artifacts', (select count(*)::integer from public.ai_artifacts)), ('ai_context_grants', (select count(*)::integer from public.ai_context_grants)), ('ai_threads', (select count(*)::integer from public.ai_threads)), ('audit_events', (select count(*)::integer from public.audit_events)), ('formation_links', (select count(*)::integer from public.formation_links)), ('formation_records', (select count(*)::integer from public.formation_records)), ('journal_entries', (select count(*)::integer from public.journal_entries)), ('practice_returns', (select count(*)::integer from public.practice_returns)), ('practices', (select count(*)::integer from public.practices)), ('profiles', (select count(*)::integer from public.profiles)), ('user_curriculum_state', (select count(*)::integer from public.user_curriculum_state))
  ) observed(table_name, row_count)$$,
  $$values ('ai_artifact_sources',2),('ai_artifacts',2),('ai_context_grants',1),('ai_threads',2),('audit_events',1),('formation_links',2),('formation_records',2),('journal_entries',6),('practice_returns',1),('practices',2),('profiles',1),('user_curriculum_state',1)$$,
  'User A sees all and only User A rows across every private table'
);
select is((select body from public.journal_entries where id = '20000000-0000-4000-8000-0000000000a1'), 'User A exact words', 'RLS preserves exact wording');
select throws_like($$insert into public.journal_entries (user_id, curriculum_version_id, node_id, entry_kind, body) values ('00000000-0000-4000-8000-0000000000b2', 'phase-1-v1', 'awaken.pay-attention.inside', 'internal_response', 'cross owner')$$, '%row-level security%', 'User A cannot insert User B data');
select throws_like($$update public.journal_entries set body = 'rewritten' where id = '20000000-0000-4000-8000-0000000000a1'$$, '%permission denied%', 'saved journal wording cannot be updated directly');
select throws_like($$delete from public.journal_entries where id = '20000000-0000-4000-8000-0000000000a1'$$, '%permission denied%', 'journal entries cannot be deleted directly');

select set_config('request.jwt.claim.sub', '00000000-0000-4000-8000-0000000000b2', true);
select is(auth.uid()::text, '00000000-0000-4000-8000-0000000000b2', 'auth.uid resolves User B');
select lives_ok($$insert into public.journal_entries (id, user_id, curriculum_version_id, node_id, entry_kind, body) values ('20100000-0000-4000-8000-0000000000b2', '00000000-0000-4000-8000-0000000000b2', 'phase-1-v1', 'awaken.pay-attention.inside', 'internal_response', 'B second exact entry')$$, 'User B can write User B journal data');
select throws_like($$insert into public.journal_entries (user_id, curriculum_version_id, node_id, entry_kind, body) values ('00000000-0000-4000-8000-0000000000a1', 'phase-1-v1', 'awaken.pay-attention.inside', 'internal_response', 'cross owner')$$, '%row-level security%', 'User B cannot insert User A data');
select results_eq(
  $$select * from (values
    ('ai_artifact_sources', (select count(*)::integer from public.ai_artifact_sources)), ('ai_artifacts', (select count(*)::integer from public.ai_artifacts)), ('ai_context_grants', (select count(*)::integer from public.ai_context_grants)), ('ai_threads', (select count(*)::integer from public.ai_threads)), ('audit_events', (select count(*)::integer from public.audit_events)), ('formation_links', (select count(*)::integer from public.formation_links)), ('formation_records', (select count(*)::integer from public.formation_records)), ('journal_entries', (select count(*)::integer from public.journal_entries)), ('practice_returns', (select count(*)::integer from public.practice_returns)), ('practices', (select count(*)::integer from public.practices)), ('profiles', (select count(*)::integer from public.profiles)), ('user_curriculum_state', (select count(*)::integer from public.user_curriculum_state))
  ) observed(table_name, row_count)$$,
  $$values ('ai_artifact_sources',1),('ai_artifacts',1),('ai_context_grants',1),('ai_threads',1),('audit_events',1),('formation_links',1),('formation_records',1),('journal_entries',6),('practice_returns',1),('practices',1),('profiles',1),('user_curriculum_state',1)$$,
  'User B sees all and only User B rows across every private table'
);
select is((select body from public.journal_entries where id = '20000000-0000-4000-8000-0000000000b2'), 'User B exact words', 'User B reads only User B wording');

select throws_like($$insert into public.practice_returns (user_id, practice_id, outcome_entry_id) values ('00000000-0000-4000-8000-0000000000b2', '40000000-0000-4000-8000-0000000000b2', '24000000-0000-4000-8000-0000000000b2')$$, '%permission denied%', 'practice returns deny direct browser insertion');
select throws_like($$insert into public.ai_context_grants (user_id, journal_entry_id, scope) values ('00000000-0000-4000-8000-0000000000b2', '20100000-0000-4000-8000-0000000000b2', 'single_entry_reflect')$$, '%permission denied%', 'AI grants deny direct browser insertion');
select throws_like($$insert into public.audit_events (user_id, event_type, object_type, object_id) values ('00000000-0000-4000-8000-0000000000b2', 'journal_entry_deleted', 'journal_entry', '20100000-0000-4000-8000-0000000000b2')$$, '%permission denied%', 'audit events deny direct browser insertion');

set local role anon;
select set_config('request.jwt.claim.sub', '', true);
select throws_like(format('select * from public.%I', table_name), '%permission denied%', format('anonymous access to %s is rejected', table_name))
from unnest(array[
  'profiles', 'user_curriculum_state', 'journal_entries', 'formation_records', 'practices', 'practice_returns',
  'formation_links', 'ai_threads', 'ai_artifacts', 'ai_artifact_sources', 'ai_context_grants', 'audit_events'
]) private_table(table_name);

select * from finish();
rollback;
