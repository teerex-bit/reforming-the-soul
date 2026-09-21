do $$ begin
  execute format('grant rts_privileged_owner to %I with inherit false', current_user);
  execute format('grant rts_privileged_owner to %I with set true', current_user);
end $$;
grant references on public.ai_threads,public.journal_entries,public.ai_context_grants to rts_privileged_owner;
set local role rts_privileged_owner;

create table rts_private.ai_thread_source_authorizations (
  thread_id uuid not null,
  user_id uuid not null,
  journal_entry_id uuid not null,
  source_role public.ai_source_role not null,
  context_grant_id uuid,
  grant_revision integer,
  output_fingerprint text,
  primary key (thread_id, source_role),
  foreign key (thread_id,user_id) references public.ai_threads(id,user_id) on delete cascade,
  foreign key (journal_entry_id,user_id) references public.journal_entries(id,user_id) on delete cascade,
  foreign key (context_grant_id,journal_entry_id,user_id) references public.ai_context_grants(id,journal_entry_id,user_id) on delete cascade,
  check ((source_role='current' and context_grant_id is null and grant_revision is null)
    or (source_role='selected_prior' and context_grant_id is not null and grant_revision >= 1))
);
revoke all on rts_private.ai_thread_source_authorizations from public,anon,authenticated;

reset role;
alter table public.ai_artifacts add column curriculum_version_id text not null default 'phase-1-v1'
  references public.curriculum_versions(id) on delete restrict;

create unique index ai_artifacts_one_saved_suggestion_per_thread
  on public.ai_artifacts(thread_id,user_id,artifact_type) where artifact_type='summary';

set local role rts_privileged_owner;

create function rts_private.reserve_practice_review_reflect(
 p_intent_id uuid,p_request_fingerprint text,p_current_entry_id uuid,p_prior_entry_id uuid,p_grant_id uuid,p_grant_revision integer,
 p_model_id text,p_global_policy_version text,p_stage_policy_version text,p_mode_policy_version text,p_output_schema_version text
) returns table(reservation_result text,thread_id uuid,current_id uuid,current_body text,prior_id uuid,prior_body text)
language plpgsql security definer set search_path=pg_catalog as $$
declare v_actor uuid:=rts_private.current_actor();v_thread public.ai_threads%rowtype;v_current public.journal_entries%rowtype;v_prior public.journal_entries%rowtype;v_grant public.ai_context_grants%rowtype;
begin
 if v_actor is null then raise exception using errcode='42501',message='authentication required';end if;
 if p_intent_id is null or p_request_fingerprint is null or p_request_fingerprint='' or p_current_entry_id is null or p_prior_entry_id is null or p_grant_id is null or p_grant_revision is null then raise exception using errcode='22004',message='AI Reflect authorization inputs are required';end if;
 if p_model_id is null or p_global_policy_version is null or p_stage_policy_version is null or p_mode_policy_version is null or p_output_schema_version is null then raise exception using errcode='22004',message='AI Reflect provenance versions are required';end if;
 perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(v_actor::text||':'||p_intent_id::text,0));
 select t.* into v_thread from public.ai_threads t where t.user_id=v_actor and t.intent_id=p_intent_id for update;
 if found then
  if v_thread.request_fingerprint is distinct from p_request_fingerprint then raise exception using errcode='23514',message='AI Reflect intent conflicts with a different request';end if;
  if v_thread.status='pending' and v_thread.updated_at<=pg_catalog.clock_timestamp()-interval '2 minutes' then update public.ai_threads t set status='provider_error',updated_at=now() where t.id=v_thread.id and t.user_id=v_actor and t.status='pending';v_thread.status:='provider_error';end if;
  return query select case when v_thread.status='pending' then 'in_progress' else 'already_completed' end,v_thread.id,null::uuid,null::text,null::uuid,null::text;return;
 end if;
 select j.* into v_current from public.journal_entries j where j.id=p_current_entry_id and j.user_id=v_actor and j.node_id='become.practice.review' and j.entry_kind='practice_review' and exists(select 1 from public.practice_returns pr join public.practices p on (p.id,p.user_id)=(pr.practice_id,pr.user_id) where pr.user_id=v_actor and pr.review_entry_id=j.id and p.state in ('reviewed','closed')) for share;
 select j.* into v_prior from public.journal_entries j where j.id=p_prior_entry_id and j.user_id=v_actor and j.node_id='awaken.pay-attention.observe' and j.entry_kind='event' for share;
 select g.* into v_grant from public.ai_context_grants g where g.id=p_grant_id and g.user_id=v_actor and g.journal_entry_id=p_prior_entry_id and g.scope='single_entry_reflect' and g.revision=p_grant_revision and g.revoked_at is null for share;
 if v_current.id is null or v_prior.id is null or v_grant.id is null then return query select 'unavailable',null::uuid,null::uuid,null::text,null::uuid,null::text;return;end if;
 insert into public.ai_threads(user_id,intent_id,request_fingerprint,mode,stage,curriculum_version_id,node_id,status,model_id,global_policy_version,stage_policy_version,mode_policy_version,output_schema_version)
 values(v_actor,p_intent_id,p_request_fingerprint,'reflect','become','phase-1-v1','awaken.pay-attention.reflect','pending',p_model_id,p_global_policy_version,p_stage_policy_version,p_mode_policy_version,p_output_schema_version) returning * into v_thread;
 insert into rts_private.ai_thread_source_authorizations(thread_id,user_id,journal_entry_id,source_role) values(v_thread.id,v_actor,v_current.id,'current');
 insert into rts_private.ai_thread_source_authorizations(thread_id,user_id,journal_entry_id,source_role,context_grant_id,grant_revision) values(v_thread.id,v_actor,v_prior.id,'selected_prior',v_grant.id,v_grant.revision);
 return query select 'dispatch',v_thread.id,v_current.id,v_current.body,v_prior.id,v_prior.body;
end $$;

create function rts_private.complete_practice_review_reflect(p_thread_id uuid,p_status public.ai_outcome,p_duration_ms integer,p_output jsonb)
returns void language plpgsql security definer set search_path=pg_catalog as $$
declare v_actor uuid:=rts_private.current_actor();
begin
 if v_actor is null then raise exception using errcode='42501',message='authentication required';end if;
 if p_status='pending' or p_duration_ms is null or p_duration_ms<0 or (p_status='success')<>(p_output is not null) then raise exception using errcode='22023',message='terminal status, duration, and output are invalid';end if;
 update public.ai_threads t set status=p_status,duration_ms=p_duration_ms,updated_at=now() where t.id=p_thread_id and t.user_id=v_actor and t.status='pending' and exists(select 1 from rts_private.ai_thread_source_authorizations s where s.thread_id=t.id and s.user_id=v_actor);
 if not found then raise exception using errcode='42501',message='AI Reflect reservation unavailable';end if;
 if p_output is not null then update rts_private.ai_thread_source_authorizations s set output_fingerprint=pg_catalog.encode(extensions.digest(p_output::text,'sha256'),'hex') where s.thread_id=p_thread_id and s.user_id=v_actor and s.source_role='current';end if;
end $$;

create function rts_private.save_practice_reflect_suggestion(p_thread_id uuid,p_content jsonb)
returns table(artifact_id uuid) language plpgsql security definer set search_path=pg_catalog as $$
declare v_actor uuid:=rts_private.current_actor();v_thread public.ai_threads%rowtype;v_artifact public.ai_artifacts%rowtype;
begin
 if v_actor is null then raise exception using errcode='42501',message='authentication required';end if;
 select t.* into v_thread from public.ai_threads t where t.id=p_thread_id and t.user_id=v_actor and t.status='success' for update;
 if not found or p_content is null or not exists(select 1 from rts_private.ai_thread_source_authorizations s where s.thread_id=v_thread.id and s.user_id=v_actor and s.source_role='current' and s.output_fingerprint=pg_catalog.encode(extensions.digest(p_content::text,'sha256'),'hex')) then return query select null::uuid;return;end if;
 select a.* into v_artifact from public.ai_artifacts a where a.thread_id=v_thread.id and a.user_id=v_actor and a.artifact_type='summary';
 if not found then
  insert into public.ai_artifacts(user_id,thread_id,artifact_type,content,status,provenance,curriculum_version_id,model_id,global_policy_version,stage_policy_version,mode_policy_version,output_schema_version)
  values(v_actor,v_thread.id,'summary',p_content,'suggested','ai_suggested',v_thread.curriculum_version_id,v_thread.model_id,v_thread.global_policy_version,v_thread.stage_policy_version,v_thread.mode_policy_version,v_thread.output_schema_version) returning * into v_artifact;
  insert into public.ai_artifact_sources(user_id,artifact_id,journal_entry_id,context_grant_id,grant_revision,source_role)
   select v_actor,v_artifact.id,s.journal_entry_id,s.context_grant_id,s.grant_revision,s.source_role from rts_private.ai_thread_source_authorizations s join public.journal_entries j on (j.id,j.user_id)=(s.journal_entry_id,s.user_id) where s.thread_id=v_thread.id and s.user_id=v_actor;
  if (select count(*) from public.ai_artifact_sources s where s.artifact_id=v_artifact.id and s.user_id=v_actor)<>2 then delete from public.ai_artifacts a where a.id=v_artifact.id and a.user_id=v_actor;return query select null::uuid;return;end if;
 end if;
 return query select v_artifact.id;
end $$;

revoke all on function rts_private.reserve_practice_review_reflect(uuid,text,uuid,uuid,uuid,integer,text,text,text,text,text) from public,anon,authenticated;
grant execute on function rts_private.reserve_practice_review_reflect(uuid,text,uuid,uuid,uuid,integer,text,text,text,text,text) to authenticated;
revoke all on function rts_private.complete_practice_review_reflect(uuid,public.ai_outcome,integer,jsonb) from public,anon,authenticated;
grant execute on function rts_private.complete_practice_review_reflect(uuid,public.ai_outcome,integer,jsonb) to authenticated;
revoke all on function rts_private.save_practice_reflect_suggestion(uuid,jsonb) from public,anon,authenticated;
grant execute on function rts_private.save_practice_reflect_suggestion(uuid,jsonb) to authenticated;
reset role;
revoke references on public.ai_threads,public.journal_entries,public.ai_context_grants from rts_privileged_owner;
do $$ declare v_member name;begin for v_member in select m.rolname from pg_auth_members x join pg_roles g on g.oid=x.roleid join pg_roles m on m.oid=x.member where g.rolname='rts_privileged_owner' and x.grantor=current_user::regrole loop execute format('revoke rts_privileged_owner from %I',v_member);end loop;end $$;
