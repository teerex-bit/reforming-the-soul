do $$
begin
  if not exists (select 1 from pg_roles where rolname = 'rts_privileged_owner') then
    create role rts_privileged_owner nologin noinherit;
  end if;
end
$$;

do $$
begin
  execute format('grant rts_privileged_owner to %I with set true', current_user);
end
$$;

create schema rts_private authorization rts_privileged_owner;
revoke all on schema rts_private from public, anon, authenticated;
grant usage on schema rts_private to authenticated;

create function rts_private.current_actor()
returns uuid
language plpgsql
stable
set search_path = pg_catalog
as $$
declare
  v_claims text;
  v_subject text;
begin
  v_claims := nullif(current_setting('request.jwt.claims', true), '');

  if v_claims is not null then
    begin
      v_subject := (v_claims::jsonb)->>'sub';
    exception when invalid_text_representation then
      return null;
    end;
  else
    v_subject := nullif(current_setting('request.jwt.claim.sub', true), '');
  end if;

  if v_subject is null then
    return null;
  end if;

  begin
    return v_subject::uuid;
  exception when invalid_text_representation then
    return null;
  end;
end
$$;

alter function rts_private.current_actor() owner to rts_privileged_owner;
revoke all on function rts_private.current_actor() from public, anon, authenticated;

do $$
begin
  execute format('revoke rts_privileged_owner from %I', current_user);
end
$$;

create function public.reject_user_id_change()
returns trigger
language plpgsql
set search_path = pg_catalog
as $$
begin
  if new.user_id is distinct from old.user_id then
    raise exception using errcode = '23514', message = 'user_id is immutable';
  end if;
  return new;
end
$$;

revoke all on function public.reject_user_id_change() from public, anon, authenticated;

create function public.validate_completed_curriculum_nodes()
returns trigger
language plpgsql
set search_path = pg_catalog
as $$
begin
  if exists (
    select 1
    from unnest(new.completed_node_ids) completed(node_id)
    left join public.curriculum_nodes node
      on node.id = completed.node_id and node.version_id = new.curriculum_version_id
    where node.id is null
  ) then
    raise exception using
      errcode = '23503',
      message = 'completed curriculum node does not exist in selected version';
  end if;
  return new;
end
$$;

revoke all on function public.validate_completed_curriculum_nodes() from public, anon, authenticated;

create trigger user_curriculum_state_validate_completed_nodes
before insert or update of completed_node_ids, curriculum_version_id
on public.user_curriculum_state
for each row execute function public.validate_completed_curriculum_nodes();

do $$
declare
  v_table text;
begin
  foreach v_table in array array[
    'profiles', 'user_curriculum_state', 'journal_entries', 'formation_records', 'practices',
    'practice_returns', 'formation_links', 'ai_threads', 'ai_artifacts', 'ai_artifact_sources',
    'ai_context_grants', 'audit_events'
  ] loop
    execute format('alter table public.%I enable row level security', v_table);
    execute format('alter table public.%I force row level security', v_table);
    execute format(
      'create policy %I on public.%I for select to authenticated using ((select auth.uid()) = user_id)',
      v_table || '_owner_select', v_table
    );
    execute format(
      'create policy %I on public.%I for all to rts_privileged_owner using ((select rts_private.current_actor()) = user_id) with check ((select rts_private.current_actor()) = user_id)',
      v_table || '_privileged_owner', v_table
    );
    execute format(
      'create trigger %I before update of user_id on public.%I for each row execute function public.reject_user_id_change()',
      v_table || '_immutable_owner', v_table
    );
  end loop;
end
$$;

create policy profiles_owner_insert on public.profiles
  for insert to authenticated with check ((select auth.uid()) = user_id);

create policy curriculum_state_owner_insert on public.user_curriculum_state
  for insert to authenticated with check ((select auth.uid()) = user_id);
create policy curriculum_state_owner_update on public.user_curriculum_state
  for update to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

create policy journal_entries_owner_insert on public.journal_entries
  for insert to authenticated with check ((select auth.uid()) = user_id);
create policy formation_records_owner_insert on public.formation_records
  for insert to authenticated with check ((select auth.uid()) = user_id);
create policy practices_owner_insert on public.practices
  for insert to authenticated
  with check ((select auth.uid()) = user_id and state in ('draft', 'open', 'waiting_for_real_life'));
create policy formation_links_owner_insert on public.formation_links
  for insert to authenticated with check ((select auth.uid()) = user_id);
create policy ai_threads_owner_insert on public.ai_threads
  for insert to authenticated with check ((select auth.uid()) = user_id);
create policy ai_artifacts_owner_insert on public.ai_artifacts
  for insert to authenticated
  with check ((select auth.uid()) = user_id and status = 'suggested' and provenance = 'ai_suggested');
create policy ai_artifact_sources_owner_insert on public.ai_artifact_sources
  for insert to authenticated with check ((select auth.uid()) = user_id);

revoke all on table
  public.profiles, public.user_curriculum_state, public.journal_entries, public.formation_records,
  public.practices, public.practice_returns, public.formation_links, public.ai_threads,
  public.ai_artifacts, public.ai_artifact_sources, public.ai_context_grants, public.audit_events
from public, anon, authenticated;

grant select, insert on public.profiles to authenticated;
grant select, insert on public.user_curriculum_state to authenticated;
grant update (current_node_id, state, completed_node_ids, updated_at) on public.user_curriculum_state to authenticated;
grant select, insert on public.journal_entries, public.formation_records, public.practices, public.formation_links,
  public.ai_threads, public.ai_artifacts, public.ai_artifact_sources to authenticated;
grant select on public.practice_returns, public.ai_context_grants, public.audit_events to authenticated;

grant select, insert, update, delete on table
  public.profiles, public.user_curriculum_state, public.journal_entries, public.formation_records,
  public.practices, public.practice_returns, public.formation_links, public.ai_threads,
  public.ai_artifacts, public.ai_artifact_sources, public.ai_context_grants, public.audit_events
to rts_privileged_owner;

revoke all on table public.curriculum_versions, public.curriculum_nodes from rts_privileged_owner;
grant select on table public.curriculum_versions, public.curriculum_nodes to rts_privileged_owner;
