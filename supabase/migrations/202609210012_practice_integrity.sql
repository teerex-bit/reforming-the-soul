do $$ begin execute format('grant rts_privileged_owner to %I with inherit false',current_user); execute format('grant rts_privileged_owner to %I with set true',current_user); end $$;
set local role rts_privileged_owner;

create or replace function rts_private.validate_formation_link_lineage() returns trigger language plpgsql security definer set search_path=pg_catalog as $$
declare v_so uuid;v_to uuid;v_sv text;v_tv text;v_sn text;v_tn text;v_sr text;v_tk text;
begin
 if new.link_type='awaken_to_see_clearly' then
  select j.user_id,j.curriculum_version_id,j.node_id into v_so,v_sv,v_sn from public.journal_entries j where j.id=new.source_journal_entry_id;
  select r.user_id,r.curriculum_version_id,r.node_id into v_to,v_tv,v_tn from public.formation_records r where r.id=new.target_formation_record_id;
  if v_so is distinct from new.user_id or v_to is distinct from new.user_id then return new; end if;
  if v_sv is distinct from v_tv or v_sn<>'awaken.pay-attention.observe' or v_tn<>'see-clearly.fact' then raise exception using errcode='23514',message='invalid Awaken to See Clearly lineage'; end if;
 elsif new.link_type='see_clearly_to_become' then
  select r.user_id,r.curriculum_version_id,r.node_id,r.record_type::text into v_so,v_sv,v_sn,v_sr from public.formation_records r where r.id=new.source_formation_record_id;
  select p.user_id,p.curriculum_version_id,p.node_id into v_to,v_tv,v_tn from public.practices p where p.id=new.target_practice_id;
  if v_so is distinct from new.user_id or v_to is distinct from new.user_id then return new; end if;
  if v_sv is distinct from v_tv or v_sn<>'see-clearly.belief-expectation' or v_sr not in ('belief','expectation') or v_tn<>'become.practice.open' then raise exception using errcode='23514',message='invalid See Clearly to Become lineage'; end if;
 elsif new.link_type='practice_to_return' then
  select p.user_id,p.curriculum_version_id,p.node_id into v_so,v_sv,v_sn from public.practices p where p.id=new.source_practice_id;
  select j.user_id,j.curriculum_version_id,j.node_id,j.entry_kind::text into v_to,v_tv,v_tn,v_tk from public.journal_entries j where j.id=new.target_journal_entry_id;
  if v_so is distinct from new.user_id or v_to is distinct from new.user_id then return new; end if;
  if v_sv is distinct from v_tv or v_sn<>'become.practice.open' or v_tn<>'become.practice.return' or v_tk<>'practice_outcome' then raise exception using errcode='23514',message='invalid practice to return lineage'; end if;
 end if; return new;
end $$;

create or replace function rts_private.record_practice_return(p_practice_id uuid,p_expected_lock_version integer,p_outcome_text text)
returns table(practice_return_id uuid,practice_id uuid,state public.practice_state,lock_version integer) language plpgsql security definer set search_path=pg_catalog as $$
declare v_actor uuid:=rts_private.current_actor();v_practice public.practices%rowtype;v_outcome_id uuid;v_return_id uuid;v_ws text:=E' \t\n\r\f'||pg_catalog.chr(11)||U&'\00A0\1680\2000\2001\2002\2003\2004\2005\2006\2007\2008\2009\200A\2028\2029\202F\205F\3000';
begin
 if v_actor is null then raise exception using errcode='42501',message='authentication required';end if;
 if p_expected_lock_version is null then raise exception using errcode='22004',message='expected practice lock version is required';end if;
 if p_outcome_text is null or pg_catalog.translate(p_outcome_text,v_ws,'')='' then raise exception using errcode='22023',message='practice outcome wording is required';end if;
 select p.* into v_practice from public.practices p where p.id=p_practice_id and p.user_id=v_actor for update;
 if not found then raise exception using errcode='P0002',message='practice not found';end if;
 if v_practice.state<>'waiting_for_real_life' or v_practice.lock_version<>p_expected_lock_version then raise exception using errcode='40001',message='stale practice state or lock version';end if;
 insert into public.journal_entries(user_id,curriculum_version_id,node_id,entry_kind,body) values(v_actor,v_practice.curriculum_version_id,'become.practice.return','practice_outcome',p_outcome_text) returning id into v_outcome_id;
 insert into public.practice_returns(user_id,practice_id,outcome_entry_id) values(v_actor,v_practice.id,v_outcome_id) returning id into v_return_id;
 insert into public.formation_links(user_id,link_type,source_practice_id,target_journal_entry_id) values(v_actor,'practice_to_return',v_practice.id,v_outcome_id);
 update public.practices p set state='ready_to_review',lock_version=p.lock_version+1,ready_to_review_at=coalesce(p.ready_to_review_at,now()),updated_at=now() where p.id=v_practice.id and p.user_id=v_actor returning p.* into v_practice;
 update public.user_curriculum_state s set current_node_id='become.practice.review',state='in_progress',completed_node_ids=(select pg_catalog.array_agg(x order by x) from(select distinct pg_catalog.unnest(s.completed_node_ids||array['become.practice.return']) x) q),updated_at=now() where s.user_id=v_actor and s.curriculum_version_id=v_practice.curriculum_version_id;
 return query select v_return_id,v_practice.id,v_practice.state,v_practice.lock_version;
end $$;

create or replace function rts_private.review_practice(p_practice_id uuid,p_expected_lock_version integer,p_review_text text)
returns table(practice_return_id uuid,practice_id uuid,state public.practice_state,lock_version integer) language plpgsql security definer set search_path=pg_catalog as $$
declare v_actor uuid:=rts_private.current_actor();v_practice public.practices%rowtype;v_return public.practice_returns%rowtype;v_review_id uuid;v_ws text:=E' \t\n\r\f'||pg_catalog.chr(11)||U&'\00A0\1680\2000\2001\2002\2003\2004\2005\2006\2007\2008\2009\200A\2028\2029\202F\205F\3000';
begin
 if v_actor is null then raise exception using errcode='42501',message='authentication required';end if;
 if p_expected_lock_version is null then raise exception using errcode='22004',message='expected practice lock version is required';end if;
 if p_review_text is null or pg_catalog.translate(p_review_text,v_ws,'')='' then raise exception using errcode='22023',message='practice review wording is required';end if;
 select p.* into v_practice from public.practices p where p.id=p_practice_id and p.user_id=v_actor for update;
 if not found then raise exception using errcode='P0002',message='practice not found';end if;
 if v_practice.state<>'ready_to_review' or v_practice.lock_version<>p_expected_lock_version then raise exception using errcode='40001',message='stale practice state or lock version';end if;
 select r.* into v_return from public.practice_returns r where r.practice_id=v_practice.id and r.user_id=v_actor for update;
 if not found then raise exception using errcode='P0002',message='practice return not found';end if;
 if v_return.review_entry_id is not null then raise exception using errcode='23505',message='practice return already reviewed';end if;
 insert into public.journal_entries(user_id,curriculum_version_id,node_id,entry_kind,body) values(v_actor,v_practice.curriculum_version_id,'become.practice.review','practice_review',p_review_text) returning id into v_review_id;
 update public.practice_returns r set review_entry_id=v_review_id,reviewed_at=now() where r.id=v_return.id and r.user_id=v_actor returning r.* into v_return;
 update public.practices p set state='reviewed',lock_version=p.lock_version+1,reviewed_at=coalesce(p.reviewed_at,now()),updated_at=now() where p.id=v_practice.id and p.user_id=v_actor returning p.* into v_practice;
 return query select v_return.id,v_practice.id,v_practice.state,v_practice.lock_version;
end $$;

create or replace function rts_private.transition_practice(p_practice_id uuid,p_expected_state public.practice_state,p_expected_lock_version integer,p_target_state public.practice_state)
returns table(practice_id uuid,state public.practice_state,lock_version integer) language plpgsql security definer set search_path=pg_catalog as $$
declare v_actor uuid:=rts_private.current_actor();v_practice public.practices%rowtype;
begin
 if v_actor is null then raise exception using errcode='42501',message='authentication required';end if;
 if p_expected_state is null or p_expected_lock_version is null or p_target_state is null then raise exception using errcode='22004',message='expected practice state, lock version, and target state are required';end if;
 select p.* into v_practice from public.practices p where p.id=p_practice_id and p.user_id=v_actor for update;
 if not found then raise exception using errcode='P0002',message='practice not found';end if;
 if v_practice.state<>p_expected_state or v_practice.lock_version<>p_expected_lock_version then raise exception using errcode='40001',message='stale practice state or lock version';end if;
 if not((p_expected_state='draft' and p_target_state='open')or(p_expected_state='open' and p_target_state='waiting_for_real_life')or(p_expected_state='reviewed' and p_target_state='closed'))then raise exception using errcode='22023',message='invalid practice transition';end if;
 update public.practices p set state=p_target_state,lock_version=p.lock_version+1,opened_at=case when p_target_state='open' then coalesce(p.opened_at,now()) else p.opened_at end,closed_at=case when p_target_state='closed' then coalesce(p.closed_at,now()) else p.closed_at end,updated_at=now() where p.id=v_practice.id and p.user_id=v_actor returning p.* into v_practice;
 if p_target_state='closed' then update public.user_curriculum_state s set current_node_id='become.practice.review',state='completed',completed_node_ids=(select pg_catalog.array_agg(x order by x) from(select distinct pg_catalog.unnest(s.completed_node_ids||array['become.practice.review']) x) q),updated_at=now() where s.user_id=v_actor and s.curriculum_version_id=v_practice.curriculum_version_id;end if;
 return query select v_practice.id,v_practice.state,v_practice.lock_version;
end $$;

reset role;
do $$ declare v_member name;begin for v_member in select m.rolname from pg_auth_members a join pg_roles g on g.oid=a.roleid join pg_roles m on m.oid=a.member where g.rolname='rts_privileged_owner' and a.grantor=current_user::regrole loop execute format('revoke rts_privileged_owner from %I',v_member);end loop;end $$;
