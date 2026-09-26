begin;
select plan(19);
insert into auth.users (id,instance_id,aud,role,email,encrypted_password,email_confirmed_at,raw_app_meta_data,raw_user_meta_data,created_at,updated_at) values
('00000000-0000-4000-8000-0000000000e1','00000000-0000-0000-0000-000000000000','authenticated','authenticated','sy3-a@example.test','',now(),'{}','{}',now(),now()),
('00000000-0000-4000-8000-0000000000e2','00000000-0000-0000-0000-000000000000','authenticated','authenticated','sy3-b@example.test','',now(),'{}','{}',now(),now());
insert into public.deep_dive_module_progress(id,user_id,curriculum_version_id,module_id,last_section_id,completed_at) values
('e1000000-0000-4000-8000-000000000001','00000000-0000-4000-8000-0000000000e1','phase-1-v1','see-clearly.sy2','carry-forward',now()),
('e1000000-0000-4000-8000-000000000002','00000000-0000-4000-8000-0000000000e1','phase-1-v1','see-clearly.sy3','recognition',null),
('e1000000-0000-4000-8000-000000000003','00000000-0000-4000-8000-0000000000e2','phase-1-v1','see-clearly.sy2','carry-forward',now()),
('e1000000-0000-4000-8000-000000000004','00000000-0000-4000-8000-0000000000e2','phase-1-v1','see-clearly.sy3','recognition',null);
insert into public.see_clearly_sy2_records(id,user_id,progress_id,belief) values
('e2000000-0000-4000-8000-000000000001','00000000-0000-4000-8000-0000000000e1','e1000000-0000-4000-8000-000000000001','My SY2 wording'),
('e2000000-0000-4000-8000-000000000002','00000000-0000-4000-8000-0000000000e2','e1000000-0000-4000-8000-000000000003','Another user wording');
select is((select count(*)::integer from pg_class where oid='public.see_clearly_sy3_records'::regclass and relrowsecurity and relforcerowsecurity),1,'SY3 enables and forces RLS');
select lives_ok($$insert into public.deep_dive_reflections(user_id,progress_id,prompt_id,body) values ('00000000-0000-4000-8000-0000000000e1','e1000000-0000-4000-8000-000000000002','sy3-reflection','Uncertain for now.')$$,'new reflection identifier accepted');
select lives_ok($$insert into public.deep_dive_reflections(user_id,progress_id,prompt_id,body) values ('00000000-0000-4000-8000-0000000000e1','e1000000-0000-4000-8000-000000000001','sy2-reflection','Earlier reflection.')$$,'previous reflection identifier retained');
select lives_ok($$insert into public.deep_dive_module_progress(user_id,curriculum_version_id,module_id,last_section_id) values ('00000000-0000-4000-8000-0000000000e1','phase-1-v1','awaken.pay-attention','entry')$$,'previous module identifier retained');
set local role authenticated;
select set_config('request.jwt.claim.sub','00000000-0000-4000-8000-0000000000e1',true);
select throws_like($$insert into public.see_clearly_sy3_records(user_id,progress_id,self_story_hypothesis) values ('00000000-0000-4000-8000-0000000000e1','e1000000-0000-4000-8000-000000000002','   ')$$,'%self_story_hypothesis_check%','empty story rejected');
select throws_like($$insert into public.see_clearly_sy3_records(user_id,progress_id,source_sy2_record_id,self_story_hypothesis) values ('00000000-0000-4000-8000-0000000000e1','e1000000-0000-4000-8000-000000000002','e2000000-0000-4000-8000-000000000001',' ')$$,'%self_story_hypothesis_check%','source-only record rejected');
select lives_ok($$insert into public.see_clearly_sy3_records(id,user_id,progress_id,self_story_hypothesis) values ('e3000000-0000-4000-8000-000000000001','00000000-0000-4000-8000-0000000000e1','e1000000-0000-4000-8000-000000000002','  I may have learned...  ')$$,'no-source story accepted');
select is((select self_story_hypothesis from public.see_clearly_sy3_records where id='e3000000-0000-4000-8000-000000000001'),'  I may have learned...  ','exact wording retained');
select lives_ok($$update public.see_clearly_sy3_records set source_sy2_record_id='e2000000-0000-4000-8000-000000000001',source_was_linked=true where id='e3000000-0000-4000-8000-000000000001'$$,'owned SY2 source accepted');
select throws_like($$update public.see_clearly_sy3_records set user_id='00000000-0000-4000-8000-0000000000e2' where id='e3000000-0000-4000-8000-000000000001'$$,'%user_id is immutable%','owner immutable');
select set_config('request.jwt.claim.sub','00000000-0000-4000-8000-0000000000e2',true);
select is((select count(*)::integer from public.see_clearly_sy3_records),0,'other owner cannot read');
select throws_ok($$insert into public.see_clearly_sy3_records(user_id,progress_id,source_sy2_record_id,source_was_linked,self_story_hypothesis) values ('00000000-0000-4000-8000-0000000000e2','e1000000-0000-4000-8000-000000000004','e2000000-0000-4000-8000-000000000001',true,'Another story')$$,'23503',null,'cross-owner source rejected');
set local role anon;
select set_config('request.jwt.claim.sub','',true);
select throws_like($$select * from public.see_clearly_sy3_records$$,'%permission denied%','anonymous read denied');
reset role;
update public.deep_dive_module_progress set last_section_id='carry-forward',completed_at=now() where id='e1000000-0000-4000-8000-000000000002';
delete from public.see_clearly_sy2_records where id='e2000000-0000-4000-8000-000000000001';
select is((select source_sy2_record_id from public.see_clearly_sy3_records where id='e3000000-0000-4000-8000-000000000001'),null,'source deletion nulls link');
select is((select source_was_linked from public.see_clearly_sy3_records where id='e3000000-0000-4000-8000-000000000001'),true,'source history remains');
select is((select self_story_hypothesis from public.see_clearly_sy3_records where id='e3000000-0000-4000-8000-000000000001'),'  I may have learned...  ','source deletion preserves story');
select is((select count(*)::integer from public.deep_dive_reflections where prompt_id='sy3-reflection'),1,'source deletion preserves reflection');
select is((select count(*)::integer from public.deep_dive_module_progress where id='e1000000-0000-4000-8000-000000000002' and completed_at is not null),1,'source deletion preserves completion');
delete from public.see_clearly_sy3_records where id='e3000000-0000-4000-8000-000000000001';
select is((select count(*)::integer from public.deep_dive_module_progress where id='e1000000-0000-4000-8000-000000000002' and completed_at is not null),1,'story deletion preserves completion');
select * from finish();
rollback;
