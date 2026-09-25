begin;
select plan(19);

insert into auth.users (id, instance_id, aud, role, email, encrypted_password, email_confirmed_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at)
values
  ('00000000-0000-4000-8000-0000000000c1', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'sc1-a@example.test', '', now(), '{}', '{}', now(), now()),
  ('00000000-0000-4000-8000-0000000000c2', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'sc1-b@example.test', '', now(), '{}', '{}', now(), now());

insert into public.deep_dive_module_progress(id,user_id,curriculum_version_id,module_id,last_section_id)
values
  ('c1000000-0000-4000-8000-000000000001','00000000-0000-4000-8000-0000000000c1','phase-1-v1','see-clearly.sc1','interaction'),
  ('c1000000-0000-4000-8000-000000000002','00000000-0000-4000-8000-0000000000c2','phase-1-v1','see-clearly.sc1','entry'),
  ('c1000000-0000-4000-8000-000000000003','00000000-0000-4000-8000-0000000000c1','phase-1-v1','awaken.pay-attention','entry');
insert into public.journal_entries(id,user_id,curriculum_version_id,node_id,entry_kind,body)
values
  ('c2000000-0000-4000-8000-000000000001','00000000-0000-4000-8000-0000000000c1','phase-1-v1','awaken.pay-attention.observe','event','An earlier moment I chose'),
  ('c2000000-0000-4000-8000-000000000002','00000000-0000-4000-8000-0000000000c2','phase-1-v1','awaken.pay-attention.observe','event','A different person’s moment');
insert into public.see_clearly_sc1_records(id,user_id,progress_id,source_entry_id,event_facts,automatic_interpretation)
values ('c3000000-0000-4000-8000-000000000001','00000000-0000-4000-8000-0000000000c1','c1000000-0000-4000-8000-000000000001','c2000000-0000-4000-8000-000000000001','Two people stopped talking.','I thought I was unwelcome.');
insert into public.deep_dive_reflections(user_id,progress_id,prompt_id,body)
values ('00000000-0000-4000-8000-0000000000c1','c1000000-0000-4000-8000-000000000001','sc1-reflection','I can notice the meaning I added.');

select is((select event_facts from public.see_clearly_sc1_records where id='c3000000-0000-4000-8000-000000000001'), 'Two people stopped talking.', 'observable facts remain exact participant wording');
select is((select automatic_interpretation from public.see_clearly_sc1_records where id='c3000000-0000-4000-8000-000000000001'), 'I thought I was unwelcome.', 'automatic meaning remains distinct and exact');
select is((select body from public.deep_dive_reflections where prompt_id='sc1-reflection'), 'I can notice the meaning I added.', 'SC1 reflection has its own identifier');
select is((select count(*)::integer from pg_class c join pg_namespace n on n.oid=c.relnamespace where n.nspname='public' and c.relname='see_clearly_sc1_records' and c.relrowsecurity and c.relforcerowsecurity),1,'SC1 records enable and force RLS');

set local role authenticated;
select set_config('request.jwt.claim.sub','00000000-0000-4000-8000-0000000000c1',true);
select is((select count(*)::integer from public.see_clearly_sc1_records),1,'owner can read their SC1 record');
select lives_ok($$update public.see_clearly_sc1_records set automatic_interpretation='Perhaps they were discussing something else.' where id='c3000000-0000-4000-8000-000000000001'$$,'owner can edit their words');
select throws_like($$update public.see_clearly_sc1_records set user_id='00000000-0000-4000-8000-0000000000c2' where id='c3000000-0000-4000-8000-000000000001'$$,'%user_id is immutable%','SC1 owner is immutable');
select throws_ok($$insert into public.see_clearly_sc1_records(user_id,progress_id,event_facts,automatic_interpretation) values ('00000000-0000-4000-8000-0000000000c1','c1000000-0000-4000-8000-000000000003','fact','meaning')$$,'23503',null,'SC1 record cannot attach to A1 progress');

select set_config('request.jwt.claim.sub','00000000-0000-4000-8000-0000000000c2',true);
select is((select count(*)::integer from public.see_clearly_sc1_records),0,'another owner cannot read SC1 wording');
update public.see_clearly_sc1_records set event_facts='tampered' where id='c3000000-0000-4000-8000-000000000001';
select is((select count(*)::integer from public.see_clearly_sc1_records where event_facts='tampered'),0,'another owner cannot update SC1 wording');
select throws_ok($$insert into public.see_clearly_sc1_records(user_id,progress_id,event_facts,automatic_interpretation) values ('00000000-0000-4000-8000-0000000000c2','c1000000-0000-4000-8000-000000000001','fact','meaning')$$,'23503',null,'same-owner progress key prevents linking another participant’s progress');
select throws_ok($$insert into public.see_clearly_sc1_records(user_id,progress_id,source_entry_id,event_facts,automatic_interpretation) values ('00000000-0000-4000-8000-0000000000c2','c1000000-0000-4000-8000-000000000002','c2000000-0000-4000-8000-000000000001','fact','meaning')$$,'23503',null,'same-owner source key prevents linking another participant’s words');
select lives_ok($$insert into public.see_clearly_sc1_records(user_id,progress_id,event_facts,automatic_interpretation) values ('00000000-0000-4000-8000-0000000000c2','c1000000-0000-4000-8000-000000000002','A fact without a prior source.','The meaning I gave it.')$$,'source selection is optional');

set local role anon;
select set_config('request.jwt.claim.sub','',true);
select throws_like($$select * from public.see_clearly_sc1_records$$,'%permission denied%','anonymous callers cannot read private SC1 wording');

reset role;
delete from public.journal_entries where id='c2000000-0000-4000-8000-000000000001';
select is((select count(*)::integer from public.see_clearly_sc1_records where user_id='00000000-0000-4000-8000-0000000000c1'),0,'deleting a linked source deletes its dependent SC1 record');
select is((select count(*)::integer from public.deep_dive_module_progress where id='c1000000-0000-4000-8000-000000000001'),1,'source deletion preserves SC1 progress');
select is((select count(*)::integer from public.deep_dive_reflections where prompt_id='sc1-reflection'),1,'source deletion preserves separately authored reflection');
delete from public.see_clearly_sc1_records where user_id='00000000-0000-4000-8000-0000000000c2';
select is((select count(*)::integer from public.deep_dive_module_progress where id='c1000000-0000-4000-8000-000000000002'),1,'deleting an unlinked SC1 record preserves its module progress');
select throws_like($$insert into public.deep_dive_module_progress(user_id,curriculum_version_id,module_id,last_section_id) values ('00000000-0000-4000-8000-0000000000c1','phase-1-v1','see-clearly.sc2','entry')$$,'%deep_dive_module_progress_module_id_check%','later See Clearly identifiers remain unapproved');

select * from finish();
rollback;
