begin;
select plan(12);

insert into auth.users (id, instance_id, aud, role, email, encrypted_password, email_confirmed_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at)
values
  ('00000000-0000-4000-8000-0000000000a2', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'a2-owner@example.test', '', now(), '{}', '{}', now(), now()),
  ('00000000-0000-4000-8000-0000000000b3', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'a2-other@example.test', '', now(), '{}', '{}', now(), now());

insert into public.deep_dive_module_progress (id, user_id, curriculum_version_id, module_id, last_section_id)
values
  ('a3000000-0000-4000-8000-000000000001', '00000000-0000-4000-8000-0000000000a2', 'phase-1-v1', 'awaken.pay-attention', 'reflection'),
  ('a3000000-0000-4000-8000-000000000002', '00000000-0000-4000-8000-0000000000a2', 'phase-1-v1', 'awaken.catch-yourself-being-you', 'first-response');

insert into public.deep_dive_reflections (id, user_id, progress_id, prompt_id, body)
values
  ('a4000000-0000-4000-8000-000000000001', '00000000-0000-4000-8000-0000000000a2', 'a3000000-0000-4000-8000-000000000001', 'real-moment', 'A1 reflection remains exact'),
  ('a4000000-0000-4000-8000-000000000002', '00000000-0000-4000-8000-0000000000a2', 'a3000000-0000-4000-8000-000000000002', 'first-response', 'A2 first response remains exact');

set local role authenticated;
select set_config('request.jwt.claim.sub', '00000000-0000-4000-8000-0000000000a2', true);
select is((select last_section_id from public.deep_dive_module_progress where module_id = 'awaken.pay-attention'), 'reflection', 'A1 resumes at its saved section');
select is((select body from public.deep_dive_reflections where prompt_id = 'real-moment'), 'A1 reflection remains exact', 'A1 reflection still saves and reads unchanged');
select is((select last_section_id from public.deep_dive_module_progress where module_id = 'awaken.catch-yourself-being-you'), 'first-response', 'A2 resumes at its saved section');
select is((select body from public.deep_dive_reflections where prompt_id = 'first-response'), 'A2 first response remains exact', 'A2 prompt saves and reads exact wording');

select set_config('request.jwt.claim.sub', '00000000-0000-4000-8000-0000000000b3', true);
select is((select count(*)::integer from public.deep_dive_module_progress), 0, 'another user cannot read either user’s module progress');
select is((select count(*)::integer from public.deep_dive_reflections), 0, 'another user cannot read either user’s reflections');
update public.deep_dive_module_progress set last_section_id = 'tampered' where id = 'a3000000-0000-4000-8000-000000000002';
select is((select count(*)::integer from public.deep_dive_module_progress where id = 'a3000000-0000-4000-8000-000000000002' and last_section_id = 'tampered'), 0, 'another user cannot update A2 progress');
select throws_ok(
  $$insert into public.deep_dive_reflections (user_id, progress_id, prompt_id, body) values ('00000000-0000-4000-8000-0000000000b3', 'a3000000-0000-4000-8000-000000000002', 'first-response', 'cross-owner')$$,
  '23503', null, 'same-owner foreign key blocks a cross-user A2 reflection'
);

select set_config('request.jwt.claim.sub', '00000000-0000-4000-8000-0000000000a2', true);
select throws_like(
  $$update public.deep_dive_module_progress set user_id = '00000000-0000-4000-8000-0000000000b3' where id = 'a3000000-0000-4000-8000-000000000002'$$,
  '%user_id is immutable%', 'A2 progress ownership remains immutable'
);
select throws_like(
  $$insert into public.deep_dive_module_progress (user_id, curriculum_version_id, module_id, last_section_id) values ('00000000-0000-4000-8000-0000000000a2', 'phase-1-v1', 'awaken.unapproved-module', 'entry')$$,
  '%deep_dive_module_progress_module_id_check%', 'unapproved module identifiers remain rejected'
);
select throws_like(
  $$insert into public.deep_dive_reflections (user_id, progress_id, prompt_id, body) values ('00000000-0000-4000-8000-0000000000a2', 'a3000000-0000-4000-8000-000000000002', 'unapproved-prompt', 'invalid')$$,
  '%deep_dive_reflections_prompt_id_check%', 'unapproved prompt identifiers remain rejected'
);

select is((select count(*)::integer from pg_class c join pg_namespace n on n.oid = c.relnamespace where n.nspname = 'public' and c.relname in ('deep_dive_module_progress', 'deep_dive_reflections') and c.relrowsecurity and c.relforcerowsecurity), 2, 'both Deep Dive tables continue to force RLS');
select * from finish();
rollback;
