begin;
set local search_path = pg_temp, public, extensions, auth, rts_private;
select plan(19);

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

select ok(
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
select lives_ok(
  format('insert into public.deep_dive_module_progress (id, user_id, curriculum_version_id, module_id, last_section_id, completed_at) values (%L, %L, %L, %L, %L, now())',
    current_setting('rts.test_a1_progress_id'), current_setting('rts.test_actor_a'), 'phase-1-v1', 'awaken.pay-attention', 'reflection'),
  'A1 progress ID saves'
);
select lives_ok(
  format('insert into public.deep_dive_reflections (id, user_id, progress_id, prompt_id, body) values (%L, %L, %L, %L, %L)',
    current_setting('rts.test_a1_reflection_id'), current_setting('rts.test_actor_a'), current_setting('rts.test_a1_progress_id'), 'real-moment', 'hosted A1 exact reflection'),
  'A1 reflection ID saves'
);
select lives_ok(
  format('insert into public.deep_dive_module_progress (id, user_id, curriculum_version_id, module_id, last_section_id) values (%L, %L, %L, %L, %L)',
    current_setting('rts.test_a2_progress_id'), current_setting('rts.test_actor_a'), 'phase-1-v1', 'awaken.catch-yourself-being-you', 'first-response'),
  'A2 module ID saves'
);
select lives_ok(
  format('insert into public.deep_dive_reflections (id, user_id, progress_id, prompt_id, body) values (%L, %L, %L, %L, %L)',
    current_setting('rts.test_a2_reflection_id'), current_setting('rts.test_actor_a'), current_setting('rts.test_a2_progress_id'), 'first-response', 'hosted A2 exact reflection'),
  'A2 prompt ID saves'
);
select is((select last_section_id from public.deep_dive_module_progress where id = current_setting('rts.test_a1_progress_id')::uuid), 'reflection', 'A1 progress resumes at the saved section');
select is((select body from public.deep_dive_reflections where id = current_setting('rts.test_a1_reflection_id')::uuid), 'hosted A1 exact reflection', 'A1 reflection saves exact wording');
select is((select last_section_id from public.deep_dive_module_progress where id = current_setting('rts.test_a2_progress_id')::uuid), 'first-response', 'A2 progress resumes at the saved section');
select is((select body from public.deep_dive_reflections where id = current_setting('rts.test_a2_reflection_id')::uuid), 'hosted A2 exact reflection', 'A2 reflection saves exact wording');

select set_config('request.jwt.claim.sub', current_setting('rts.test_actor_b'), true);
select ok(not exists (select 1 from public.deep_dive_module_progress where id in (current_setting('rts.test_a1_progress_id')::uuid, current_setting('rts.test_a2_progress_id')::uuid)), 'another user cannot read this run’s progress');
select ok(not exists (select 1 from public.deep_dive_reflections where id in (current_setting('rts.test_a1_reflection_id')::uuid, current_setting('rts.test_a2_reflection_id')::uuid)), 'another user cannot read this run’s reflections');
update public.deep_dive_module_progress set last_section_id = 'tampered'
where id = current_setting('rts.test_a2_progress_id')::uuid;
select set_config('request.jwt.claim.sub', current_setting('rts.test_actor_a'), true);
select is((select last_section_id from public.deep_dive_module_progress where id = current_setting('rts.test_a2_progress_id')::uuid), 'first-response', 'another user cannot update this run’s progress');
select throws_ok(
  format('insert into public.deep_dive_reflections (user_id, progress_id, prompt_id, body) values (%L, %L, %L, %L)',
    current_setting('rts.test_actor_b'), current_setting('rts.test_a2_progress_id'), 'first-response', 'cross-user attempt'),
  '42501', null, 'RLS blocks cross-user reflection creation'
);

select set_config('request.jwt.claim.sub', current_setting('rts.test_actor_a'), true);
select throws_like(
  format('update public.deep_dive_module_progress set user_id = %L where id = %L', current_setting('rts.test_actor_b'), current_setting('rts.test_a1_progress_id')),
  '%user_id is immutable%', 'A1 progress ownership remains immutable'
);
select lives_ok(
  format('delete from public.deep_dive_reflections where id = %L', current_setting('rts.test_a1_reflection_id')),
  'A1 reflection can be deleted independently'
);
select ok(not exists (select 1 from public.deep_dive_reflections where id = current_setting('rts.test_a1_reflection_id')::uuid), 'A1 reflection deletion removes this run’s reflection');
select ok(exists (select 1 from public.deep_dive_module_progress where id = current_setting('rts.test_a1_progress_id')::uuid and completed_at is not null), 'A1 reflection deletion preserves this run’s completed progress');
select throws_like(
  format('insert into public.deep_dive_module_progress (user_id, curriculum_version_id, module_id, last_section_id) values (%L, %L, %L, %L)',
    current_setting('rts.test_actor_a'), 'phase-1-v1', 'awaken.unapproved-module', 'entry'),
  '%deep_dive_module_progress_module_id_check%', 'invalid module IDs are rejected'
);
select throws_like(
  format('insert into public.deep_dive_reflections (user_id, progress_id, prompt_id, body) values (%L, %L, %L, %L)',
    current_setting('rts.test_actor_a'), current_setting('rts.test_a2_progress_id'), 'unapproved-prompt', 'invalid'),
  '%deep_dive_reflections_prompt_id_check%', 'invalid prompt IDs are rejected'
);

reset role;
select * from finish();
rollback;
