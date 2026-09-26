begin;
select plan(15);
insert into auth.users (id,instance_id,aud,role,email,encrypted_password,email_confirmed_at,raw_app_meta_data,raw_user_meta_data,created_at,updated_at) values
('00000000-0000-4000-8000-0000000000a1','00000000-0000-0000-0000-000000000000','authenticated','authenticated','sg1-a@example.test','',now(),'{}','{}',now(),now()),
('00000000-0000-4000-8000-0000000000a2','00000000-0000-0000-0000-000000000000','authenticated','authenticated','sg1-b@example.test','',now(),'{}','{}',now(),now());
insert into public.deep_dive_module_progress(id,user_id,curriculum_version_id,module_id,last_section_id,completed_at) values
('a1000000-0000-4000-8000-000000000001','00000000-0000-4000-8000-0000000000a1','phase-1-v1','see-clearly.sg1','recognition',null),
('a1000000-0000-4000-8000-000000000002','00000000-0000-4000-8000-0000000000a2','phase-1-v1','see-clearly.sg1','recognition',null);
select is((select count(*)::integer from pg_class where oid='public.see_clearly_sg1_records'::regclass and relrowsecurity and relforcerowsecurity),1,'SG1 enables and forces RLS');
select lives_ok($$insert into public.deep_dive_reflections(user_id,progress_id,prompt_id,body) values ('00000000-0000-4000-8000-0000000000a1','a1000000-0000-4000-8000-000000000001','sg1-reflection','This feels familiar.')$$,'SG1 reflection identifier accepted');
select lives_ok($$insert into public.deep_dive_module_progress(user_id,curriculum_version_id,module_id,last_section_id) values ('00000000-0000-4000-8000-0000000000a1','phase-1-v1','see-clearly.sy4','entry')$$,'previous module identifier retained');
set local role authenticated;
select set_config('request.jwt.claim.sub','00000000-0000-4000-8000-0000000000a1',true);
select throws_like($$insert into public.see_clearly_sg1_records(user_id,progress_id,learned_god_image) values ('00000000-0000-4000-8000-0000000000a1','a1000000-0000-4000-8000-000000000001','   ')$$,'%learned_god_image_check%','empty picture rejected');
select throws_like($$insert into public.see_clearly_sg1_records(user_id,progress_id,learned_god_image,source_influence_note) values ('00000000-0000-4000-8000-0000000000a1','a1000000-0000-4000-8000-000000000001',' ','A possible influence')$$,'%learned_god_image_check%','note-only record rejected');
select lives_ok($$insert into public.see_clearly_sg1_records(id,user_id,progress_id,learned_god_image,source_influence_note) values ('a2000000-0000-4000-8000-000000000001','00000000-0000-4000-8000-0000000000a1','a1000000-0000-4000-8000-000000000001','  He seemed distant.  ','  Waiting may have shaped this.  ')$$,'participant picture and optional note accepted');
select is((select learned_god_image from public.see_clearly_sg1_records where id='a2000000-0000-4000-8000-000000000001'),'  He seemed distant.  ','exact primary wording retained');
select is((select source_influence_note from public.see_clearly_sg1_records where id='a2000000-0000-4000-8000-000000000001'),'  Waiting may have shaped this.  ','exact influence wording retained');
select throws_like($$update public.see_clearly_sg1_records set user_id='00000000-0000-4000-8000-0000000000a2' where id='a2000000-0000-4000-8000-000000000001'$$,'%user_id is immutable%','owner immutable');
select set_config('request.jwt.claim.sub','00000000-0000-4000-8000-0000000000a2',true);
select is((select count(*)::integer from public.see_clearly_sg1_records),0,'other owner cannot read');
select throws_ok($$insert into public.see_clearly_sg1_records(user_id,progress_id,learned_god_image) values ('00000000-0000-4000-8000-0000000000a2','a1000000-0000-4000-8000-000000000001','Borrowed picture')$$,'23503',null,'cross-owner progress rejected');
set local role anon;
select set_config('request.jwt.claim.sub','',true);
select throws_like($$select * from public.see_clearly_sg1_records$$,'%permission denied%','anonymous read denied');
reset role;
update public.deep_dive_module_progress set last_section_id='carry-forward',completed_at=now() where id='a1000000-0000-4000-8000-000000000001';
delete from public.see_clearly_sg1_records where id='a2000000-0000-4000-8000-000000000001';
select is((select count(*)::integer from public.see_clearly_sg1_records where user_id='00000000-0000-4000-8000-0000000000a1'),0,'picture can be deleted independently');
select is((select count(*)::integer from public.deep_dive_reflections where prompt_id='sg1-reflection'),1,'picture deletion preserves reflection');
select is((select count(*)::integer from public.deep_dive_module_progress where id='a1000000-0000-4000-8000-000000000001' and completed_at is not null),1,'picture deletion preserves completion');
select * from finish();
rollback;
