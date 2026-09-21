do $$
begin
  execute format('grant rts_privileged_owner to %I with inherit false', current_user);
  execute format('grant rts_privileged_owner to %I with set true', current_user);
end
$$;

create function rts_private.transition_practice(
  p_practice_id uuid,
  p_expected_state public.practice_state,
  p_expected_lock_version integer,
  p_target_state public.practice_state
)
returns table (practice_id uuid, state public.practice_state, lock_version integer)
language plpgsql
security definer
set search_path = pg_catalog
as $$
declare
  v_actor uuid := rts_private.current_actor();
  v_practice public.practices%rowtype;
begin
  if v_actor is null then
    raise exception using errcode = '42501', message = 'authentication required';
  end if;
  if p_expected_state is null or p_expected_lock_version is null or p_target_state is null then
    raise exception using errcode = '22004', message = 'expected practice state, lock version, and target state are required';
  end if;

  select p.* into v_practice
  from public.practices p
  where p.id = p_practice_id and p.user_id = v_actor
  for update;

  if not found then
    raise exception using errcode = 'P0002', message = 'practice not found';
  end if;
  if v_practice.state <> p_expected_state or v_practice.lock_version <> p_expected_lock_version then
    raise exception using errcode = '40001', message = 'stale practice state or lock version';
  end if;
  if not (
    (p_expected_state = 'draft' and p_target_state = 'open')
    or (p_expected_state = 'open' and p_target_state = 'waiting_for_real_life')
    or (p_expected_state = 'reviewed' and p_target_state = 'closed')
  ) then
    raise exception using errcode = '22023', message = 'invalid practice transition';
  end if;

  update public.practices p
  set state = p_target_state,
      lock_version = p.lock_version + 1,
      opened_at = case when p_target_state = 'open' then coalesce(p.opened_at, now()) else p.opened_at end,
      ready_to_review_at = case when p_target_state = 'ready_to_review' then coalesce(p.ready_to_review_at, now()) else p.ready_to_review_at end,
      reviewed_at = case when p_target_state = 'reviewed' then coalesce(p.reviewed_at, now()) else p.reviewed_at end,
      closed_at = case when p_target_state = 'closed' then coalesce(p.closed_at, now()) else p.closed_at end,
      updated_at = now()
  where p.id = v_practice.id and p.user_id = v_actor
  returning p.* into v_practice;

  return query select v_practice.id, v_practice.state, v_practice.lock_version;
end
$$;

create function rts_private.record_practice_return(
  p_practice_id uuid,
  p_expected_lock_version integer,
  p_outcome_text text
)
returns table (practice_return_id uuid, practice_id uuid, state public.practice_state, lock_version integer)
language plpgsql
security definer
set search_path = pg_catalog
as $$
declare
  v_actor uuid := rts_private.current_actor();
  v_practice public.practices%rowtype;
  v_outcome_id uuid;
  v_return_id uuid;
begin
  if v_actor is null then
    raise exception using errcode = '42501', message = 'authentication required';
  end if;
  if p_expected_lock_version is null then
    raise exception using errcode = '22004', message = 'expected practice lock version is required';
  end if;

  select p.* into v_practice
  from public.practices p
  where p.id = p_practice_id and p.user_id = v_actor
  for update;

  if not found then
    raise exception using errcode = 'P0002', message = 'practice not found';
  end if;
  if v_practice.state <> 'waiting_for_real_life' or v_practice.lock_version <> p_expected_lock_version then
    raise exception using errcode = '40001', message = 'stale practice state or lock version';
  end if;

  insert into public.journal_entries (user_id, curriculum_version_id, node_id, entry_kind, body)
  values (v_actor, v_practice.curriculum_version_id, 'become.practice.return', 'practice_outcome', p_outcome_text)
  returning id into v_outcome_id;

  insert into public.practice_returns (user_id, practice_id, outcome_entry_id)
  values (v_actor, v_practice.id, v_outcome_id)
  returning id into v_return_id;

  insert into public.formation_links (user_id, link_type, source_practice_id, target_journal_entry_id)
  values (v_actor, 'practice_to_return', v_practice.id, v_outcome_id);

  update public.practices p
  set state = 'ready_to_review',
      lock_version = p.lock_version + 1,
      ready_to_review_at = coalesce(p.ready_to_review_at, now()),
      updated_at = now()
  where p.id = v_practice.id and p.user_id = v_actor
  returning p.* into v_practice;

  return query select v_return_id, v_practice.id, v_practice.state, v_practice.lock_version;
end
$$;

create function rts_private.review_practice(
  p_practice_id uuid,
  p_expected_lock_version integer,
  p_review_text text
)
returns table (practice_return_id uuid, practice_id uuid, state public.practice_state, lock_version integer)
language plpgsql
security definer
set search_path = pg_catalog
as $$
declare
  v_actor uuid := rts_private.current_actor();
  v_practice public.practices%rowtype;
  v_return public.practice_returns%rowtype;
  v_review_id uuid;
begin
  if v_actor is null then
    raise exception using errcode = '42501', message = 'authentication required';
  end if;
  if p_expected_lock_version is null then
    raise exception using errcode = '22004', message = 'expected practice lock version is required';
  end if;

  select p.* into v_practice
  from public.practices p
  where p.id = p_practice_id and p.user_id = v_actor
  for update;

  if not found then
    raise exception using errcode = 'P0002', message = 'practice not found';
  end if;
  if v_practice.state <> 'ready_to_review' or v_practice.lock_version <> p_expected_lock_version then
    raise exception using errcode = '40001', message = 'stale practice state or lock version';
  end if;

  select r.* into v_return
  from public.practice_returns r
  where r.practice_id = v_practice.id and r.user_id = v_actor
  for update;

  if not found then
    raise exception using errcode = 'P0002', message = 'practice return not found';
  end if;
  if v_return.review_entry_id is not null then
    raise exception using errcode = '23505', message = 'practice return already reviewed';
  end if;

  insert into public.journal_entries (user_id, curriculum_version_id, node_id, entry_kind, body)
  values (v_actor, v_practice.curriculum_version_id, 'become.practice.review', 'practice_review', p_review_text)
  returning id into v_review_id;

  update public.practice_returns r
  set review_entry_id = v_review_id, reviewed_at = now()
  where r.id = v_return.id and r.user_id = v_actor
  returning r.* into v_return;

  update public.practices p
  set state = 'reviewed',
      lock_version = p.lock_version + 1,
      reviewed_at = coalesce(p.reviewed_at, now()),
      updated_at = now()
  where p.id = v_practice.id and p.user_id = v_actor
  returning p.* into v_practice;

  return query select v_return.id, v_practice.id, v_practice.state, v_practice.lock_version;
end
$$;

create function rts_private.grant_ai_context(
  p_journal_entry_id uuid,
  p_scope public.ai_grant_scope
)
returns table (grant_id uuid, revision integer, granted_at timestamptz)
language plpgsql
security definer
set search_path = pg_catalog
as $$
declare
  v_actor uuid := rts_private.current_actor();
  v_grant public.ai_context_grants%rowtype;
begin
  if v_actor is null then
    raise exception using errcode = '42501', message = 'authentication required';
  end if;
  if p_scope is null then
    raise exception using errcode = '22004', message = 'AI grant scope is required';
  end if;

  perform pg_advisory_xact_lock(hashtextextended(v_actor::text || ':' || p_journal_entry_id::text || ':' || p_scope::text, 0));
  perform 1 from public.journal_entries j
  where j.id = p_journal_entry_id and j.user_id = v_actor
  for share;
  if not found then
    raise exception using errcode = 'P0002', message = 'journal entry not found';
  end if;

  select g.* into v_grant
  from public.ai_context_grants g
  where g.user_id = v_actor and g.journal_entry_id = p_journal_entry_id
    and g.scope = p_scope and g.revoked_at is null
  for update;

  if not found then
    insert into public.ai_context_grants (user_id, journal_entry_id, scope)
    values (v_actor, p_journal_entry_id, p_scope)
    returning * into v_grant;
  end if;

  return query select v_grant.id, v_grant.revision, v_grant.granted_at;
end
$$;

create function rts_private.revoke_ai_context(
  p_grant_id uuid,
  p_expected_revision integer
)
returns table (grant_id uuid, revision integer, revoked_at timestamptz)
language plpgsql
security definer
set search_path = pg_catalog
as $$
declare
  v_actor uuid := rts_private.current_actor();
  v_grant public.ai_context_grants%rowtype;
begin
  if v_actor is null then
    raise exception using errcode = '42501', message = 'authentication required';
  end if;
  if p_expected_revision is null then
    raise exception using errcode = '22004', message = 'expected AI context grant revision is required';
  end if;

  select g.* into v_grant
  from public.ai_context_grants g
  where g.id = p_grant_id and g.user_id = v_actor
  for update;

  if not found then
    raise exception using errcode = 'P0002', message = 'AI context grant not found';
  end if;
  if v_grant.revision <> p_expected_revision or v_grant.revoked_at is not null then
    raise exception using errcode = '40001', message = 'stale AI context grant revision';
  end if;

  update public.ai_context_grants g
  set revoked_at = now(), revision = g.revision + 1, updated_at = now()
  where g.id = v_grant.id and g.user_id = v_actor
  returning g.* into v_grant;

  return query select v_grant.id, v_grant.revision, v_grant.revoked_at;
end
$$;

create function rts_private.delete_journal_entry_with_dependencies(p_journal_entry_id uuid)
returns table (
  deleted_entry_id uuid,
  dependent_artifact_count integer,
  dependent_record_count integer,
  dependent_link_count integer,
  grant_count integer
)
language plpgsql
security definer
set search_path = pg_catalog
as $$
declare
  v_actor uuid := rts_private.current_actor();
  v_entry public.journal_entries%rowtype;
  v_artifact_count integer := 0;
  v_record_count integer := 0;
  v_link_count integer := 0;
  v_grant_count integer := 0;
begin
  if v_actor is null then
    raise exception using errcode = '42501', message = 'authentication required';
  end if;

  select j.* into v_entry
  from public.journal_entries j
  where j.id = p_journal_entry_id and j.user_id = v_actor
  for update;

  if not found then
    return query select null::uuid, 0, 0, 0, 0;
    return;
  end if;

  select count(distinct s.artifact_id)::integer into v_artifact_count
  from public.ai_artifact_sources s
  where s.user_id = v_actor and s.journal_entry_id = v_entry.id;

  select count(*)::integer into v_record_count
  from public.formation_records r
  where r.user_id = v_actor and r.source_journal_entry_id = v_entry.id;

  select count(distinct l.id)::integer into v_link_count
  from public.formation_links l
  where l.user_id = v_actor and (
    l.source_journal_entry_id = v_entry.id or l.target_journal_entry_id = v_entry.id
    or l.source_formation_record_id in (
      select r.id from public.formation_records r
      where r.user_id = v_actor and r.source_journal_entry_id = v_entry.id
    )
    or l.target_formation_record_id in (
      select r.id from public.formation_records r
      where r.user_id = v_actor and r.source_journal_entry_id = v_entry.id
    )
  );

  select count(*)::integer into v_grant_count
  from public.ai_context_grants g
  where g.user_id = v_actor and g.journal_entry_id = v_entry.id;

  delete from public.ai_artifacts a
  where a.user_id = v_actor and exists (
    select 1 from public.ai_artifact_sources s
    where s.artifact_id = a.id and s.user_id = v_actor and s.journal_entry_id = v_entry.id
  );
  delete from public.formation_links l
  where l.user_id = v_actor and (
    l.source_journal_entry_id = v_entry.id or l.target_journal_entry_id = v_entry.id
    or l.source_formation_record_id in (
      select r.id from public.formation_records r
      where r.user_id = v_actor and r.source_journal_entry_id = v_entry.id
    )
    or l.target_formation_record_id in (
      select r.id from public.formation_records r
      where r.user_id = v_actor and r.source_journal_entry_id = v_entry.id
    )
  );
  delete from public.ai_context_grants g
  where g.user_id = v_actor and g.journal_entry_id = v_entry.id;
  delete from public.formation_records r
  where r.user_id = v_actor and r.source_journal_entry_id = v_entry.id;
  delete from public.journal_entries j
  where j.id = v_entry.id and j.user_id = v_actor;

  insert into public.audit_events (
    user_id, event_type, object_type, object_id,
    dependent_artifact_count, dependent_record_count, dependent_link_count, grant_count
  ) values (
    v_actor, 'journal_entry_deleted', 'journal_entry', v_entry.id,
    v_artifact_count, v_record_count, v_link_count, v_grant_count
  );

  return query select v_entry.id, v_artifact_count, v_record_count, v_link_count, v_grant_count;
end
$$;

alter function rts_private.transition_practice(uuid, public.practice_state, integer, public.practice_state) owner to rts_privileged_owner;
alter function rts_private.record_practice_return(uuid, integer, text) owner to rts_privileged_owner;
alter function rts_private.review_practice(uuid, integer, text) owner to rts_privileged_owner;
alter function rts_private.grant_ai_context(uuid, public.ai_grant_scope) owner to rts_privileged_owner;
alter function rts_private.revoke_ai_context(uuid, integer) owner to rts_privileged_owner;
alter function rts_private.delete_journal_entry_with_dependencies(uuid) owner to rts_privileged_owner;

revoke all on function rts_private.transition_practice(uuid, public.practice_state, integer, public.practice_state) from public, anon, authenticated;
revoke all on function rts_private.record_practice_return(uuid, integer, text) from public, anon, authenticated;
revoke all on function rts_private.review_practice(uuid, integer, text) from public, anon, authenticated;
revoke all on function rts_private.grant_ai_context(uuid, public.ai_grant_scope) from public, anon, authenticated;
revoke all on function rts_private.revoke_ai_context(uuid, integer) from public, anon, authenticated;
revoke all on function rts_private.delete_journal_entry_with_dependencies(uuid) from public, anon, authenticated;

grant execute on function rts_private.transition_practice(uuid, public.practice_state, integer, public.practice_state) to authenticated;
grant execute on function rts_private.record_practice_return(uuid, integer, text) to authenticated;
grant execute on function rts_private.review_practice(uuid, integer, text) to authenticated;
grant execute on function rts_private.grant_ai_context(uuid, public.ai_grant_scope) to authenticated;
grant execute on function rts_private.revoke_ai_context(uuid, integer) to authenticated;
grant execute on function rts_private.delete_journal_entry_with_dependencies(uuid) to authenticated;

do $$
declare
  v_member name;
begin
  for v_member in
    select member_role.rolname
    from pg_auth_members membership
    join pg_roles granted_role on granted_role.oid = membership.roleid
    join pg_roles member_role on member_role.oid = membership.member
    where granted_role.rolname = 'rts_privileged_owner'
  loop
    execute format('revoke rts_privileged_owner from %I', v_member);
  end loop;
end
$$;
