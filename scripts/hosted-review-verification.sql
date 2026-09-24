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

select set_config('rts.test_run_id', gen_random_uuid()::text, true);
select set_config('rts.test_actor_a', gen_random_uuid()::text, true);
select set_config('rts.test_actor_b', gen_random_uuid()::text, true);
select set_config('rts.test_a1_progress_id', gen_random_uuid()::text, true);
select set_config('rts.test_a1_reflection_id', gen_random_uuid()::text, true);
select set_config('rts.test_a2_progress_id', gen_random_uuid()::text, true);
select set_config('rts.test_a2_reflection_id', gen_random_uuid()::text, true);
insert into auth.users (id, instance_id, aud, role, email, encrypted_password, email_confirmed_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at)
values
  (current_setting('rts.test_actor_a')::uuid, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'rts-verify-' || current_setting('rts.test_run_id') || '-a@example.invalid', '', now(), '{}', '{}', now(), now()),
  (current_setting('rts.test_actor_b')::uuid, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'rts-verify-' || current_setting('rts.test_run_id') || '-b@example.invalid', '', now(), '{}', '{}', now(), now());

select pg_temp.rts_test_assert(
  not exists (
    select required.name
    from (values ('deep_dive_module_progress'), ('deep_dive_reflections')) as required(name)
    left join pg_class relation on relation.relnamespace = 'public'::regnamespace
      and relation.relname = required.name
    where relation.oid is null or not relation.relrowsecurity or not relation.relforcerowsecurity
  ),
  'both Deep Dive tables retain enabled and forced RLS'
);

set local role authenticated;
select set_config('request.jwt.claim.sub', current_setting('rts.test_actor_a'), true);
insert into public.deep_dive_module_progress (id, user_id, curriculum_version_id, module_id, last_section_id, completed_at)
values (current_setting('rts.test_a1_progress_id')::uuid, current_setting('rts.test_actor_a')::uuid, 'phase-1-v1', 'awaken.pay-attention', 'reflection', now());
select pg_temp.rts_test_assert(exists (select 1 from public.deep_dive_module_progress where id = current_setting('rts.test_a1_progress_id')::uuid), 'A1 progress ID saves');
insert into public.deep_dive_reflections (id, user_id, progress_id, prompt_id, body)
values (current_setting('rts.test_a1_reflection_id')::uuid, current_setting('rts.test_actor_a')::uuid, current_setting('rts.test_a1_progress_id')::uuid, 'real-moment', 'hosted A1 exact reflection');
select pg_temp.rts_test_assert(exists (select 1 from public.deep_dive_reflections where id = current_setting('rts.test_a1_reflection_id')::uuid), 'A1 reflection ID saves');
insert into public.deep_dive_module_progress (id, user_id, curriculum_version_id, module_id, last_section_id)
values (current_setting('rts.test_a2_progress_id')::uuid, current_setting('rts.test_actor_a')::uuid, 'phase-1-v1', 'awaken.catch-yourself-being-you', 'first-response');
select pg_temp.rts_test_assert(exists (select 1 from public.deep_dive_module_progress where id = current_setting('rts.test_a2_progress_id')::uuid), 'A2 module ID saves');
insert into public.deep_dive_reflections (id, user_id, progress_id, prompt_id, body)
values (current_setting('rts.test_a2_reflection_id')::uuid, current_setting('rts.test_actor_a')::uuid, current_setting('rts.test_a2_progress_id')::uuid, 'first-response', 'hosted A2 exact reflection');
select pg_temp.rts_test_assert(exists (select 1 from public.deep_dive_reflections where id = current_setting('rts.test_a2_reflection_id')::uuid), 'A2 prompt ID saves');
select pg_temp.rts_test_assert((select last_section_id = 'reflection' from public.deep_dive_module_progress where id = current_setting('rts.test_a1_progress_id')::uuid), 'A1 progress resumes at the saved section');
select pg_temp.rts_test_assert((select body = 'hosted A1 exact reflection' from public.deep_dive_reflections where id = current_setting('rts.test_a1_reflection_id')::uuid), 'A1 reflection saves exact wording');
select pg_temp.rts_test_assert((select last_section_id = 'first-response' from public.deep_dive_module_progress where id = current_setting('rts.test_a2_progress_id')::uuid), 'A2 progress resumes at the saved section');
select pg_temp.rts_test_assert((select body = 'hosted A2 exact reflection' from public.deep_dive_reflections where id = current_setting('rts.test_a2_reflection_id')::uuid), 'A2 reflection saves exact wording');

select set_config('request.jwt.claim.sub', current_setting('rts.test_actor_b'), true);
select pg_temp.rts_test_assert(not exists (select 1 from public.deep_dive_module_progress where id in (current_setting('rts.test_a1_progress_id')::uuid, current_setting('rts.test_a2_progress_id')::uuid)), 'another user cannot read this run’s progress');
select pg_temp.rts_test_assert(not exists (select 1 from public.deep_dive_reflections where id in (current_setting('rts.test_a1_reflection_id')::uuid, current_setting('rts.test_a2_reflection_id')::uuid)), 'another user cannot read this run’s reflections');
update public.deep_dive_module_progress set last_section_id = 'tampered'
where id = current_setting('rts.test_a2_progress_id')::uuid;
select set_config('request.jwt.claim.sub', current_setting('rts.test_actor_a'), true);
select pg_temp.rts_test_assert((select last_section_id = 'first-response' from public.deep_dive_module_progress where id = current_setting('rts.test_a2_progress_id')::uuid), 'another user cannot update this run’s progress');
select pg_temp.rts_test_raises(
  format('insert into public.deep_dive_reflections (user_id, progress_id, prompt_id, body) values (%L, %L, %L, %L)', current_setting('rts.test_actor_b'), current_setting('rts.test_a2_progress_id'), 'first-response', 'cross-user attempt'),
  '42501', null, 'RLS blocks cross-user reflection creation'
);
select pg_temp.rts_test_raises(
  format('update public.deep_dive_module_progress set user_id = %L where id = %L', current_setting('rts.test_actor_b'), current_setting('rts.test_a1_progress_id')),
  null, 'user_id is immutable', 'A1 progress ownership remains immutable'
);
delete from public.deep_dive_reflections where id = current_setting('rts.test_a1_reflection_id')::uuid;
select pg_temp.rts_test_assert(not exists (select 1 from public.deep_dive_reflections where id = current_setting('rts.test_a1_reflection_id')::uuid), 'A1 reflection deletion removes this run’s reflection');
select pg_temp.rts_test_assert(exists (select 1 from public.deep_dive_module_progress where id = current_setting('rts.test_a1_progress_id')::uuid and completed_at is not null), 'A1 reflection deletion preserves this run’s completed progress');
select pg_temp.rts_test_raises(
  format('insert into public.deep_dive_module_progress (user_id, curriculum_version_id, module_id, last_section_id) values (%L, %L, %L, %L)', current_setting('rts.test_actor_a'), 'phase-1-v1', 'awaken.unapproved-module', 'entry'),
  '23514', 'deep_dive_module_progress_module_id_check', 'invalid module IDs are rejected'
);
select pg_temp.rts_test_raises(
  format('insert into public.deep_dive_reflections (user_id, progress_id, prompt_id, body) values (%L, %L, %L, %L)', current_setting('rts.test_actor_a'), current_setting('rts.test_a2_progress_id'), 'unapproved-prompt', 'invalid'),
  '23514', 'deep_dive_reflections_prompt_id_check', 'invalid prompt IDs are rejected'
);

reset role;
select pg_temp.rts_test_finish();
rollback;
