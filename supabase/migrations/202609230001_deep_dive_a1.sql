create table public.deep_dive_module_progress (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  curriculum_version_id text not null references public.curriculum_versions(id) on delete restrict,
  module_id text not null check (module_id = 'awaken.pay-attention'),
  last_section_id text not null,
  completed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (id, user_id),
  unique (user_id, curriculum_version_id, module_id)
);

create table public.deep_dive_reflections (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  progress_id uuid not null,
  prompt_id text not null check (prompt_id = 'real-moment'),
  body text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (id, user_id),
  unique (progress_id, prompt_id, user_id),
  foreign key (progress_id, user_id)
    references public.deep_dive_module_progress(id, user_id) on delete cascade
);

alter table public.deep_dive_module_progress enable row level security;
alter table public.deep_dive_reflections enable row level security;

create trigger deep_dive_progress_immutable_owner before update of user_id on public.deep_dive_module_progress
  for each row execute function public.reject_user_id_change();
create trigger deep_dive_reflection_immutable_owner before update of user_id on public.deep_dive_reflections
  for each row execute function public.reject_user_id_change();

create policy deep_dive_progress_owner_select on public.deep_dive_module_progress
  for select to authenticated using ((select auth.uid()) = user_id);
create policy deep_dive_progress_owner_insert on public.deep_dive_module_progress
  for insert to authenticated with check ((select auth.uid()) = user_id);
create policy deep_dive_progress_owner_update on public.deep_dive_module_progress
  for update to authenticated using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);
create policy deep_dive_progress_owner_delete on public.deep_dive_module_progress
  for delete to authenticated using ((select auth.uid()) = user_id);

create policy deep_dive_reflection_owner_select on public.deep_dive_reflections
  for select to authenticated using ((select auth.uid()) = user_id);
create policy deep_dive_reflection_owner_insert on public.deep_dive_reflections
  for insert to authenticated with check ((select auth.uid()) = user_id);
create policy deep_dive_reflection_owner_update on public.deep_dive_reflections
  for update to authenticated using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);
create policy deep_dive_reflection_owner_delete on public.deep_dive_reflections
  for delete to authenticated using ((select auth.uid()) = user_id);

revoke all on table public.deep_dive_module_progress, public.deep_dive_reflections from public, anon, authenticated;
grant select, insert, update, delete on table public.deep_dive_module_progress, public.deep_dive_reflections to authenticated;
grant select, insert, update, delete on table public.deep_dive_module_progress, public.deep_dive_reflections to rts_privileged_owner;
