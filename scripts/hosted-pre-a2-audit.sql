begin;
set local search_path = pg_temp, public, extensions, auth, rts_private;

create function pg_temp.rts_test_assert(p_condition boolean, p_label text)
returns text language plpgsql as $$
declare
  assertion_number integer;
begin
  assertion_number := coalesce(nullif(current_setting('rts.assertion_count', true), '')::integer, 0) + 1;
  perform set_config('rts.assertion_count', assertion_number::text, true);
  if p_condition is true then
    return format('ok %s - %s', assertion_number, p_label);
  end if;
  return format('not ok %s - %s', assertion_number, p_label);
end;
$$;

create function pg_temp.rts_test_raises(p_statement text, p_expected_state text, p_expected_detail text, p_label text)
returns text language plpgsql as $$
declare
  actual_state text;
  actual_message text;
  actual_constraint text;
begin
  begin
    execute p_statement;
  exception when others then
    get stacked diagnostics
      actual_state = returned_sqlstate,
      actual_message = message_text,
      actual_constraint = constraint_name;
    return pg_temp.rts_test_assert(
      (p_expected_state is null or actual_state = p_expected_state)
      and (p_expected_detail is null or position(p_expected_detail in coalesce(actual_constraint, '') || ' ' || coalesce(actual_message, '')) > 0),
      p_label
    );
  end;
  return pg_temp.rts_test_assert(false, p_label);
end;
$$;

create function pg_temp.rts_test_finish()
returns text language sql as $$
  select format('1..%s', coalesce(nullif(current_setting('rts.assertion_count', true), '')::integer, 0))
$$;

grant execute on function pg_temp.rts_test_assert(boolean, text) to authenticated;
grant execute on function pg_temp.rts_test_raises(text, text, text, text) to authenticated;

select pg_temp.rts_test_assert(
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

select pg_temp.rts_test_assert(
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

select pg_temp.rts_test_assert(
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

select pg_temp.rts_test_assert(
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
insert into public.deep_dive_module_progress (id, user_id, curriculum_version_id, module_id, last_section_id, completed_at)
values (current_setting('rts.test_progress_id')::uuid, current_setting('rts.test_actor_a')::uuid, 'phase-1-v1', 'awaken.pay-attention', 'reflection', now());
select pg_temp.rts_test_assert(
  exists (select 1 from public.deep_dive_module_progress where id = current_setting('rts.test_progress_id')::uuid),
  'A1 module identifier is accepted before A2'
);
insert into public.deep_dive_reflections (id, user_id, progress_id, prompt_id, body)
values (current_setting('rts.test_reflection_id')::uuid, current_setting('rts.test_actor_a')::uuid, current_setting('rts.test_progress_id')::uuid, 'real-moment', 'hosted pre-A2 audit');
select pg_temp.rts_test_assert(
  exists (select 1 from public.deep_dive_reflections where id = current_setting('rts.test_reflection_id')::uuid),
  'A1 module and prompt identifiers are accepted before A2'
);
select pg_temp.rts_test_raises(
  format('insert into public.deep_dive_module_progress (user_id, curriculum_version_id, module_id, last_section_id) values (%L, %L, %L, %L)', current_setting('rts.test_actor_a'), 'phase-1-v1', 'awaken.catch-yourself-being-you', 'entry'),
  '23514', 'deep_dive_module_progress_module_id_check', 'A2 module identifier is rejected before A2'
);
select pg_temp.rts_test_raises(
  format('insert into public.deep_dive_reflections (user_id, progress_id, prompt_id, body) values (%L, %L, %L, %L)', current_setting('rts.test_actor_a'), current_setting('rts.test_progress_id'), 'first-response', 'invalid'),
  '23514', 'deep_dive_reflections_prompt_id_check', 'A2 prompt identifier is rejected before A2'
);
select pg_temp.rts_test_raises(
  format('insert into public.deep_dive_module_progress (user_id, curriculum_version_id, module_id, last_section_id) values (%L, %L, %L, %L)', current_setting('rts.test_actor_a'), 'phase-1-v1', 'awaken.unapproved-module', 'entry'),
  '23514', 'deep_dive_module_progress_module_id_check', 'unapproved module identifier is rejected before A2'
);
select pg_temp.rts_test_raises(
  format('insert into public.deep_dive_reflections (user_id, progress_id, prompt_id, body) values (%L, %L, %L, %L)', current_setting('rts.test_actor_a'), current_setting('rts.test_progress_id'), 'unapproved-prompt', 'invalid'),
  '23514', 'deep_dive_reflections_prompt_id_check', 'unapproved prompt identifier is rejected before A2'
);

reset role;
select pg_temp.rts_test_finish();
rollback;
