begin;
select plan(9);
insert into auth.users (id,instance_id,aud,role,email,encrypted_password,email_confirmed_at,raw_app_meta_data,raw_user_meta_data,created_at,updated_at) values
('00000000-0000-4000-8000-0000000000e1','00000000-0000-0000-0000-000000000000','authenticated','authenticated','sg4-a@example.test','',now(),'{}','{}',now(),now()),
('00000000-0000-4000-8000-0000000000e2','00000000-0000-0000-0000-000000000000','authenticated','authenticated','sg4-b@example.test','',now(),'{}','{}',now(),now());
insert into public.deep_dive_module_progress(id,user_id,curriculum_version_id,module_id,last_section_id) values
('e1000000-0000-4000-8000-000000000001','00000000-0000-4000-8000-0000000000e1','phase-1-v1','see-clearly.sg4','trust-question'),
('e1000000-0000-4000-8000-000000000002','00000000-0000-4000-8000-0000000000e2','phase-1-v1','see-clearly.sg4','trust-question');
select is((select count(*)::integer from pg_class where oid='public.see_clearly_sg4_records'::regclass and relrowsecurity and relforcerowsecurity),1,'SG4 enables and forces RLS');
set local role authenticated;
select set_config('request.jwt.claim.sub','00000000-0000-4000-8000-0000000000e1',true);
select throws_like($$insert into public.see_clearly_sg4_records(user_id,progress_id,situation,trust_meaning) values ('00000000-0000-4000-8000-0000000000e1','e1000000-0000-4000-8000-000000000001',' ','I can ask for help')$$,'%situation_check%','empty situation rejected');
select throws_like($$insert into public.see_clearly_sg4_records(user_id,progress_id,situation,trust_meaning) values ('00000000-0000-4000-8000-0000000000e1','e1000000-0000-4000-8000-000000000001','Waiting',' ')$$,'%trust_meaning_check%','empty trust statement rejected');
select lives_ok($$insert into public.see_clearly_sg4_records(id,user_id,progress_id,situation,trust_meaning) values ('e2000000-0000-4000-8000-000000000001','00000000-0000-4000-8000-0000000000e1','e1000000-0000-4000-8000-000000000001','  Waiting for a decision.  ','  I can act responsibly without controlling the answer.  ')$$,'owned wording accepted');
select is((select trust_meaning from public.see_clearly_sg4_records where id='e2000000-0000-4000-8000-000000000001'),'  I can act responsibly without controlling the answer.  ','exact trust wording retained');
select throws_like($$update public.see_clearly_sg4_records set user_id='00000000-0000-4000-8000-0000000000e2' where id='e2000000-0000-4000-8000-000000000001'$$,'%user_id is immutable%','owner immutable');
select set_config('request.jwt.claim.sub','00000000-0000-4000-8000-0000000000e2',true);
select is((select count(*)::integer from public.see_clearly_sg4_records),0,'other owner cannot read');
select throws_ok($$insert into public.see_clearly_sg4_records(user_id,progress_id,situation,trust_meaning) values ('00000000-0000-4000-8000-0000000000e2','e1000000-0000-4000-8000-000000000001','Borrowed','Borrowed')$$,'23503',null,'cross-owner progress rejected');
reset role;
update public.deep_dive_module_progress set completed_at=now() where id='e1000000-0000-4000-8000-000000000001';
delete from public.see_clearly_sg4_records where id='e2000000-0000-4000-8000-000000000001';
select is((select count(*)::integer from public.deep_dive_module_progress where id='e1000000-0000-4000-8000-000000000001' and completed_at is not null),1,'deletion preserves completion');
select * from finish();
rollback;
