do $$
begin
  execute format('grant rts_privileged_owner to %I with inherit false', current_user);
  execute format('grant rts_privileged_owner to %I with set true', current_user);
end
$$;

set local role rts_privileged_owner;

create or replace function rts_private.reserve_ai_reflect(
  p_intent_id uuid,
  p_request_fingerprint text,
  p_model_id text,
  p_global_policy_version text,
  p_stage_policy_version text,
  p_mode_policy_version text,
  p_output_schema_version text
)
returns table (
  reservation_result text, thread_id uuid,
  event_id uuid, event_body text,
  internal_id uuid, internal_body text,
  body_id uuid, body_body text
)
language plpgsql
security definer
set search_path = pg_catalog
as $$
declare
  v_actor uuid := rts_private.current_actor();
  v_thread public.ai_threads%rowtype;
  v_event public.journal_entries%rowtype;
  v_internal public.journal_entries%rowtype;
  v_body public.journal_entries%rowtype;
begin
  if v_actor is null then
    raise exception using errcode='42501', message='authentication required';
  end if;
  if p_intent_id is null or p_request_fingerprint is null or p_request_fingerprint = '' then
    raise exception using errcode='22004', message='AI Reflect intent and fingerprint are required';
  end if;
  if p_model_id is null or p_global_policy_version is null or p_stage_policy_version is null
    or p_mode_policy_version is null or p_output_schema_version is null then
    raise exception using errcode='22004', message='AI Reflect provenance versions are required';
  end if;

  perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(v_actor::text || ':phase-1-v1', 0));
  if not exists (
    select 1 from public.user_curriculum_state state
    where state.user_id=v_actor and state.curriculum_version_id='phase-1-v1'
      and state.current_node_id='awaken.pay-attention.reflect' and state.state='in_progress'
  ) then
    return query select 'unavailable'::text, null::uuid, null::uuid, null::text, null::uuid, null::text, null::uuid, null::text;
    return;
  end if;

  select entry.* into v_event from public.journal_entries entry
    where entry.user_id=v_actor and entry.curriculum_version_id='phase-1-v1'
      and entry.node_id='awaken.pay-attention.observe' and entry.entry_kind='event'
    order by entry.created_at desc limit 1;
  select entry.* into v_internal from public.journal_entries entry
    where entry.user_id=v_actor and entry.curriculum_version_id='phase-1-v1'
      and entry.node_id='awaken.pay-attention.inside' and entry.entry_kind='internal_response'
    order by entry.created_at desc limit 1;
  select entry.* into v_body from public.journal_entries entry
    where entry.user_id=v_actor and entry.curriculum_version_id='phase-1-v1'
      and entry.node_id='awaken.pay-attention.body' and entry.entry_kind='body_cue'
    order by entry.created_at desc limit 1;

  if v_event.id is null or v_internal.id is null or v_body.id is null then
    return query select 'unavailable'::text, null::uuid, null::uuid, null::text, null::uuid, null::text, null::uuid, null::text;
    return;
  end if;

  insert into public.ai_threads (
    user_id,intent_id,request_fingerprint,mode,stage,curriculum_version_id,node_id,status,
    model_id,global_policy_version,stage_policy_version,mode_policy_version,output_schema_version
  ) values (
    v_actor,p_intent_id,p_request_fingerprint,'reflect','awaken','phase-1-v1','awaken.pay-attention.reflect','pending',
    p_model_id,p_global_policy_version,p_stage_policy_version,p_mode_policy_version,p_output_schema_version
  ) on conflict (user_id,intent_id) do nothing
  returning * into v_thread;

  if v_thread.id is null then
    select thread.* into v_thread from public.ai_threads thread
      where thread.user_id=v_actor and thread.intent_id=p_intent_id
      for update;
    if v_thread.request_fingerprint is distinct from p_request_fingerprint then
      raise exception using errcode='23514', message='AI Reflect intent conflicts with a different request';
    end if;
    if v_thread.status='pending' and v_thread.updated_at <= pg_catalog.clock_timestamp()-interval '2 minutes' then
      update public.ai_threads thread set status='provider_error', updated_at=now()
        where thread.id=v_thread.id and thread.user_id=v_actor and thread.status='pending';
      v_thread.status := 'provider_error';
    end if;
    return query select
      case when v_thread.status='pending' then 'in_progress' else 'already_completed' end,
      v_thread.id, null::uuid, null::text, null::uuid, null::text, null::uuid, null::text;
    return;
  end if;

  return query select 'dispatch'::text, v_thread.id,
    v_event.id, v_event.body, v_internal.id, v_internal.body, v_body.id, v_body.body;
end
$$;

revoke all on function rts_private.reserve_ai_reflect(uuid,text,text,text,text,text,text) from public, anon, authenticated;
grant execute on function rts_private.reserve_ai_reflect(uuid,text,text,text,text,text,text) to authenticated;

reset role;

do $$
declare v_member name;
begin
  for v_member in
    select member_role.rolname from pg_auth_members membership
    join pg_roles granted_role on granted_role.oid=membership.roleid
    join pg_roles member_role on member_role.oid=membership.member
    where granted_role.rolname='rts_privileged_owner' and membership.grantor=current_user::regrole
  loop execute format('revoke rts_privileged_owner from %I', v_member); end loop;
end
$$;
