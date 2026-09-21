do $$
begin
  execute format('grant rts_privileged_owner to %I with inherit false', current_user);
  execute format('grant rts_privileged_owner to %I with set true', current_user);
end
$$;

set local role rts_privileged_owner;

create or replace function rts_private.save_awaken_observation(
  p_event_text text,
  p_internal_response_text text,
  p_body_cue_text text
)
returns table (current_node_id text)
language plpgsql
security definer
set search_path = pg_catalog
as $$
declare
  v_actor uuid := rts_private.current_actor();
  v_state public.user_curriculum_state%rowtype;
  v_has_initial_state boolean;
  v_event_entry_id uuid;
  v_internal_response_entry_id uuid;
  v_body_cue_entry_id uuid;
  v_whitespace text := E' \t\n\r\f' || pg_catalog.chr(11) || U&'\00A0\1680\2000\2001\2002\2003\2004\2005\2006\2007\2008\2009\200A\2028\2029\202F\205F\3000';
begin
  if v_actor is null then
    raise exception using errcode = '42501', message = 'authentication required';
  end if;
  if p_event_text is null or p_internal_response_text is null or p_body_cue_text is null
    or pg_catalog.translate(p_event_text, v_whitespace, '') = ''
    or pg_catalog.translate(p_internal_response_text, v_whitespace, '') = ''
    or pg_catalog.translate(p_body_cue_text, v_whitespace, '') = '' then
    raise exception using errcode = '22004', message = 'Awaken observation text is required';
  end if;

  perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(v_actor::text || ':phase-1-v1', 0));
  select state_row.* into v_state
  from public.user_curriculum_state state_row
  where state_row.user_id = v_actor and state_row.curriculum_version_id = 'phase-1-v1'
  for update;
  v_has_initial_state := found;

  if v_has_initial_state and not (
    v_state.current_node_id = 'awaken.pay-attention.observe'
    and v_state.state = 'not_started'
    and pg_catalog.cardinality(v_state.completed_node_ids) = 0
    and not exists (
      select 1 from public.journal_entries entry
      where entry.user_id = v_actor
        and entry.curriculum_version_id = 'phase-1-v1'
        and entry.node_id in ('awaken.pay-attention.observe', 'awaken.pay-attention.inside', 'awaken.pay-attention.body')
    )
  ) then
    raise exception using errcode = '40001', message = 'curriculum state changed';
  end if;

  insert into public.journal_entries (user_id, curriculum_version_id, node_id, entry_kind, body)
  values (v_actor, 'phase-1-v1', 'awaken.pay-attention.observe', 'event', p_event_text)
  returning id into v_event_entry_id;
  insert into public.journal_entries (user_id, curriculum_version_id, node_id, entry_kind, body)
  values (v_actor, 'phase-1-v1', 'awaken.pay-attention.inside', 'internal_response', p_internal_response_text)
  returning id into v_internal_response_entry_id;
  insert into public.journal_entries (user_id, curriculum_version_id, node_id, entry_kind, body)
  values (v_actor, 'phase-1-v1', 'awaken.pay-attention.body', 'body_cue', p_body_cue_text)
  returning id into v_body_cue_entry_id;

  insert into public.formation_records (user_id, curriculum_version_id, node_id, record_type, value_text, source_journal_entry_id, provenance)
  values
    (v_actor, 'phase-1-v1', 'awaken.pay-attention.observe', 'observation', p_event_text, v_event_entry_id, 'user_authored'),
    (v_actor, 'phase-1-v1', 'awaken.pay-attention.inside', 'reaction', p_internal_response_text, v_internal_response_entry_id, 'user_authored'),
    (v_actor, 'phase-1-v1', 'awaken.pay-attention.body', 'body_cue', p_body_cue_text, v_body_cue_entry_id, 'user_authored');

  if v_has_initial_state then
    update public.user_curriculum_state state_row
    set current_node_id = 'awaken.pay-attention.reflect',
        state = 'in_progress',
        completed_node_ids = array['awaken.pay-attention.observe', 'awaken.pay-attention.inside', 'awaken.pay-attention.body'],
        updated_at = now()
    where state_row.id = v_state.id and state_row.user_id = v_actor;
  else
    insert into public.user_curriculum_state (user_id, curriculum_version_id, current_node_id, state, completed_node_ids)
    values (
      v_actor, 'phase-1-v1', 'awaken.pay-attention.reflect', 'in_progress',
      array['awaken.pay-attention.observe', 'awaken.pay-attention.inside', 'awaken.pay-attention.body']
    );
  end if;

  return query select 'awaken.pay-attention.reflect'::text;
end
$$;

revoke all on function rts_private.save_awaken_observation(text, text, text) from public, anon, authenticated;
grant execute on function rts_private.save_awaken_observation(text, text, text) to authenticated;

reset role;

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
      and membership.grantor = current_user::regrole
  loop
    execute format('revoke rts_privileged_owner from %I', v_member);
  end loop;
end
$$;
