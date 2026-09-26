begin;
select plan(19);

select tables_are(
  'public',
  array[
    'ai_artifact_sources', 'ai_artifacts', 'ai_context_grants', 'ai_threads',
    'audit_events', 'curriculum_nodes', 'curriculum_versions', 'formation_links',
    'deep_dive_module_progress', 'deep_dive_reflections', 'see_clearly_sc1_records', 'see_clearly_sy2_records', 'see_clearly_sy3_records', 'see_clearly_sy4_records', 'see_clearly_sg1_records', 'formation_records', 'journal_entries', 'practice_returns', 'practices',
    'profiles', 'user_curriculum_state'
  ],
  'Phase 1 creates only the approved public tables'
);

select enum_has_labels('public', 'stage_id', array['awaken', 'see-clearly', 'become', 'join'],
  'primary stages are canonical and ordered');
select ok(
  not exists (select 1 from unnest(enum_range(null::public.stage_id)) label where label::text = 'walk'),
  'Walk is not a primary stage'
);
select enum_has_labels('public', 'curriculum_state', array['not_started', 'in_progress', 'completed'],
  'curriculum states match the domain contract');
select enum_has_labels('public', 'practice_state',
  array['draft', 'open', 'waiting_for_real_life', 'ready_to_review', 'reviewed', 'closed'],
  'practice states match the domain contract');
select enum_has_labels('public', 'ai_artifact_status', array['suggested', 'confirmed', 'invalidated'],
  'AI artifact states match the domain contract');
select enum_has_labels('public', 'provenance_type', array['user_authored', 'ai_suggested', 'user_confirmed_ai'],
  'persisted provenance matches the domain contract');

select is((select count(*)::integer from public.curriculum_versions), 1, 'one curriculum version is seeded');
select is((select count(*)::integer from public.curriculum_nodes where version_id = 'phase-1-v1'), 16,
  'only the sixteen authorized seed nodes are present');
select is((select content_hash from public.curriculum_versions where id = 'phase-1-v1'), 'aeed790c',
  'seed version stores the authorized Task 2 fingerprint');
select is(
  (select array_agg(id order by sort_order)::text from public.curriculum_nodes where version_id = 'phase-1-v1'),
  array[
    'awaken.pay-attention', 'awaken.pay-attention.observe', 'awaken.pay-attention.inside',
    'awaken.pay-attention.body', 'awaken.pay-attention.reflect', 'bridge.awaken-see-clearly',
    'see-clearly.fact', 'see-clearly.interpretation', 'see-clearly.belief-expectation',
    'bridge.see-clearly-become', 'become.control', 'become.receive', 'become.next-step',
    'become.practice.open', 'become.practice.return', 'become.practice.review'
  ]::text[]::text,
  'seed node identities and order are frozen'
);

select ok(
  not exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'user_curriculum_state'
      and column_name in ('formation_score', 'maturity_score', 'formation_evidence')
  ),
  'curriculum progress contains no formation evidence or score columns'
);
select ok(
  not exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name in ('formation_records', 'practices', 'practice_returns')
      and column_name in ('body', 'journal_body', 'user_text')
  ),
  'structured records and practices do not duplicate exact journal wording'
);
select ok(
  not exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name in ('ai_threads', 'audit_events')
      and column_name in ('prompt', 'response', 'transcript', 'provider_conversation_id', 'journal_body', 'metadata_json')
  ),
  'AI metadata and audit tables cannot persist transcripts or free-form private text'
);
select is(
  (select count(*)::integer from pg_class c join pg_namespace n on n.oid = c.relnamespace
   where n.nspname = 'public' and c.relname in (
     'deep_dive_module_progress', 'deep_dive_reflections', 'see_clearly_sc1_records', 'see_clearly_sy2_records', 'see_clearly_sy3_records', 'see_clearly_sy4_records', 'see_clearly_sg1_records', 'profiles', 'user_curriculum_state', 'journal_entries', 'formation_records', 'practices',
     'practice_returns', 'formation_links', 'ai_threads', 'ai_artifacts', 'ai_artifact_sources',
     'ai_context_grants', 'audit_events'
   ) and c.relrowsecurity and c.relforcerowsecurity),
  19,
  'all user-owned tables enable and force RLS'
);
select ok(
  not exists (
    select 1 from pg_class c join pg_namespace n on n.oid = c.relnamespace
    where n.nspname = 'public' and c.relname in (
      'deep_dive_module_progress', 'deep_dive_reflections', 'see_clearly_sc1_records', 'see_clearly_sy2_records', 'see_clearly_sy3_records', 'see_clearly_sy4_records', 'see_clearly_sg1_records', 'profiles', 'user_curriculum_state', 'journal_entries', 'formation_records', 'practices',
      'practice_returns', 'formation_links', 'ai_threads', 'ai_artifacts', 'ai_artifact_sources',
      'ai_context_grants', 'audit_events'
    ) and not exists (
      select 1 from pg_index i join pg_attribute a on a.attrelid = i.indrelid and a.attnum = any(i.indkey)
      where i.indrelid = c.oid and a.attname = 'user_id' and a.attnum = any(i.indkey::smallint[])
    )
  ),
  'every user-owned table indexes its ownership column'
);
select ok(
  not exists (
    select 1
    from pg_constraint constraint_row
    join pg_class relation on relation.oid = constraint_row.conrelid
    join pg_namespace namespace on namespace.oid = relation.relnamespace
    where namespace.nspname = 'public' and constraint_row.contype = 'f'
      and not exists (
        select 1 from pg_index index_row
        where index_row.indrelid = constraint_row.conrelid
          and constraint_row.conkey <@ (index_row.indkey::smallint[])
      )
  ),
  'every foreign-key predicate has a supporting source index'
);

insert into auth.users (id, instance_id, aud, role, email, encrypted_password, email_confirmed_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at)
values ('00000000-0000-4000-8000-0000000000c3', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'completed-node@example.test', '', now(), '{}', '{}', now(), now());
insert into public.curriculum_versions (id, status, content_hash, published_at)
values ('phase-test-other', 'retired', 'test-other-hash', now());
insert into public.curriculum_nodes (id, version_id, stage, kind, parent_id, sort_order, content)
values ('test.other-node', 'phase-test-other', 'awaken', 'interaction', null, 1,
  '{"kind":"interaction","interactionType":"notice","prompt":"test"}');

select throws_like(
  $$insert into public.user_curriculum_state (user_id, curriculum_version_id, current_node_id, state, completed_node_ids)
    values ('00000000-0000-4000-8000-0000000000c3', 'phase-1-v1', 'awaken.pay-attention.observe', 'in_progress',
      array['missing.node'])$$,
  '%completed curriculum node does not exist in selected version%',
  'completed-node arrays reject unknown node identities'
);
select throws_like(
  $$insert into public.user_curriculum_state (user_id, curriculum_version_id, current_node_id, state, completed_node_ids)
    values ('00000000-0000-4000-8000-0000000000c3', 'phase-1-v1', 'awaken.pay-attention.observe', 'in_progress',
      array['test.other-node'])$$,
  '%completed curriculum node does not exist in selected version%',
  'completed-node arrays reject nodes from another curriculum version'
);

select * from finish();
rollback;
