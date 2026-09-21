import { randomUUID } from 'node:crypto';
import { afterAll, describe, expect, it, vi } from 'vitest';
import { createTestPool, withAuthenticatedActor } from '../helpers/db';
import { aiContextGrantRepository } from '../../server/data/ai-context-grant-repository';
import { grantPriorEntryPermission, reflectOnPracticeReview, revokePriorEntryPermission, savePracticeReflectSuggestion } from '../../server/services/ai-context-grant-service';

const pool=createTestPool(),users:string[]=[];
const clientFor=(id:string)=>({auth:{getUser:async()=>({data:{user:{id,email:null}},error:null})}});
async function fixture(){const user=randomUUID();users.push(user);await pool.query(`insert into auth.users(id,instance_id,aud,role,email,encrypted_password,email_confirmed_at,raw_app_meta_data,raw_user_meta_data,created_at,updated_at) values($1,'00000000-0000-0000-0000-000000000000','authenticated','authenticated',$2,'',now(),'{}','{}',now(),now())`,[user,`${user}@rts.test`]);
 const prior=(await pool.query(`insert into public.journal_entries(user_id,curriculum_version_id,node_id,entry_kind,body) values($1,'phase-1-v1','awaken.pay-attention.observe','event','Earlier exact words') returning id`,[user])).rows[0].id;
 const ids=[];for(const [node,kind,body] of [['become.control','control_target','control'],['become.receive','present_truth','truth'],['become.next-step','next_right_step','step'],['become.practice.return','practice_outcome','outcome'],['become.practice.review','practice_review','Current exact review']] as const)ids.push((await pool.query(`insert into public.journal_entries(user_id,curriculum_version_id,node_id,entry_kind,body) values($1,'phase-1-v1',$2,$3,$4) returning id`,[user,node,kind,body])).rows[0].id);
 const practice=(await pool.query(`insert into public.practices(user_id,curriculum_version_id,node_id,control_target_entry_id,present_truth_entry_id,next_right_step_entry_id,state,opened_at,reviewed_at) values($1,'phase-1-v1','become.practice.open',$2,$3,$4,'reviewed',now(),now()) returning id`,[user,ids[0],ids[1],ids[2]])).rows[0].id;
 await pool.query(`insert into public.practice_returns(user_id,practice_id,outcome_entry_id,review_entry_id,reviewed_at) values($1,$2,$3,$4,now())`,[user,practice,ids[3],ids[4]]);return{user,prior,current:ids[4],practice}}
afterAll(async()=>{await pool.query('delete from auth.users where id=any($1::uuid[])',[users]);await pool.end()});

describe('selected-prior Reflect authorization',()=>{
 it('denies direct authenticated fabrication of owned AI provenance tables',async()=>{
  const a=await fixture();
  const attempts=[
   [`insert into public.ai_threads(user_id,intent_id,request_fingerprint,mode,stage,curriculum_version_id,node_id,status,model_id,global_policy_version,stage_policy_version,mode_policy_version,output_schema_version) values($1,$2,'forged','reflect','awaken','phase-1-v1','awaken.pay-attention.reflect','success','forged','g','s','m','o')`,[a.user,randomUUID()]],
   [`insert into public.ai_artifacts(user_id,thread_id,artifact_type,content,status,provenance,model_id,global_policy_version,stage_policy_version,mode_policy_version,output_schema_version) values($1,$2,'summary','{}','suggested','ai_suggested','forged','g','s','m','o')`,[a.user,randomUUID()]],
   [`insert into public.ai_artifact_sources(user_id,artifact_id,journal_entry_id,source_role) values($1,$2,$3,'current')`,[a.user,randomUUID(),a.prior]],
  ] as const;
  for(const [sql,params] of attempts)await expect(withAuthenticatedActor(pool,a.user,client=>client.query(sql,[...params]))).rejects.toMatchObject({code:'42501'});
 });
 it('returns neutral unavailable without an active owned grant and never dispatches',async()=>{const a=await fixture(),b=await fixture();const provider={respond:vi.fn()};for(const prior of [a.prior,b.prior,randomUUID()])await expect(reflectOnPracticeReview({intentId:randomUUID(),currentEntryId:a.current,priorEntryId:prior,grantId:randomUUID(),grantRevision:1},{actorClient:clientFor(a.user),repository:aiContextGrantRepository({pool}),provider})).resolves.toEqual({kind:'unavailable'});expect(provider.respond).not.toHaveBeenCalled()});
 it('materializes exactly one selected source, revokes future use, and saves immutable provenance without a transcript',async()=>{const a=await fixture(),repository=aiContextGrantRepository({pool});const grant=await grantPriorEntryPermission({journalEntryId:a.prior},{actorClient:clientFor(a.user),repository});const provider:{respond:any}={respond:vi.fn(async()=>({kind:'success' as const,value:{questions:['What changed when you compared these moments?']},providerRequestId:'not-stored'}))};const result=await reflectOnPracticeReview({intentId:randomUUID(),currentEntryId:a.current,priorEntryId:a.prior,grantId:grant.id,grantRevision:grant.revision},{actorClient:clientFor(a.user),repository,provider});expect(result).toMatchObject({kind:'success'});const request=provider.respond.mock.calls[0][0];expect(request.input.filter((x:any)=>x.label==='SELECTED_PRIOR_USER_ENTRY_UNTRUSTED_DATA')).toHaveLength(1);expect(JSON.stringify(request)).toContain('Earlier exact words');if(result.kind!=='success')throw new Error('expected success');await savePracticeReflectSuggestion({threadId:result.threadId,questions:result.value.questions},{actorClient:clientFor(a.user),repository});const sources=await pool.query(`select s.source_role::text,s.journal_entry_id,s.context_grant_id,s.grant_revision,a.model_id,a.global_policy_version,a.stage_policy_version,a.mode_policy_version,a.output_schema_version,a.content from public.ai_artifact_sources s join public.ai_artifacts a on (a.id,a.user_id)=(s.artifact_id,s.user_id) where a.thread_id=$1 order by s.source_role`,[result.threadId]);expect(sources.rows).toHaveLength(2);expect(sources.rows.find(r=>r.source_role==='selected_prior')).toMatchObject({journal_entry_id:a.prior,context_grant_id:grant.id,grant_revision:grant.revision});expect(JSON.stringify(sources.rows)).not.toContain('not-stored');await revokePriorEntryPermission({grantId:grant.id,expectedRevision:grant.revision},{actorClient:clientFor(a.user),repository});const blocked={respond:vi.fn()};await expect(reflectOnPracticeReview({intentId:randomUUID(),currentEntryId:a.current,priorEntryId:a.prior,grantId:grant.id,grantRevision:grant.revision},{actorClient:clientFor(a.user),repository,provider:blocked})).resolves.toEqual({kind:'unavailable'});expect(blocked.respond).not.toHaveBeenCalled()});
 it('allows an already-authorized call to finish but blocks the next call after revocation',async()=>{const a=await fixture(),repository=aiContextGrantRepository({pool});const grant=await grantPriorEntryPermission({journalEntryId:a.prior},{actorClient:clientFor(a.user),repository});let release!:()=>void;const gate=new Promise<void>(resolve=>{release=resolve});const provider={respond:vi.fn(async()=>{await gate;return{kind:'success' as const,value:{questions:['What do you notice now?']},providerRequestId:null}})};const active=reflectOnPracticeReview({intentId:randomUUID(),currentEntryId:a.current,priorEntryId:a.prior,grantId:grant.id,grantRevision:grant.revision},{actorClient:clientFor(a.user),repository,provider});while(!provider.respond.mock.calls.length)await new Promise(resolve=>setTimeout(resolve,5));await revokePriorEntryPermission({grantId:grant.id,expectedRevision:grant.revision},{actorClient:clientFor(a.user),repository});release();await expect(active).resolves.toMatchObject({kind:'success'});const later={respond:vi.fn()};await expect(reflectOnPracticeReview({intentId:randomUUID(),currentEntryId:a.current,priorEntryId:a.prior,grantId:grant.id,grantRevision:grant.revision},{actorClient:clientFor(a.user),repository,provider:later})).resolves.toEqual({kind:'unavailable'});expect(later.respond).not.toHaveBeenCalled()});
 it('dispatches only once for concurrent matching requests',async()=>{
  const a=await fixture(),repository=aiContextGrantRepository({pool});
  const grant=await grantPriorEntryPermission({journalEntryId:a.prior},{actorClient:clientFor(a.user),repository});
  const intentId=randomUUID();let release!:()=>void;const gate=new Promise<void>(resolve=>{release=resolve});
  const provider={respond:vi.fn(async()=>{await gate;return{kind:'success' as const,value:{questions:['What do you notice?']},providerRequestId:null}})};
  const input={intentId,currentEntryId:a.current,priorEntryId:a.prior,grantId:grant.id,grantRevision:grant.revision};
  const first=reflectOnPracticeReview(input,{actorClient:clientFor(a.user),repository,provider});
  while(!provider.respond.mock.calls.length)await new Promise(resolve=>setTimeout(resolve,5));
  await expect(reflectOnPracticeReview(input,{actorClient:clientFor(a.user),repository,provider})).resolves.toMatchObject({kind:'in_progress'});
  release();await expect(first).resolves.toMatchObject({kind:'success'});
  await expect(reflectOnPracticeReview(input,{actorClient:clientFor(a.user),repository,provider})).resolves.toMatchObject({kind:'already_completed'});
  expect(provider.respond).toHaveBeenCalledTimes(1);
 });
 it('rejects stale or deleted selected-source authorization neutrally',async()=>{
  const a=await fixture(),repository=aiContextGrantRepository({pool}),provider={respond:vi.fn()};
  const old=await grantPriorEntryPermission({journalEntryId:a.prior},{actorClient:clientFor(a.user),repository});
  await revokePriorEntryPermission({grantId:old.id,expectedRevision:old.revision},{actorClient:clientFor(a.user),repository});
  await grantPriorEntryPermission({journalEntryId:a.prior},{actorClient:clientFor(a.user),repository});
  await expect(reflectOnPracticeReview({intentId:randomUUID(),currentEntryId:a.current,priorEntryId:a.prior,grantId:old.id,grantRevision:old.revision},{actorClient:clientFor(a.user),repository,provider})).resolves.toEqual({kind:'unavailable'});
  await pool.query('delete from public.journal_entries where id=$1 and user_id=$2',[a.prior,a.user]);
  await expect(reflectOnPracticeReview({intentId:randomUUID(),currentEntryId:a.current,priorEntryId:a.prior,grantId:randomUUID(),grantRevision:1},{actorClient:clientFor(a.user),repository,provider})).resolves.toEqual({kind:'unavailable'});
  expect(provider.respond).not.toHaveBeenCalled();
 });
});
