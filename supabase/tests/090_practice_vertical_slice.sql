begin;
select plan(20);
insert into auth.users (id,instance_id,aud,role,email,encrypted_password,email_confirmed_at,raw_app_meta_data,raw_user_meta_data,created_at,updated_at)
values ('90000000-0000-4000-8000-0000000000a1','00000000-0000-0000-0000-000000000000','authenticated','authenticated','slice-practice@example.test','',now(),'{}','{}',now(),now());
set local role authenticated;
select set_config('request.jwt.claims','{"sub":"90000000-0000-4000-8000-0000000000a1"}',true);
select set_config('request.jwt.claim.sub','90000000-0000-4000-8000-0000000000a1',true);
insert into public.user_curriculum_state(user_id,curriculum_version_id,current_node_id,state)
values('90000000-0000-4000-8000-0000000000a1','phase-1-v1','bridge.see-clearly-become','in_progress');

select results_eq(
  $$select state::text,lock_version from rts_private.save_become_practice('  control  ','真実 now',' call them ')$$,
  $$values ('waiting_for_real_life'::text,0)$$,'Become saves directly as a waiting practice');
select is((select count(*)::integer from public.journal_entries where entry_kind in ('control_target','present_truth','next_right_step')),3,'three exact-wording entries are separate');
select is((select count(*)::integer from public.formation_records where record_type in ('control_target','present_truth','next_right_step')),3,'three structured records are separate');
select is((select body from public.journal_entries where entry_kind='control_target'),'  control  ','practice wording is preserved byte-for-byte');
select is((select current_node_id from public.user_curriculum_state),'become.practice.return','curriculum resume advances independently');
select is((select count(*)::integer from public.formation_links where link_type='see_clearly_to_become'),0,'practice creation does not invent lineage when no See Clearly record exists');
select throws_ok($$select * from rts_private.save_become_practice(' ','truth','step')$$::text,'22023'::character(5),'practice wording is required'::text,'blank practice wording is rejected');

select results_eq(
  $$select state::text,lock_version from rts_private.record_practice_return((select id from public.practices),0,' outcome ')$$,
  $$values ('ready_to_review'::text,1)$$,'return is saved atomically');
select is((select current_node_id from public.user_curriculum_state),'become.practice.review','return advances curriculum resume to review');
select throws_ok($$select * from rts_private.record_practice_return((select id from public.practices),1,U&'\00A0\2003')$$::text,'22023'::character(5),'practice outcome wording is required'::text,'Unicode whitespace-only outcome is rejected');
select results_eq(
  $$select state::text,lock_version from rts_private.review_practice((select id from public.practices),1,' review ')$$,
  $$values ('reviewed'::text,2)$$,'review is saved atomically');
select throws_ok($$select * from rts_private.review_practice((select id from public.practices),2,U&'\00A0\2003')$$::text,'22023'::character(5),'practice review wording is required'::text,'Unicode whitespace-only review is rejected');
select results_eq(
  $$select state::text,lock_version from rts_private.transition_practice((select id from public.practices),'reviewed',2,'closed')$$,
  $$values ('closed'::text,3)$$,'reviewed practice closes');
select is((select current_node_id from public.user_curriculum_state),'become.practice.review'::text,'close retains the approved terminal curriculum node');
select is((select state::text from public.user_curriculum_state),'completed'::text,'close completes the curriculum session');
select is((select body from public.journal_entries where entry_kind='practice_outcome'),' outcome ','outcome wording remains exact');
select is((select body from public.journal_entries where entry_kind='practice_review'),' review ','review wording remains exact');
select is((select count(*)::integer from public.journal_entries where entry_kind in ('practice_outcome','practice_review')),2,'rejected blank writes leave no partial journal entries');
insert into public.journal_entries(user_id,curriculum_version_id,node_id,entry_kind,body) values('90000000-0000-4000-8000-0000000000a1','phase-1-v1','become.next-step','next_right_step','wrong target') returning id \gset wrong_
select throws_ok(format($q$insert into public.formation_links(user_id,link_type,source_practice_id,target_journal_entry_id) values('90000000-0000-4000-8000-0000000000a1','practice_to_return','%s','%s')$q$,(select id from public.practices),:'wrong_id')::text,'23514'::character(5),'invalid practice to return lineage'::text,'practice-to-return requires the approved target node and kind');
insert into public.journal_entries(user_id,curriculum_version_id,node_id,entry_kind,body) values('90000000-0000-4000-8000-0000000000a1','phase-1-v1','see-clearly.fact','observable_fact','wrong source') returning id \gset source_
insert into public.formation_records(user_id,curriculum_version_id,node_id,record_type,value_text,source_journal_entry_id,provenance) values('90000000-0000-4000-8000-0000000000a1','phase-1-v1','see-clearly.fact','observable_fact','wrong source',:'source_id','user_authored') returning id \gset record_
select throws_ok(format($q$insert into public.formation_links(user_id,link_type,source_formation_record_id,target_practice_id) values('90000000-0000-4000-8000-0000000000a1','see_clearly_to_become','%s','%s')$q$,:'record_id',(select id from public.practices))::text,'23514'::character(5),'invalid See Clearly to Become lineage'::text,'See Clearly-to-Become requires belief or expectation source');
select * from finish();
rollback;
