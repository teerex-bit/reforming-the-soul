begin;
select plan(20);

insert into auth.users (id, instance_id, aud, role, email, encrypted_password, email_confirmed_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at)
values
  ('00000000-0000-4000-8000-0000000000a1', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'a1-owner@example.test', '', now(), '{}', '{}', now(), now()),
  ('00000000-0000-4000-8000-0000000000b2', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'a1-other@example.test', '', now(), '{}', '{}', now(), now());
insert into public.deep_dive_module_progress (id, user_id, curriculum_version_id, module_id, last_section_id, completed_at)
values ('a1000000-0000-4000-8000-000000000001', '00000000-0000-4000-8000-0000000000a1', 'phase-1-v1', 'awaken.pay-attention', 'reflect', now());
insert into public.deep_dive_reflections (id, user_id, progress_id, prompt_id, body)
values ('a2000000-0000-4000-8000-000000000001', '00000000-0000-4000-8000-0000000000a1', 'a1000000-0000-4000-8000-000000000001', 'real-moment', 'A private exact reflection');

set local role authenticated;
select set_config('request.jwt.claim.sub', '00000000-0000-4000-8000-0000000000a1', true);
select is((select count(*)::integer from public.deep_dive_module_progress), 1, 'User A reads A progress');
select is((select count(*)::integer from public.deep_dive_reflections), 1, 'User A reads A reflection');
select lives_ok($$update public.deep_dive_module_progress set last_section_id = 'complete' where id = 'a1000000-0000-4000-8000-000000000001'$$, 'User A updates A progress');
select lives_ok($$update public.deep_dive_reflections set body = 'A edited private exact reflection' where id = 'a2000000-0000-4000-8000-000000000001'$$, 'User A edits A reflection');
select throws_like($$update public.deep_dive_module_progress set user_id = '00000000-0000-4000-8000-0000000000b2' where id = 'a1000000-0000-4000-8000-000000000001'$$, '%user_id is immutable%', 'progress ownership is immutable');
select throws_like($$update public.deep_dive_reflections set user_id = '00000000-0000-4000-8000-0000000000b2' where id = 'a2000000-0000-4000-8000-000000000001'$$, '%user_id is immutable%', 'reflection ownership is immutable');

select set_config('request.jwt.claim.sub', '00000000-0000-4000-8000-0000000000b2', true);
select is((select count(*)::integer from public.deep_dive_module_progress), 0, 'User B cannot read A progress');
select is((select count(*)::integer from public.deep_dive_reflections), 0, 'User B cannot read A reflection');
select is((select count(*)::integer from public.deep_dive_module_progress where id = 'a1000000-0000-4000-8000-000000000001'), 0, 'User B cannot update A progress');
select is((select count(*)::integer from public.deep_dive_reflections where id = 'a2000000-0000-4000-8000-000000000001'), 0, 'User B cannot update A reflection');
select is((select count(*)::integer from public.deep_dive_module_progress where id = 'a1000000-0000-4000-8000-000000000001'), 0, 'User B cannot delete A progress');
select is((select count(*)::integer from public.deep_dive_reflections where id = 'a2000000-0000-4000-8000-000000000001'), 0, 'User B cannot delete A reflection');

set local role anon;
select set_config('request.jwt.claim.sub', '', true);
select throws_like($$select * from public.deep_dive_module_progress$$, '%permission denied%', 'anon cannot read A1 progress');
select throws_like($$select * from public.deep_dive_reflections$$, '%permission denied%', 'anon cannot read A1 reflection');

reset role;
select lives_ok($$delete from public.deep_dive_reflections where id = 'a2000000-0000-4000-8000-000000000001'$$, 'reflection can be deleted independently');
select is((select count(*)::integer from public.deep_dive_reflections), 0, 'reflection deletion removes reflection');
select is((select count(*)::integer from public.deep_dive_module_progress), 1, 'reflection deletion preserves progress');
select is((select completed_at is not null from public.deep_dive_module_progress where id = 'a1000000-0000-4000-8000-000000000001'), true, 'reflection deletion preserves completion');
select is((select count(*)::integer from pg_class c join pg_namespace n on n.oid = c.relnamespace where n.nspname = 'public' and c.relname in ('deep_dive_module_progress', 'deep_dive_reflections') and c.relrowsecurity and c.relforcerowsecurity), 2, 'A1 tables enable and force RLS');
select ok((select count(*) from pg_index i join pg_class c on c.oid = i.indrelid join pg_namespace n on n.oid = c.relnamespace join pg_attribute a on a.attrelid = c.oid and a.attnum = any(i.indkey) where n.nspname = 'public' and c.relname in ('deep_dive_module_progress', 'deep_dive_reflections') and a.attname = 'user_id') >= 2, 'A1 tables index ownership columns');

select * from finish();
rollback;
