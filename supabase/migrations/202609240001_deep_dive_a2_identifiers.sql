begin;

alter table public.deep_dive_module_progress
  drop constraint deep_dive_module_progress_module_id_check;

alter table public.deep_dive_module_progress
  add constraint deep_dive_module_progress_module_id_check
  check (module_id in ('awaken.pay-attention', 'awaken.catch-yourself-being-you'));

alter table public.deep_dive_reflections
  drop constraint deep_dive_reflections_prompt_id_check;

alter table public.deep_dive_reflections
  add constraint deep_dive_reflections_prompt_id_check
  check (prompt_id in ('real-moment', 'first-response'));

commit;
