do $$
begin
  execute format('grant rts_privileged_owner to %I with inherit false', current_user);
  execute format('grant rts_privileged_owner to %I with set true', current_user);
end
$$;

set local role rts_privileged_owner;

create index ai_thread_source_authorizations_journal_fk_idx
  on rts_private.ai_thread_source_authorizations(journal_entry_id,user_id);

create index ai_thread_source_authorizations_grant_fk_idx
  on rts_private.ai_thread_source_authorizations(context_grant_id,journal_entry_id,user_id);

reset role;

do $$
declare v_member name;
begin
  for v_member in select m.rolname from pg_auth_members a join pg_roles g on g.oid=a.roleid join pg_roles m on m.oid=a.member where g.rolname='rts_privileged_owner' and a.grantor=current_user::regrole
  loop execute format('revoke rts_privileged_owner from %I',v_member); end loop;
end
$$;
