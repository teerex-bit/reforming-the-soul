begin;
select plan(8);
insert into auth.users (id,instance_id,aud,role,email,encrypted_password,email_confirmed_at,raw_app_meta_data,raw_user_meta_data,created_at,updated_at) values
('00000000-0000-4000-8000-0000000000d1','00000000-0000-0000-0000-000000000000','authenticated','authenticated','sg3-a@example.test','',now(),'{}','{}',now(),now()),
('00000000-0000-4000-8000-0000000000d2','00000000-0000-0000-0000-000000000000','authenticated','authenticated','sg3-b@example.test','',now(),'{}','{}',now(),now());
insert into public.deep_dive_module_progress(id,user_id,curriculum_version_id,module_id,last_section_id) values
('d1000000-0000-4000-8000-000000000001','00000000-0000-4000-8000-0000000000d1','phase-1-v1','see-clearly.sg3','observation'),
('d1000000-0000-4000-8000-000000000002','00000000-0000-4000-8000-0000000000d2','phase-1-v1','see-clearly.sg3','observation');
select is((select count(*)::integer from pg_class where oid='public.see_clearly_sg3_records'::regclass and relrowsecurity and relforcerowsecurity),1,'SG3 enables and forces RLS');
set local role authenticated;
select set_config('request.jwt.claim.sub','00000000-0000-4000-8000-0000000000d1',true);
select throws_like($$insert into public.see_clearly_sg3_records(user_id,progress_id,observation) values ('00000000-0000-4000-8000-0000000000d1','d1000000-0000-4000-8000-000000000001',' ')$$,'%observation_check%','empty observation rejected');
select lives_ok($$insert into public.see_clearly_sg3_records(id,user_id,progress_id,observation) values ('d2000000-0000-4000-8000-000000000001','00000000-0000-4000-8000-0000000000d1','d1000000-0000-4000-8000-000000000001','  He remained with Peter.  ')$$,'owned wording accepted');
select is((select observation from public.see_clearly_sg3_records where id='d2000000-0000-4000-8000-000000000001'),'  He remained with Peter.  ','exact observation retained');
select throws_like($$update public.see_clearly_sg3_records set user_id='00000000-0000-4000-8000-0000000000d2' where id='d2000000-0000-4000-8000-000000000001'$$,'%user_id is immutable%','owner immutable');
select set_config('request.jwt.claim.sub','00000000-0000-4000-8000-0000000000d2',true);
select is((select count(*)::integer from public.see_clearly_sg3_records),0,'other owner cannot read');
select throws_ok($$insert into public.see_clearly_sg3_records(user_id,progress_id,observation) values ('00000000-0000-4000-8000-0000000000d2','d1000000-0000-4000-8000-000000000001','Borrowed')$$,'23503',null,'cross-owner progress rejected');
reset role;
update public.deep_dive_module_progress set completed_at=now() where id='d1000000-0000-4000-8000-000000000001';
delete from public.see_clearly_sg3_records where id='d2000000-0000-4000-8000-000000000001';
select is((select count(*)::integer from public.deep_dive_module_progress where id='d1000000-0000-4000-8000-000000000001' and completed_at is not null),1,'deletion preserves completion');
select * from finish();
rollback;
