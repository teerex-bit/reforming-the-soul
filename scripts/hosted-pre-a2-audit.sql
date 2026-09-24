begin;
select plan(6);

insert into auth.users (id, instance_id, aud, role, email, encrypted_password, email_confirmed_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at)
values ('00000000-0000-4000-8000-0000000000f1', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'pre-a2-audit@example.test', '', now(), '{}', '{}', now(), now());

select lives_ok(
  $$insert into public.deep_dive_module_progress (id, user_id, curriculum_version_id, module_id, last_section_id)
    values ('ba100000-0000-4000-8000-000000000001', '00000000-0000-4000-8000-0000000000f1', 'phase-1-v1', 'awaken.pay-attention', 'reflection')$$,
  'A1 module identifier is accepted before A2'
);
select lives_ok(
  $$insert into public.deep_dive_reflections (id, user_id, progress_id, prompt_id, body)
    values ('ba200000-0000-4000-8000-000000000001', '00000000-0000-4000-8000-0000000000f1', 'ba100000-0000-4000-8000-000000000001', 'real-moment', 'pre-A2 audit')$$,
  'A1 prompt identifier is accepted before A2'
);
select throws_like(
  $$insert into public.deep_dive_module_progress (user_id, curriculum_version_id, module_id, last_section_id)
    values ('00000000-0000-4000-8000-0000000000f1', 'phase-1-v1', 'awaken.catch-yourself-being-you', 'entry')$$,
  '%deep_dive_module_progress_module_id_check%', 'A2 module identifier is rejected before A2'
);
select throws_like(
  $$insert into public.deep_dive_module_progress (user_id, curriculum_version_id, module_id, last_section_id)
    values ('00000000-0000-4000-8000-0000000000f1', 'phase-1-v1', 'awaken.unapproved-module', 'entry')$$,
  '%deep_dive_module_progress_module_id_check%', 'unapproved module identifier is rejected before A2'
);
select throws_like(
  $$insert into public.deep_dive_reflections (user_id, progress_id, prompt_id, body)
    values ('00000000-0000-4000-8000-0000000000f1', 'ba100000-0000-4000-8000-000000000001', 'first-response', 'invalid')$$,
  '%deep_dive_reflections_prompt_id_check%', 'A2 prompt identifier is rejected before A2'
);
select throws_like(
  $$insert into public.deep_dive_reflections (user_id, progress_id, prompt_id, body)
    values ('00000000-0000-4000-8000-0000000000f1', 'ba100000-0000-4000-8000-000000000001', 'unapproved-prompt', 'invalid')$$,
  '%deep_dive_reflections_prompt_id_check%', 'unapproved prompt identifier is rejected before A2'
);

select * from finish();
rollback;
