do $$
begin
  execute format('grant rts_privileged_owner to %I with inherit false', current_user);
  execute format('grant rts_privileged_owner to %I with set true', current_user);
end
$$;

set local role rts_privileged_owner;

create or replace function rts_private.validate_formation_link_lineage()
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
    select j.user_id,j.curriculum_version_id,j.node_id
      into v_source_owner,v_source_version,v_source_node
      from public.journal_entries j where j.id=new.source_journal_entry_id;
    select r.user_id,r.curriculum_version_id,r.node_id
      into v_target_owner,v_target_version,v_target_node
      from public.formation_records r where r.id=new.target_formation_record_id;

    -- Composite foreign keys are the authoritative same-owner guard. Let them
    -- reject missing or cross-owner endpoints before applying semantic lineage.
    if v_source_owner is distinct from new.user_id
      or v_target_owner is distinct from new.user_id then
      return new;
    end if;

    if v_source_version is distinct from v_target_version
      or v_source_node <> 'awaken.pay-attention.observe'
      or v_target_node <> 'see-clearly.fact' then
      raise exception using errcode='23514', message='invalid Awaken to See Clearly lineage';
    end if;
  end if;
  return new;
end
$$;

reset role;

do $$
declare v_member name;
begin
  for v_member in select m.rolname from pg_auth_members a join pg_roles g on g.oid=a.roleid join pg_roles m on m.oid=a.member where g.rolname='rts_privileged_owner' and a.grantor=current_user::regrole
  loop execute format('revoke rts_privileged_owner from %I', v_member); end loop;
end
$$;
