do $$ begin
  execute format('grant rts_privileged_owner to %I with inherit false',current_user);
  execute format('grant rts_privileged_owner to %I with set true',current_user);
end $$;
set local role rts_privileged_owner;

create function rts_private.save_become_practice(p_control_target_text text,p_present_truth_text text,p_next_right_step_text text)
returns table(practice_id uuid,state public.practice_state,lock_version integer)
language plpgsql security definer set search_path=pg_catalog as $$
declare
  v_actor uuid:=rts_private.current_actor(); v_control uuid; v_truth uuid; v_step uuid; v_practice public.practices%rowtype; v_source uuid;
  v_whitespace text:=E' \t\n\r\f'||pg_catalog.chr(11)||U&'\00A0\1680\2000\2001\2002\2003\2004\2005\2006\2007\2008\2009\200A\2028\2029\202F\205F\3000';
begin
  if v_actor is null then raise exception using errcode='42501',message='authentication required'; end if;
  if p_control_target_text is null or pg_catalog.translate(p_control_target_text,v_whitespace,'')='' or p_present_truth_text is null or pg_catalog.translate(p_present_truth_text,v_whitespace,'')='' or p_next_right_step_text is null or pg_catalog.translate(p_next_right_step_text,v_whitespace,'')='' then
    raise exception using errcode='22023',message='practice wording is required';
  end if;
  perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(v_actor::text||':phase-1-v1',0));
  if not exists(select 1 from public.user_curriculum_state s where s.user_id=v_actor and s.curriculum_version_id='phase-1-v1' and s.current_node_id='bridge.see-clearly-become') then
    raise exception using errcode='40001',message='stale curriculum state';
  end if;
  if exists(select 1 from public.practices p where p.user_id=v_actor and p.state<>'closed') then
    raise exception using errcode='40001',message='unfinished practice already exists';
  end if;
  insert into public.journal_entries(user_id,curriculum_version_id,node_id,entry_kind,body) values(v_actor,'phase-1-v1','become.control','control_target',p_control_target_text) returning id into v_control;
  insert into public.journal_entries(user_id,curriculum_version_id,node_id,entry_kind,body) values(v_actor,'phase-1-v1','become.receive','present_truth',p_present_truth_text) returning id into v_truth;
  insert into public.journal_entries(user_id,curriculum_version_id,node_id,entry_kind,body) values(v_actor,'phase-1-v1','become.next-step','next_right_step',p_next_right_step_text) returning id into v_step;
  insert into public.formation_records(user_id,curriculum_version_id,node_id,record_type,value_text,source_journal_entry_id,provenance) values
    (v_actor,'phase-1-v1','become.control','control_target',p_control_target_text,v_control,'user_authored'),
    (v_actor,'phase-1-v1','become.receive','present_truth',p_present_truth_text,v_truth,'user_authored'),
    (v_actor,'phase-1-v1','become.next-step','next_right_step',p_next_right_step_text,v_step,'user_authored');
  insert into public.practices(user_id,curriculum_version_id,node_id,control_target_entry_id,present_truth_entry_id,next_right_step_entry_id,state,opened_at)
    values(v_actor,'phase-1-v1','become.practice.open',v_control,v_truth,v_step,'waiting_for_real_life',now()) returning * into v_practice;
  select r.id into v_source from public.formation_records r where r.user_id=v_actor and r.node_id='see-clearly.belief-expectation' order by r.created_at desc limit 1;
  if v_source is not null then insert into public.formation_links(user_id,link_type,source_formation_record_id,target_practice_id) values(v_actor,'see_clearly_to_become',v_source,v_practice.id); end if;
  update public.user_curriculum_state s set current_node_id='become.practice.return',state='in_progress',completed_node_ids=array(select distinct x from unnest(s.completed_node_ids||array['bridge.see-clearly-become','become.control','become.receive','become.next-step','become.practice.open']) x),updated_at=now() where s.user_id=v_actor and s.curriculum_version_id='phase-1-v1';
  return query select v_practice.id,v_practice.state,v_practice.lock_version;
end $$;

revoke all on function rts_private.save_become_practice(text,text,text) from public,anon,authenticated;
grant execute on function rts_private.save_become_practice(text,text,text) to authenticated;
reset role;
do $$ declare v_member name; begin
 for v_member in select m.rolname from pg_auth_members a join pg_roles g on g.oid=a.roleid join pg_roles m on m.oid=a.member where g.rolname='rts_privileged_owner' and a.grantor=current_user::regrole loop execute format('revoke rts_privileged_owner from %I',v_member); end loop;
end $$;
