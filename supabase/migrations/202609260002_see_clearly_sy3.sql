begin;

alter table public.deep_dive_module_progress drop constraint deep_dive_module_progress_module_id_check;
alter table public.deep_dive_module_progress add constraint deep_dive_module_progress_module_id_check
  check (module_id in (
    'awaken.pay-attention', 'awaken.catch-yourself-being-you',
    'awaken.your-reactions-have-a-history', 'awaken.formation-is-not-identity',
    'see-clearly.sc1', 'see-clearly.sy2', 'see-clearly.sy3'
  ));

alter table public.deep_dive_reflections drop constraint deep_dive_reflections_prompt_id_check;
alter table public.deep_dive_reflections add constraint deep_dive_reflections_prompt_id_check
  check (prompt_id in (
    'real-moment', 'first-response', 'formation-history', 'formation-and-identity',
    'sc1-reflection', 'sy2-reflection', 'sy3-reflection'
  ));

create table public.see_clearly_sy3_records (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  progress_id uuid not null,
  module_id text not null default 'see-clearly.sy3' check (module_id = 'see-clearly.sy3'),
  source_sy2_record_id uuid,
  source_was_linked boolean not null default false,
  self_story_hypothesis text not null check (length(btrim(self_story_hypothesis)) > 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (id, user_id),
  unique (progress_id, user_id, module_id),
  foreign key (progress_id, user_id, module_id)
    references public.deep_dive_module_progress(id, user_id, module_id) on delete cascade,
  foreign key (source_sy2_record_id, user_id)
    references public.see_clearly_sy2_records(id, user_id)
    on delete set null (source_sy2_record_id),
  check (source_sy2_record_id is null or source_was_linked)
);

create index see_clearly_sy3_records_source_idx on public.see_clearly_sy3_records(source_sy2_record_id, user_id);

alter table public.see_clearly_sy3_records enable row level security;
alter table public.see_clearly_sy3_records force row level security;
create trigger see_clearly_sy3_records_immutable_owner
  before update of user_id on public.see_clearly_sy3_records
  for each row execute function public.reject_user_id_change();

create policy see_clearly_sy3_owner_select on public.see_clearly_sy3_records
  for select to authenticated using ((select auth.uid()) = user_id);
create policy see_clearly_sy3_owner_insert on public.see_clearly_sy3_records
  for insert to authenticated with check ((select auth.uid()) = user_id);
create policy see_clearly_sy3_owner_update on public.see_clearly_sy3_records
  for update to authenticated using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);
create policy see_clearly_sy3_owner_delete on public.see_clearly_sy3_records
  for delete to authenticated using ((select auth.uid()) = user_id);

revoke all on table public.see_clearly_sy3_records from public, anon, authenticated;
grant select, insert, update, delete on table public.see_clearly_sy3_records to authenticated;
grant select, insert, update, delete on table public.see_clearly_sy3_records to rts_privileged_owner;

commit;
