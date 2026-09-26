begin;

alter table public.deep_dive_module_progress drop constraint deep_dive_module_progress_module_id_check;
alter table public.deep_dive_module_progress add constraint deep_dive_module_progress_module_id_check
  check (module_id in (
    'awaken.pay-attention', 'awaken.catch-yourself-being-you',
    'awaken.your-reactions-have-a-history', 'awaken.formation-is-not-identity',
    'see-clearly.sc1', 'see-clearly.sy2', 'see-clearly.sy3', 'see-clearly.sy4', 'see-clearly.sg1', 'see-clearly.sg2', 'see-clearly.sg3'
  ));

alter table public.deep_dive_reflections drop constraint deep_dive_reflections_prompt_id_check;
alter table public.deep_dive_reflections add constraint deep_dive_reflections_prompt_id_check
  check (prompt_id in (
    'real-moment', 'first-response', 'formation-history', 'formation-and-identity',
    'sc1-reflection', 'sy2-reflection', 'sy3-reflection', 'sy4-reflection', 'sg1-reflection', 'sg2-reflection', 'sg3-reflection'
  ));

create table public.see_clearly_sg3_records (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  progress_id uuid not null,
  module_id text not null default 'see-clearly.sg3' check (module_id = 'see-clearly.sg3'),
  observation text not null check (length(btrim(observation)) > 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (progress_id, user_id, module_id),
  foreign key (progress_id, user_id, module_id)
    references public.deep_dive_module_progress(id, user_id, module_id) on delete cascade
);

alter table public.see_clearly_sg3_records enable row level security;
alter table public.see_clearly_sg3_records force row level security;
create trigger see_clearly_sg3_records_immutable_owner
  before update of user_id on public.see_clearly_sg3_records
  for each row execute function public.reject_user_id_change();

create policy see_clearly_sg3_owner_select on public.see_clearly_sg3_records
  for select to authenticated using ((select auth.uid()) = user_id);
create policy see_clearly_sg3_owner_insert on public.see_clearly_sg3_records
  for insert to authenticated with check ((select auth.uid()) = user_id);
create policy see_clearly_sg3_owner_update on public.see_clearly_sg3_records
  for update to authenticated using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);
create policy see_clearly_sg3_owner_delete on public.see_clearly_sg3_records
  for delete to authenticated using ((select auth.uid()) = user_id);

revoke all on table public.see_clearly_sg3_records from public, anon, authenticated;
grant select, insert, update, delete on table public.see_clearly_sg3_records to authenticated;
grant select, insert, update, delete on table public.see_clearly_sg3_records to rts_privileged_owner;

commit;
