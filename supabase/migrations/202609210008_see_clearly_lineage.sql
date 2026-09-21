do $$
begin
  execute format('grant rts_privileged_owner to %I with inherit false', current_user);
  execute format('grant rts_privileged_owner to %I with set true', current_user);
end
$$;

set local role rts_privileged_owner;

create function rts_private.validate_formation_link_lineage()
returns trigger
language plpgsql
security definer
set search_path = pg_catalog
as $$
declare
  v_source_owner uuid;
  v_source_version text;
  v_source_node text;
  v_target_owner uuid;
  v_target_version text;
  v_target_node text;
begin
  if new.link_type = 'awaken_to_see_clearly' then
    select j.user_id,j.curriculum_version_id,j.node_id into v_source_owner,v_source_version,v_source_node
      from public.journal_entries j where j.id=new.source_journal_entry_id;
    select r.user_id,r.curriculum_version_id,r.node_id into v_target_owner,v_target_version,v_target_node
      from public.formation_records r where r.id=new.target_formation_record_id;
    if v_source_owner is null or v_target_owner is null
      or v_source_owner is distinct from new.user_id or v_target_owner is distinct from new.user_id
      or v_source_version is distinct from v_target_version
      or v_source_node <> 'awaken.pay-attention.observe' or v_target_node <> 'see-clearly.fact' then
      raise exception using errcode='23514', message='invalid Awaken to See Clearly lineage';
    end if;
  end if;
  return new;
end
$$;

reset role;

create trigger formation_links_validate_lineage
before insert or update on public.formation_links
for each row execute function rts_private.validate_formation_link_lineage();

set local role rts_privileged_owner;

create function rts_private.save_see_clearly(
  p_observable_fact_text text,
  p_interpretation_text text,
  p_belief_expectation_type text,
  p_belief_expectation_text text
)
returns table (current_node_id text)
language plpgsql
security definer
set search_path = pg_catalog
as $$
declare
  v_actor uuid := rts_private.current_actor();
  v_state public.user_curriculum_state%rowtype;
  v_source_id uuid;
  v_fact_entry_id uuid;
  v_interpretation_entry_id uuid;
  v_belief_entry_id uuid;
  v_fact_record_id uuid;
  v_whitespace text := E' \t\n\r\f' || pg_catalog.chr(11) || U&'\00A0\1680\2000\2001\2002\2003\2004\2005\2006\2007\2008\2009\200A\2028\2029\202F\205F\3000';
begin
  if v_actor is null then raise exception using errcode='42501', message='authentication required'; end if;
  if p_observable_fact_text is null or p_interpretation_text is null or p_belief_expectation_text is null
    or pg_catalog.translate(p_observable_fact_text, v_whitespace, '') = ''
    or pg_catalog.translate(p_interpretation_text, v_whitespace, '') = ''
    or pg_catalog.translate(p_belief_expectation_text, v_whitespace, '') = '' then
    raise exception using errcode='22004', message='See Clearly wording is required';
  end if;
  if p_belief_expectation_type not in ('belief','expectation') then
    raise exception using errcode='22023', message='exactly one belief or expectation type is required';
  end if;

  perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(v_actor::text || ':phase-1-v1', 0));
  select s.* into v_state from public.user_curriculum_state s
  where s.user_id=v_actor and s.curriculum_version_id='phase-1-v1' for update;
  if not found or v_state.current_node_id not in ('bridge.awaken-see-clearly','see-clearly.fact') then
    raise exception using errcode='40001', message='curriculum state changed';
  end if;

  select j.id into v_source_id from public.journal_entries j
  where j.user_id=v_actor and j.curriculum_version_id='phase-1-v1'
    and j.node_id='awaken.pay-attention.observe' and j.entry_kind='event'
  order by j.created_at limit 1 for share;
  if not found then raise exception using errcode='P0002', message='owned Awaken source not found'; end if;

  insert into public.journal_entries(user_id,curriculum_version_id,node_id,entry_kind,body) values
    (v_actor,'phase-1-v1','see-clearly.fact','observable_fact',p_observable_fact_text) returning id into v_fact_entry_id;
  insert into public.journal_entries(user_id,curriculum_version_id,node_id,entry_kind,body) values
    (v_actor,'phase-1-v1','see-clearly.interpretation','interpretation',p_interpretation_text) returning id into v_interpretation_entry_id;
  insert into public.journal_entries(user_id,curriculum_version_id,node_id,entry_kind,body) values
    (v_actor,'phase-1-v1','see-clearly.belief-expectation','belief_expectation',p_belief_expectation_text) returning id into v_belief_entry_id;

  insert into public.formation_records(user_id,curriculum_version_id,node_id,record_type,value_text,source_journal_entry_id,provenance)
  values(v_actor,'phase-1-v1','see-clearly.fact','observable_fact',p_observable_fact_text,v_fact_entry_id,'user_authored') returning id into v_fact_record_id;
  insert into public.formation_records(user_id,curriculum_version_id,node_id,record_type,value_text,source_journal_entry_id,provenance) values
    (v_actor,'phase-1-v1','see-clearly.interpretation','interpretation',p_interpretation_text,v_interpretation_entry_id,'user_authored'),
    (v_actor,'phase-1-v1','see-clearly.belief-expectation',p_belief_expectation_type::public.formation_record_type,p_belief_expectation_text,v_belief_entry_id,'user_authored');
  insert into public.formation_links(user_id,link_type,source_journal_entry_id,target_formation_record_id)
  values(v_actor,'awaken_to_see_clearly',v_source_id,v_fact_record_id);

  update public.user_curriculum_state s set current_node_id='bridge.see-clearly-become', state='in_progress',
    completed_node_ids=(select pg_catalog.array_agg(x order by x) from (select distinct pg_catalog.unnest(s.completed_node_ids || array['awaken.pay-attention.reflect','bridge.awaken-see-clearly','see-clearly.fact','see-clearly.interpretation','see-clearly.belief-expectation']) x) q), updated_at=now()
  where s.id=v_state.id and s.user_id=v_actor;
  return query select 'bridge.see-clearly-become'::text;
end
$$;

revoke all on function rts_private.save_see_clearly(text,text,text,text) from public, anon, authenticated;
grant execute on function rts_private.save_see_clearly(text,text,text,text) to authenticated;
revoke all on function rts_private.validate_formation_link_lineage() from public, anon, authenticated;

reset role;
do $$
declare v_member name;
begin
  for v_member in select m.rolname from pg_auth_members a join pg_roles g on g.oid=a.roleid join pg_roles m on m.oid=a.member where g.rolname='rts_privileged_owner' and a.grantor=current_user::regrole
  loop execute format('revoke rts_privileged_owner from %I', v_member); end loop;
end
$$;
