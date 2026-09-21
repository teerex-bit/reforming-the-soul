begin;
select plan(16);

insert into auth.users (id, instance_id, aud, role, email, encrypted_password, email_confirmed_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at)
values
  ('00000000-0000-4000-8000-0000000000c1', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'awaken-a@example.test', '', now(), '{}', '{}', now(), now()),
  ('00000000-0000-4000-8000-0000000000c2', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'awaken-b@example.test', '', now(), '{}', '{}', now(), now());
insert into public.user_curriculum_state (user_id, curriculum_version_id, current_node_id, state, completed_node_ids)
values ('00000000-0000-4000-8000-0000000000c2', 'phase-1-v1', 'awaken.pay-attention.observe', 'not_started', '{}');

select is((select prosecdef from pg_proc where oid = 'rts_private.save_awaken_observation(text,text,text)'::regprocedure), true,
  'Awaken observation save is security definer');
select is((select array_to_string(proconfig, ',') from pg_proc where oid = 'rts_private.save_awaken_observation(text,text,text)'::regprocedure),
  'search_path=pg_catalog', 'Awaken observation save has a fixed search path');
select ok(has_function_privilege('authenticated', 'rts_private.save_awaken_observation(text,text,text)', 'execute'),
  'authenticated callers may save an Awaken observation');
select ok(not has_function_privilege('anon', 'rts_private.save_awaken_observation(text,text,text)', 'execute'),
  'anonymous callers cannot save an Awaken observation');

set local role authenticated;
select set_config('request.jwt.claim.sub', '00000000-0000-4000-8000-0000000000c1', true);
select results_eq(
  $$select current_node_id from rts_private.save_awaken_observation('  event
value  ', '驚いた  ', ' tight shoulders ')$$,
  $$values ('awaken.pay-attention.reflect'::text)$$,
  'atomic save advances the resume pointer to Reflect'
);
select results_eq(
  $$select entry_kind::text, body from public.journal_entries where user_id = '00000000-0000-4000-8000-0000000000c1' order by created_at$$,
  $$values ('event'::text, '  event
value  '::text), ('internal_response'::text, '驚いた  '::text), ('body_cue'::text, ' tight shoulders '::text)$$,
  'journal entries retain exact multiline, Unicode, and whitespace wording'
);
select results_eq(
  $$select record_type::text, provenance::text from public.formation_records where user_id = '00000000-0000-4000-8000-0000000000c1' order by created_at$$,
  $$values ('observation'::text, 'user_authored'::text), ('reaction'::text, 'user_authored'::text), ('body_cue'::text, 'user_authored'::text)$$,
  'only the approved structured Awaken records are created'
);
select results_eq(
  $$select current_node_id, state::text, completed_node_ids from public.user_curriculum_state where user_id = '00000000-0000-4000-8000-0000000000c1'$$,
  $$values ('awaken.pay-attention.reflect'::text, 'in_progress'::text, array['awaken.pay-attention.observe', 'awaken.pay-attention.inside', 'awaken.pay-attention.body']::text[])$$,
  'resume state contains only curriculum progress'
);
select is((select count(*)::integer from public.practices where user_id = '00000000-0000-4000-8000-0000000000c1'), 0,
  'saving Awaken does not create a practice or formation score evidence');
select throws_ok(
  $$select * from rts_private.save_awaken_observation('', 'inside', 'body')$$::text,
  '22004'::character(5), 'Awaken observation text is required'::text,
  'empty wording is rejected before any write'
);
select throws_ok(
  $$select * from rts_private.save_awaken_observation((' ' || chr(9)), 'inside', 'body')$$::text,
  '22004'::character(5), 'Awaken observation text is required'::text,
  'whitespace-only wording is rejected without trimming valid wording'
);
select throws_ok(
  $$select * from rts_private.save_awaken_observation(U&'\2003', 'inside', 'body')$$::text,
  '22004'::character(5), 'Awaken observation text is required'::text,
  'Unicode whitespace-only wording is rejected'
);
select throws_ok(
  $$select * from rts_private.save_awaken_observation('different event', 'different inside', 'different body')$$::text,
  '40001'::character(5), 'curriculum state changed'::text,
  'a repeat or stale Awaken submission cannot overwrite immutable original wording'
);
select is(
  (select body from public.journal_entries where user_id = '00000000-0000-4000-8000-0000000000c1' and entry_kind = 'event'),
  '  event
value  ', 'the original exact event wording remains immutable after a repeat'
);
select is((select count(*)::integer from public.journal_entries where user_id = '00000000-0000-4000-8000-0000000000c1'), 3,
  'invalid input leaves no partial journal writes');
select set_config('request.jwt.claim.sub', '00000000-0000-4000-8000-0000000000c2', true);
select results_eq(
  $$select current_node_id from rts_private.save_awaken_observation('B event', 'B inside', 'B body')$$,
  $$values ('awaken.pay-attention.reflect'::text)$$,
  'a valid persisted initial pointer can advance independently'
);

select * from finish();
rollback;
