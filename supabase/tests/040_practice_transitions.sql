begin;
select plan(19);

insert into auth.users (id, instance_id, aud, role, email, encrypted_password, email_confirmed_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at)
values
  ('00000000-0000-4000-8000-0000000000a1', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'practice-a@example.test', '', now(), '{}', '{}', now(), now()),
  ('00000000-0000-4000-8000-0000000000b2', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'practice-b@example.test', '', now(), '{}', '{}', now(), now());
insert into public.journal_entries (id, user_id, curriculum_version_id, node_id, entry_kind, body) values
  ('81000000-0000-4000-8000-000000000001', '00000000-0000-4000-8000-0000000000a1', 'phase-1-v1', 'become.control', 'control_target', 'control'),
  ('81000000-0000-4000-8000-000000000002', '00000000-0000-4000-8000-0000000000a1', 'phase-1-v1', 'become.receive', 'present_truth', 'truth'),
  ('81000000-0000-4000-8000-000000000003', '00000000-0000-4000-8000-0000000000a1', 'phase-1-v1', 'become.next-step', 'next_right_step', 'step');
insert into public.practices (id, user_id, curriculum_version_id, node_id, control_target_entry_id, present_truth_entry_id, next_right_step_entry_id, state)
values ('82000000-0000-4000-8000-000000000001', '00000000-0000-4000-8000-0000000000a1', 'phase-1-v1', 'become.practice.open',
  '81000000-0000-4000-8000-000000000001', '81000000-0000-4000-8000-000000000002', '81000000-0000-4000-8000-000000000003', 'draft');

create temporary table practices (id uuid primary key, state text);
set local search_path = pg_temp, public, extensions;
set local role authenticated;
select set_config('request.jwt.claim.sub', '00000000-0000-4000-8000-0000000000b2', true);
select throws_ok(
  $$select * from rts_private.transition_practice('82000000-0000-4000-8000-000000000001', 'draft', 0, 'open')$$::text,
  'P0002'::character(5), 'practice not found'::text,
  'privileged transition does not expose or mutate another owner practice'::text
);
select set_config('request.jwt.claim.sub', '00000000-0000-4000-8000-0000000000a1', true);
select throws_matching($$update public.practices set state = 'closed' where id = '82000000-0000-4000-8000-000000000001'$$::text,
  '.*permission denied.*'::text, 'direct lifecycle mutation is denied'::text);
select throws_ok(
  $$select * from rts_private.transition_practice('82000000-0000-4000-8000-000000000001', null, 0, 'open')$$::text,
  '22004'::character(5), 'expected practice state, lock version, and target state are required'::text,
  'null expected state cannot bypass transition validation'::text);
select throws_ok(
  $$select * from rts_private.transition_practice('82000000-0000-4000-8000-000000000001', 'draft', null, 'open')$$::text,
  '22004'::character(5), 'expected practice state, lock version, and target state are required'::text,
  'null lock version cannot bypass optimistic locking'::text);
select results_eq(
  $$select state::text, lock_version from rts_private.transition_practice('82000000-0000-4000-8000-000000000001', 'draft', 0, 'open')$$,
  $$values ('open'::text, 1)$$, 'fixed search path ignores a caller-created shadow table');
select ok((select opened_at is not null from public.practices where id = '82000000-0000-4000-8000-000000000001'),
  'opening records its lifecycle timestamp');
select throws_ok(
  $$select * from rts_private.transition_practice('82000000-0000-4000-8000-000000000001', 'draft', 0, 'open')$$::text,
  '40001'::character(5), 'stale practice state or lock version'::text, 'stale transition attempts fail'::text);
select throws_ok(
  $$select * from rts_private.transition_practice('82000000-0000-4000-8000-000000000001', 'open', 1, 'reviewed')$$::text,
  '22023'::character(5), 'invalid practice transition'::text, 'invalid state edges fail'::text);
select results_eq(
  $$select state::text, lock_version from rts_private.transition_practice('82000000-0000-4000-8000-000000000001', 'open', 1, 'waiting_for_real_life')$$,
  $$values ('waiting_for_real_life'::text, 2)$$, 'open transitions to waiting_for_real_life');
select throws_ok(
  $$select * from rts_private.transition_practice('82000000-0000-4000-8000-000000000001', 'waiting_for_real_life', 2, 'ready_to_review')$$::text,
  '22023'::character(5), 'invalid practice transition'::text,
  'generic transition cannot bypass required return creation'::text);
select throws_ok(
  $$select * from rts_private.record_practice_return('82000000-0000-4000-8000-000000000001', null, 'outcome')$$::text,
  '22004'::character(5), 'expected practice lock version is required'::text,
  'return recording cannot bypass optimistic locking with null'::text);
select results_eq(
  $$select state::text, lock_version from rts_private.record_practice_return('82000000-0000-4000-8000-000000000001', 2, '  exact outcome text  ')$$,
  $$values ('ready_to_review'::text, 3)$$, 'recording a return moves the practice atomically');
select is((select body from public.journal_entries where entry_kind = 'practice_outcome'), '  exact outcome text  ',
  'return preserves exact user wording');
select is((select count(*)::integer from public.practice_returns), 1, 'one return row is created');
select throws_ok(
  $$select * from rts_private.transition_practice('82000000-0000-4000-8000-000000000001', 'ready_to_review', 3, 'reviewed')$$::text,
  '22023'::character(5), 'invalid practice transition'::text,
  'generic transition cannot bypass required review journal creation'::text);
select throws_ok(
  $$select * from rts_private.review_practice('82000000-0000-4000-8000-000000000001', null, 'review')$$::text,
  '22004'::character(5), 'expected practice lock version is required'::text,
  'review cannot bypass optimistic locking with null'::text);
select results_eq(
  $$select state::text, lock_version from rts_private.review_practice('82000000-0000-4000-8000-000000000001', 3, '  exact review text  ')$$,
  $$values ('reviewed'::text, 4)$$, 'review is recorded atomically');
select is((select body from public.journal_entries where entry_kind = 'practice_review'), '  exact review text  ',
  'review preserves exact user wording');
select results_eq(
  $$select state::text, lock_version from rts_private.transition_practice('82000000-0000-4000-8000-000000000001', 'reviewed', 4, 'closed')$$,
  $$values ('closed'::text, 5)$$, 'reviewed practice can close');

select * from finish();
rollback;
