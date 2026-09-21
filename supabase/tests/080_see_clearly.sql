begin;
select plan(10);

insert into auth.users (id, instance_id, aud, role, email, encrypted_password, email_confirmed_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at)
values ('00000000-0000-4000-8000-0000000000d1','00000000-0000-0000-0000-000000000000','authenticated','authenticated','clarity@example.test','',now(),'{}','{}',now(),now());

select is((select prosecdef from pg_proc where oid='rts_private.save_see_clearly(text,text,text,text)'::regprocedure), true, 'save is security definer');
select is((select array_to_string(proconfig, ',') from pg_proc where oid='rts_private.save_see_clearly(text,text,text,text)'::regprocedure), 'search_path=pg_catalog', 'save has fixed search path');
select ok(has_function_privilege('authenticated','rts_private.save_see_clearly(text,text,text,text)','execute'), 'authenticated may execute');
select ok(not has_function_privilege('anon','rts_private.save_see_clearly(text,text,text,text)','execute'), 'anonymous may not execute');
select is((select prosecdef from pg_proc where oid='rts_private.validate_formation_link_lineage()'::regprocedure), true, 'lineage validation is security definer');
select is((select array_to_string(proconfig, ',') from pg_proc where oid='rts_private.validate_formation_link_lineage()'::regprocedure), 'search_path=pg_catalog', 'lineage validation has fixed search path');

set local role authenticated;
select set_config('request.jwt.claim.sub','00000000-0000-4000-8000-0000000000d1',true);
select * from rts_private.save_awaken_observation('source','inside','body');
update public.user_curriculum_state set current_node_id='bridge.awaken-see-clearly' where user_id='00000000-0000-4000-8000-0000000000d1';
select is((select current_node_id from rts_private.save_see_clearly('  fact  ','  meaning  ','expectation','  outcome expected  ')), 'bridge.see-clearly-become'::text, 'save advances to Become bridge');
select results_eq($$select entry_kind::text,body from public.journal_entries where node_id like 'see-clearly.%' order by created_at$$, $$values ('observable_fact'::text,'  fact  '::text),('interpretation'::text,'  meaning  '::text),('belief_expectation'::text,'  outcome expected  '::text)$$, 'exact wording remains separate');
select results_eq($$select record_type::text from public.formation_records where node_id like 'see-clearly.%' order by created_at$$, $$values ('observable_fact'::text),('interpretation'::text),('expectation'::text)$$, 'exactly one belief-or-expectation typed record is created');
select is((select count(*)::integer from public.formation_links where link_type='awaken_to_see_clearly'),1,'one identity-only lineage link is created');

select * from finish();
rollback;
