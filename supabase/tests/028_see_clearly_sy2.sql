begin;
select plan(24);

insert into auth.users (id, instance_id, aud, role, email, encrypted_password, email_confirmed_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at)
values
('00000000-0000-4000-8000-0000000000d1','00000000-0000-0000-0000-000000000000','authenticated','authenticated','sy2-a@example.test','',now(),'{}','{}',now(),now()),
('00000000-0000-4000-8000-0000000000d2','00000000-0000-0000-0000-000000000000','authenticated','authenticated','sy2-b@example.test','',now(),'{}','{}',now(),now());
insert into public.deep_dive_module_progress(id,user_id,curriculum_version_id,module_id,last_section_id)
values
('d1000000-0000-4000-8000-000000000001','00000000-0000-4000-8000-0000000000d1','phase-1-v1','see-clearly.sc1','carry-forward'),
('d1000000-0000-4000-8000-000000000002','00000000-0000-4000-8000-0000000000d1','phase-1-v1','see-clearly.sy2','trace'),
('d1000000-0000-4000-8000-000000000003','00000000-0000-4000-8000-0000000000d2','phase-1-v1','see-clearly.sc1','carry-forward'),
('d1000000-0000-4000-8000-000000000004','00000000-0000-4000-8000-0000000000d2','phase-1-v1','see-clearly.sy2','trace');
insert into public.journal_entries(id,user_id,curriculum_version_id,node_id,entry_kind,body)
values ('d2000000-0000-4000-8000-000000000001','00000000-0000-4000-8000-0000000000d1','phase-1-v1','awaken.pay-attention.observe','event','Private journal source');
insert into public.see_clearly_sc1_records(id,user_id,progress_id,source_entry_id,event_facts,automatic_interpretation)
values
('d3000000-0000-4000-8000-000000000001','00000000-0000-4000-8000-0000000000d1','d1000000-0000-4000-8000-000000000001','d2000000-0000-4000-8000-000000000001','The phone was silent.','I felt ignored.'),
('d3000000-0000-4000-8000-000000000002','00000000-0000-4000-8000-0000000000d2','d1000000-0000-4000-8000-000000000003',null,'Another moment.','Another interpretation.');

select is((select count(*)::integer from pg_class c join pg_namespace n on n.oid=c.relnamespace where n.nspname='public' and c.relname='see_clearly_sy2_records' and c.relrowsecurity and c.relforcerowsecurity),1,'SY2 enables and forces RLS');
select lives_ok($$insert into public.deep_dive_reflections(user_id,progress_id,prompt_id,body) values ('00000000-0000-4000-8000-0000000000d1','d1000000-0000-4000-8000-000000000002','sy2-reflection','I noticed a pattern.')$$,'SY2 reflection identifier is accepted');
select throws_like($$insert into public.deep_dive_module_progress(user_id,curriculum_version_id,module_id,last_section_id) values ('00000000-0000-4000-8000-0000000000d1','phase-1-v1','see-clearly.sc3','entry')$$,'%module_id_check%','SY3 remains unapproved');

set local role authenticated;
select set_config('request.jwt.claim.sub','00000000-0000-4000-8000-0000000000d1',true);
select lives_ok($$insert into public.see_clearly_sy2_records(id,user_id,progress_id,source_sc1_record_id,perception,belief,recurring_chain_tags) values ('d4000000-0000-4000-8000-000000000001','00000000-0000-4000-8000-0000000000d1','d1000000-0000-4000-8000-000000000002','d3000000-0000-4000-8000-000000000001','What I saw','Maybe this means something','{}')$$,'owned SY1 source is accepted');
select is((select expectation from public.see_clearly_sy2_records where id='d4000000-0000-4000-8000-000000000001'),null,'an uncertain link can remain open');
select lives_ok($$update public.see_clearly_sy2_records set desire='I am unsure',updated_at=now() where id='d4000000-0000-4000-8000-000000000001'$$,'participant can preserve uncertain wording exactly');
select is((select desire from public.see_clearly_sy2_records where id='d4000000-0000-4000-8000-000000000001'),'I am unsure','wording is preserved');
select throws_like($$update public.see_clearly_sy2_records set user_id='00000000-0000-4000-8000-0000000000d2' where id='d4000000-0000-4000-8000-000000000001'$$,'%user_id is immutable%','ownership is immutable');
select throws_ok($$insert into public.see_clearly_sy2_records(user_id,progress_id,perception) values ('00000000-0000-4000-8000-0000000000d1','d1000000-0000-4000-8000-000000000001','wrong module')$$,'23503',null,'SY2 cannot attach to SY1 progress');
select is((select count(*)::integer from public.see_clearly_sy2_records),1,'owner reads own row');

select set_config('request.jwt.claim.sub','00000000-0000-4000-8000-0000000000d2',true);
select is((select count(*)::integer from public.see_clearly_sy2_records),0,'other owner cannot read row');
update public.see_clearly_sy2_records set belief='tampered' where id='d4000000-0000-4000-8000-000000000001';
select is((select count(*)::integer from public.see_clearly_sy2_records where belief='tampered'),0,'other owner cannot update row');
select throws_ok($$insert into public.see_clearly_sy2_records(user_id,progress_id,source_sc1_record_id,belief) values ('00000000-0000-4000-8000-0000000000d2','d1000000-0000-4000-8000-000000000004','d3000000-0000-4000-8000-000000000001','A belief')$$,'23503',null,'cross-owner SY1 source is rejected');
select lives_ok($$insert into public.see_clearly_sy2_records(id,user_id,progress_id,belief) values ('d4000000-0000-4000-8000-000000000002','00000000-0000-4000-8000-0000000000d2','d1000000-0000-4000-8000-000000000004','An independent belief')$$,'no source is accepted');

set local role anon;
select set_config('request.jwt.claim.sub','',true);
select throws_like($$select * from public.see_clearly_sy2_records$$,'%permission denied%','anonymous cannot read SY2');
reset role;

delete from public.see_clearly_sc1_records where id='d3000000-0000-4000-8000-000000000002';
select is((select belief from public.see_clearly_sy2_records where id='d4000000-0000-4000-8000-000000000002'),'An independent belief','deleting unrelated source leaves independent record');
insert into public.see_clearly_sc1_records(id,user_id,progress_id,event_facts,automatic_interpretation)
values ('d3000000-0000-4000-8000-000000000003','00000000-0000-4000-8000-0000000000d2','d1000000-0000-4000-8000-000000000003','A new fact.','A new meaning.');
update public.see_clearly_sy2_records set source_sc1_record_id='d3000000-0000-4000-8000-000000000003',source_was_linked=true where id='d4000000-0000-4000-8000-000000000002';
select is((select source_sc1_record_id from public.see_clearly_sy2_records where id='d4000000-0000-4000-8000-000000000002'),'d3000000-0000-4000-8000-000000000003'::uuid,'own source can be linked');
delete from public.see_clearly_sc1_records where id='d3000000-0000-4000-8000-000000000003';
select is((select source_sc1_record_id from public.see_clearly_sy2_records where id='d4000000-0000-4000-8000-000000000002'),null,'direct SY1 deletion nulls only the source');
select is((select belief from public.see_clearly_sy2_records where id='d4000000-0000-4000-8000-000000000002'),'An independent belief','direct source deletion preserves SY2 wording');
delete from public.journal_entries where id='d2000000-0000-4000-8000-000000000001';
select is((select source_sc1_record_id from public.see_clearly_sy2_records where id='d4000000-0000-4000-8000-000000000001'),null,'journal cascade unlinks only source ID');
select is((select user_id from public.see_clearly_sy2_records where id='d4000000-0000-4000-8000-000000000001'),'00000000-0000-4000-8000-0000000000d1'::uuid,'owner remains after source deletion');
select is((select desire from public.see_clearly_sy2_records where id='d4000000-0000-4000-8000-000000000001'),'I am unsure','wording remains after source deletion');
select is((select count(*)::integer from public.deep_dive_module_progress where id='d1000000-0000-4000-8000-000000000002'),1,'SY2 progress remains');
select is((select count(*)::integer from public.deep_dive_reflections where prompt_id='sy2-reflection'),1,'SY2 reflection remains');

select * from finish();
rollback;
