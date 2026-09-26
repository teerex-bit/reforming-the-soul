begin;
select plan(19);
insert into auth.users (id,instance_id,aud,role,email,encrypted_password,email_confirmed_at,raw_app_meta_data,raw_user_meta_data,created_at,updated_at) values
('00000000-0000-4000-8000-0000000000f1','00000000-0000-0000-0000-000000000000','authenticated','authenticated','sy4-a@example.test','',now(),'{}','{}',now(),now()),
('00000000-0000-4000-8000-0000000000f2','00000000-0000-0000-0000-000000000000','authenticated','authenticated','sy4-b@example.test','',now(),'{}','{}',now(),now());
insert into public.deep_dive_module_progress(id,user_id,curriculum_version_id,module_id,last_section_id,completed_at) values
('f1000000-0000-4000-8000-000000000001','00000000-0000-4000-8000-0000000000f1','phase-1-v1','see-clearly.sy3','carry-forward',now()),
('f1000000-0000-4000-8000-000000000002','00000000-0000-4000-8000-0000000000f1','phase-1-v1','see-clearly.sy4','look-again',null),
('f1000000-0000-4000-8000-000000000003','00000000-0000-4000-8000-0000000000f2','phase-1-v1','see-clearly.sy3','carry-forward',now()),
('f1000000-0000-4000-8000-000000000004','00000000-0000-4000-8000-0000000000f2','phase-1-v1','see-clearly.sy4','look-again',null);
insert into public.see_clearly_sy3_records(id,user_id,progress_id,self_story_hypothesis) values
('f2000000-0000-4000-8000-000000000001','00000000-0000-4000-8000-0000000000f1','f1000000-0000-4000-8000-000000000001','My SY3 story'),
('f2000000-0000-4000-8000-000000000002','00000000-0000-4000-8000-0000000000f2','f1000000-0000-4000-8000-000000000003','Another user story');
select is((select count(*)::integer from pg_class where oid='public.see_clearly_sy4_records'::regclass and relrowsecurity and relforcerowsecurity),1,'SY4 enables and forces RLS');
select lives_ok($$insert into public.deep_dive_reflections(user_id,progress_id,prompt_id,body) values ('00000000-0000-4000-8000-0000000000f1','f1000000-0000-4000-8000-000000000002','sy4-reflection','Uncertain for now.')$$,'new reflection identifier accepted');
select lives_ok($$insert into public.deep_dive_reflections(user_id,progress_id,prompt_id,body) values ('00000000-0000-4000-8000-0000000000f1','f1000000-0000-4000-8000-000000000001','sy2-reflection','Earlier reflection.')$$,'previous reflection identifier retained');
select lives_ok($$insert into public.deep_dive_module_progress(user_id,curriculum_version_id,module_id,last_section_id) values ('00000000-0000-4000-8000-0000000000f1','phase-1-v1','awaken.pay-attention','entry')$$,'previous module identifier retained');
set local role authenticated;
select set_config('request.jwt.claim.sub','00000000-0000-4000-8000-0000000000f1',true);
select throws_like($$insert into public.see_clearly_sy4_records(user_id,progress_id,truth_to_live_from) values ('00000000-0000-4000-8000-0000000000f1','f1000000-0000-4000-8000-000000000002','   ')$$,'%truth_to_live_from_check%','empty story rejected');
select throws_like($$insert into public.see_clearly_sy4_records(user_id,progress_id,source_sy3_record_id,source_was_linked,truth_to_live_from) values ('00000000-0000-4000-8000-0000000000f1','f1000000-0000-4000-8000-000000000002','f2000000-0000-4000-8000-000000000001',true,' ')$$,'%truth_to_live_from_check%','source-only record rejected');
select lives_ok($$insert into public.see_clearly_sy4_records(id,user_id,progress_id,truth_to_live_from) values ('f3000000-0000-4000-8000-000000000001','00000000-0000-4000-8000-0000000000f1','f1000000-0000-4000-8000-000000000002','  I want to live from grace.  ')$$,'no-source story accepted');
select is((select truth_to_live_from from public.see_clearly_sy4_records where id='f3000000-0000-4000-8000-000000000001'),'  I want to live from grace.  ','exact wording retained');
select lives_ok($$update public.see_clearly_sy4_records set source_sy3_record_id='f2000000-0000-4000-8000-000000000001',source_was_linked=true where id='f3000000-0000-4000-8000-000000000001'$$,'owned SY3 source accepted');
select throws_like($$update public.see_clearly_sy4_records set user_id='00000000-0000-4000-8000-0000000000f2' where id='f3000000-0000-4000-8000-000000000001'$$,'%user_id is immutable%','owner immutable');
select set_config('request.jwt.claim.sub','00000000-0000-4000-8000-0000000000f2',true);
select is((select count(*)::integer from public.see_clearly_sy4_records),0,'other owner cannot read');
select throws_ok($$insert into public.see_clearly_sy4_records(user_id,progress_id,source_sy3_record_id,source_was_linked,truth_to_live_from) values ('00000000-0000-4000-8000-0000000000f2','f1000000-0000-4000-8000-000000000004','f2000000-0000-4000-8000-000000000001',true,'Another story')$$,'23503',null,'cross-owner source rejected');
set local role anon;
select set_config('request.jwt.claim.sub','',true);
select throws_like($$select * from public.see_clearly_sy4_records$$,'%permission denied%','anonymous read denied');
reset role;
update public.deep_dive_module_progress set last_section_id='carry-forward',completed_at=now() where id='f1000000-0000-4000-8000-000000000002';
delete from public.see_clearly_sy3_records where id='f2000000-0000-4000-8000-000000000001';
select is((select source_sy3_record_id from public.see_clearly_sy4_records where id='f3000000-0000-4000-8000-000000000001'),null,'source deletion nulls link');
select is((select source_was_linked from public.see_clearly_sy4_records where id='f3000000-0000-4000-8000-000000000001'),true,'source history remains');
select is((select truth_to_live_from from public.see_clearly_sy4_records where id='f3000000-0000-4000-8000-000000000001'),'  I want to live from grace.  ','source deletion preserves truth wording');
select is((select count(*)::integer from public.deep_dive_reflections where prompt_id='sy4-reflection'),1,'source deletion preserves reflection');
select is((select count(*)::integer from public.deep_dive_module_progress where id='f1000000-0000-4000-8000-000000000002' and completed_at is not null),1,'source deletion preserves completion');
delete from public.see_clearly_sy4_records where id='f3000000-0000-4000-8000-000000000001';
select is((select count(*)::integer from public.deep_dive_module_progress where id='f1000000-0000-4000-8000-000000000002' and completed_at is not null),1,'story deletion preserves completion');
select * from finish();
rollback;
