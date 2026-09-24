begin;
select plan(10);

select ok(
  not exists (
    select required.name
    from (values
      ('ai_artifact_sources'), ('ai_artifacts'), ('ai_context_grants'), ('ai_threads'),
      ('audit_events'), ('curriculum_nodes'), ('curriculum_versions'), ('deep_dive_module_progress'),
      ('deep_dive_reflections'), ('formation_links'), ('formation_records'), ('journal_entries'),
      ('practice_returns'), ('practices'), ('profiles'), ('user_curriculum_state')
    ) as required(name)
    left join pg_class relation on relation.relnamespace = 'public'::regnamespace
      and relation.relname = required.name and relation.relkind = 'r'
    where relation.oid is null
  ),
  'Phase 1 and A1 repository tables exist'
);

select ok(
  not exists (
    select required.name
    from (values
      ('current_actor'), ('delete_journal_entry_with_dependencies'), ('grant_ai_context'),
      ('revoke_ai_context'), ('transition_practice'), ('record_practice_return'), ('review_practice'),
      ('save_awaken_observation'), ('save_see_clearly'), ('save_become_practice'),
      ('reserve_ai_reflect'), ('complete_ai_reflect'), ('save_reflect_insight'),
      ('reserve_practice_review_reflect'), ('complete_practice_review_reflect'),
      ('save_practice_reflect_suggestion'), ('validate_formation_link_lineage')
    ) as required(name)
    left join pg_proc function_row on function_row.pronamespace = 'rts_private'::regnamespace
      and function_row.proname = required.name
    where function_row.oid is null
  )
  and to_regprocedure('public.reject_user_id_change()') is not null
  and to_regprocedure('public.validate_completed_curriculum_nodes()') is not null,
  'required Phase 1 app functions through A1 exist'
);

select ok(
  not exists (
    select required.name
    from (values
      ('ai_artifact_sources'), ('ai_artifacts'), ('ai_context_grants'), ('ai_threads'),
      ('audit_events'), ('deep_dive_module_progress'), ('deep_dive_reflections'),
      ('formation_links'), ('formation_records'), ('journal_entries'), ('practice_returns'),
      ('practices'), ('profiles'), ('user_curriculum_state')
    ) as required(name)
    left join pg_class relation on relation.relnamespace = 'public'::regnamespace
      and relation.relname = required.name and relation.relkind = 'r'
    where relation.oid is null or not relation.relrowsecurity or not relation.relforcerowsecurity
  ),
  'all user-owned Phase 1 and A1 tables enable and force RLS'
);

select ok(
  not exists (
    select required.name
    from (values ('deep_dive_module_progress'), ('deep_dive_reflections')) as required(name)
    left join pg_class relation on relation.relnamespace = 'public'::regnamespace
      and relation.relname = required.name
    where relation.oid is null or not exists (
      select 1 from pg_index index_row
      join pg_attribute attribute_row on attribute_row.attrelid = relation.oid
        and attribute_row.attnum = any(index_row.indkey)
      where index_row.indrelid = relation.oid and attribute_row.attname = 'user_id'
    )
  ),
  'A1 ownership indexes exist'
);

select set_config('rts.test_run_id', gen_random_uuid()::text, true);
select set_config('rts.test_actor_a', gen_random_uuid()::text, true);
select set_config('rts.test_progress_id', gen_random_uuid()::text, true);
select set_config('rts.test_reflection_id', gen_random_uuid()::text, true);
insert into auth.users (id, instance_id, aud, role, email, encrypted_password, email_confirmed_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at)
values
  (current_setting('rts.test_actor_a')::uuid, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'rts-audit-' || current_setting('rts.test_run_id') || '-a@example.invalid', '', now(), '{}', '{}', now(), now());

set local role authenticated;
select set_config('request.jwt.claim.sub', current_setting('rts.test_actor_a'), true);
select lives_ok(
  format('insert into public.deep_dive_module_progress (id, user_id, curriculum_version_id, module_id, last_section_id, completed_at) values (%L, %L, %L, %L, %L, now())',
    current_setting('rts.test_progress_id'), current_setting('rts.test_actor_a'), 'phase-1-v1', 'awaken.pay-attention', 'reflection'),
  'A1 module identifier is accepted before A2'
);
select lives_ok(
  format('insert into public.deep_dive_reflections (id, user_id, progress_id, prompt_id, body) values (%L, %L, %L, %L, %L)',
    current_setting('rts.test_reflection_id'), current_setting('rts.test_actor_a'), current_setting('rts.test_progress_id'), 'real-moment', 'hosted pre-A2 audit'),
  'A1 module and prompt identifiers are accepted before A2'
);

select throws_like(
  format('insert into public.deep_dive_module_progress (user_id, curriculum_version_id, module_id, last_section_id) values (%L, %L, %L, %L)',
    current_setting('rts.test_actor_a'), 'phase-1-v1', 'awaken.catch-yourself-being-you', 'entry'),
  '%deep_dive_module_progress_module_id_check%', 'A2 module identifier is rejected before A2'
);
select throws_like(
  format('insert into public.deep_dive_reflections (user_id, progress_id, prompt_id, body) values (%L, %L, %L, %L)',
    current_setting('rts.test_actor_a'), current_setting('rts.test_progress_id'), 'first-response', 'invalid'),
  '%deep_dive_reflections_prompt_id_check%', 'A2 prompt identifier is rejected before A2'
);
select throws_like(
  format('insert into public.deep_dive_module_progress (user_id, curriculum_version_id, module_id, last_section_id) values (%L, %L, %L, %L)',
    current_setting('rts.test_actor_a'), 'phase-1-v1', 'awaken.unapproved-module', 'entry'),
  '%deep_dive_module_progress_module_id_check%', 'unapproved module identifier is rejected before A2'
);
select throws_like(
  format('insert into public.deep_dive_reflections (user_id, progress_id, prompt_id, body) values (%L, %L, %L, %L)',
    current_setting('rts.test_actor_a'), current_setting('rts.test_progress_id'), 'unapproved-prompt', 'invalid'),
  '%deep_dive_reflections_prompt_id_check%', 'unapproved prompt identifier is rejected before A2'
);

select * from finish();
rollback;
