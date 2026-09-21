begin;
select plan(11);

insert into auth.users (id, instance_id, aud, role, email, encrypted_password, email_confirmed_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at)
values
  ('00000000-0000-4000-8000-0000000000a1', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'delete-a@example.test', '', now(), '{}', '{}', now(), now()),
  ('00000000-0000-4000-8000-0000000000b2', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'delete-b@example.test', '', now(), '{}', '{}', now(), now());
insert into public.user_curriculum_state (id, user_id, curriculum_version_id, current_node_id, state, completed_node_ids)
values ('90000000-0000-4000-8000-000000000001', '00000000-0000-4000-8000-0000000000a1', 'phase-1-v1', 'see-clearly.fact', 'in_progress', array['awaken.pay-attention.observe']);
insert into public.journal_entries (id, user_id, curriculum_version_id, node_id, entry_kind, body) values
  ('91000000-0000-4000-8000-000000000001', '00000000-0000-4000-8000-0000000000a1', 'phase-1-v1', 'awaken.pay-attention.observe', 'event', 'source to delete'),
  ('91000000-0000-4000-8000-000000000002', '00000000-0000-4000-8000-0000000000a1', 'phase-1-v1', 'awaken.pay-attention.inside', 'internal_response', 'unrelated source');
insert into public.formation_records (id, user_id, curriculum_version_id, node_id, record_type, value_text, source_journal_entry_id, provenance)
values ('92000000-0000-4000-8000-000000000001', '00000000-0000-4000-8000-0000000000a1', 'phase-1-v1', 'see-clearly.fact', 'observable_fact', 'fact',
  '91000000-0000-4000-8000-000000000001', 'user_authored');
insert into public.ai_threads (id, user_id, intent_id, request_fingerprint, mode, stage, curriculum_version_id, node_id, status,
  model_id, global_policy_version, stage_policy_version, mode_policy_version, output_schema_version)
values ('93000000-0000-4000-8000-000000000001', '00000000-0000-4000-8000-0000000000a1', '93000000-0000-4000-8000-000000000011',
  'delete-test', 'reflect', 'awaken', 'phase-1-v1', 'awaken.pay-attention.reflect', 'success', 'test-model', 'g1', 's1', 'm1', 'o1');
insert into public.ai_artifacts (id, user_id, thread_id, artifact_type, content, status, provenance, model_id,
  global_policy_version, stage_policy_version, mode_policy_version, output_schema_version)
values ('94000000-0000-4000-8000-000000000001', '00000000-0000-4000-8000-0000000000a1', '93000000-0000-4000-8000-000000000001',
  'summary', '{"summary":"derived"}', 'suggested', 'ai_suggested', 'test-model', 'g1', 's1', 'm1', 'o1');
insert into public.ai_context_grants (id, user_id, journal_entry_id, scope)
values ('95000000-0000-4000-8000-000000000001', '00000000-0000-4000-8000-0000000000a1', '91000000-0000-4000-8000-000000000001', 'single_entry_reflect');
insert into public.ai_artifact_sources (user_id, artifact_id, journal_entry_id, context_grant_id, grant_revision, source_role) values
  ('00000000-0000-4000-8000-0000000000a1', '94000000-0000-4000-8000-000000000001', '91000000-0000-4000-8000-000000000001', null, null, 'current'),
  ('00000000-0000-4000-8000-0000000000a1', '94000000-0000-4000-8000-000000000001', '91000000-0000-4000-8000-000000000002', null, null, 'current');

set local role authenticated;
select set_config('request.jwt.claim.sub', '00000000-0000-4000-8000-0000000000b2', true);
select results_eq(
  $$select deleted_entry_id, dependent_artifact_count, dependent_record_count, dependent_link_count, grant_count
    from public.delete_journal_entry_with_dependencies('91000000-0000-4000-8000-000000000001')$$,
  $$values (null::uuid, 0, 0, 0, 0)$$, 'other-owner IDs produce the same neutral result as missing IDs');
select set_config('request.jwt.claim.sub', '00000000-0000-4000-8000-0000000000a1', true);
select results_eq(
  $$select dependent_artifact_count, dependent_record_count, grant_count
    from public.delete_journal_entry_with_dependencies('91000000-0000-4000-8000-000000000001')$$,
  $$values (1, 1, 1)$$, 'deletion reports content-free dependent counts');
select is((select count(*)::integer from public.journal_entries where id = '91000000-0000-4000-8000-000000000001'), 0,
  'source journal is hard deleted');
select is((select count(*)::integer from public.ai_artifacts where id = '94000000-0000-4000-8000-000000000001'), 0,
  'whole AI artifact is deleted even when it had another source');
select is((select count(*)::integer from public.ai_artifact_sources where artifact_id = '94000000-0000-4000-8000-000000000001'), 0,
  'artifact dependency rows are deleted');
select is((select count(*)::integer from public.ai_context_grants where journal_entry_id = '91000000-0000-4000-8000-000000000001'), 0,
  'entry grants are deleted');
select is((select count(*)::integer from public.formation_records where source_journal_entry_id = '91000000-0000-4000-8000-000000000001'), 0,
  'single-source formation records are deleted');
select is((select count(*)::integer from public.user_curriculum_state), 1, 'curriculum progress is preserved');
select is((select count(*)::integer from public.journal_entries where id = '91000000-0000-4000-8000-000000000002'), 1,
  'unrelated journal data is preserved');
select is((select count(*)::integer from public.audit_events where object_id = '91000000-0000-4000-8000-000000000001'), 1,
  'one content-free deletion audit event is written');
select results_eq(
  $$select deleted_entry_id, dependent_artifact_count, dependent_record_count, dependent_link_count, grant_count
    from public.delete_journal_entry_with_dependencies('91000000-0000-4000-8000-000000000099')$$,
  $$values (null::uuid, 0, 0, 0, 0)$$, 'missing IDs return a neutral result');

select * from finish();
rollback;
