import pg from 'pg';
import type { AiTerminalStatus, ReflectReservation } from './ai-reflect-repository';

export type PriorEntryGrant = Readonly<{ id: string; revision: number; revokedAt: string | null }>;
export type PriorEntryPermissionView = Readonly<{ id: string; preview: string; grant: PriorEntryGrant | null }>;
export interface AiContextGrantRepository {
  grant(input: Readonly<{actorId:string;journalEntryId:string}>): Promise<PriorEntryGrant>;
  revoke(input: Readonly<{actorId:string;grantId:string;expectedRevision:number}>): Promise<PriorEntryGrant>;
  findForPractice(actorId:string, practiceId:string): Promise<Readonly<{currentEntryId:string;source:PriorEntryPermissionView}> | null>;
  reserve(input: Readonly<{actorId:string;intentId:string;requestFingerprint:string;currentEntryId:string;priorEntryId:string;grantId:string;grantRevision:number;modelId:string;globalPolicyVersion:string;stagePolicyVersion:string;modePolicyVersion:string;outputSchemaVersion:string}>): Promise<ReflectReservation>;
  complete(input: Readonly<{actorId:string;threadId:string;status:AiTerminalStatus;durationMs:number;output:Readonly<{questions:readonly string[]}>|null}>): Promise<void>;
  saveSuggestion(input: Readonly<{actorId:string;threadId:string;content:Readonly<{questions:readonly string[]}>}>): Promise<Readonly<{artifactId:string}> | null>;
}

function url(){const v=process.env.RTS_DATABASE_URL??process.env.DATABASE_URL??(process.env.RTS_TEST_MODE==='1'?process.env.TEST_DATABASE_URL:undefined);if(!v)throw new Error('RTS_DATABASE_URL or DATABASE_URL is required for AI context grants.');return v}
let shared:pg.Pool|undefined;
async function authenticated<T>(pool:pg.Pool,actorId:string,run:(client:pg.PoolClient)=>Promise<T>){const client=await pool.connect();try{await client.query('begin');await client.query('set local role authenticated');await client.query("select set_config('request.jwt.claims',$1,true)",[JSON.stringify({sub:actorId})]);await client.query("select set_config('request.jwt.claim.sub',$1,true)",[actorId]);const result=await run(client);await client.query('commit');return result}catch(error){await client.query('rollback');throw error}finally{client.release()}}

export function aiContextGrantRepository({pool}:{pool?:pg.Pool}={}):AiContextGrantRepository{
 const database=pool??(shared??=new pg.Pool({connectionString:url()}));
 return {
  grant: input=>authenticated(database,input.actorId,async client=>{const r=(await client.query('select * from rts_private.grant_ai_context($1,$2)',[input.journalEntryId,'single_entry_reflect'])).rows[0];return{id:r.grant_id,revision:r.revision,revokedAt:null}}),
  revoke: input=>authenticated(database,input.actorId,async client=>{const r=(await client.query('select * from rts_private.revoke_ai_context($1,$2)',[input.grantId,input.expectedRevision])).rows[0];return{id:r.grant_id,revision:r.revision,revokedAt:r.revoked_at.toISOString()}}),
  findForPractice:(actorId,practiceId)=>authenticated(database,actorId,async client=>{const r=(await client.query(`select review.id current_entry_id, prior.id, prior.body,
    context_grant.id grant_id, context_grant.revision, context_grant.revoked_at
   from public.practices p join public.practice_returns pr on (pr.practice_id,pr.user_id)=(p.id,p.user_id)
   join public.journal_entries review on (review.id,review.user_id)=(pr.review_entry_id,pr.user_id)
   join lateral (select j.id,j.body from public.journal_entries j where j.user_id=p.user_id and j.node_id='awaken.pay-attention.observe' and j.entry_kind='event' order by j.created_at asc limit 1) prior on true
   left join public.ai_context_grants context_grant on context_grant.user_id=p.user_id and context_grant.journal_entry_id=prior.id and context_grant.scope='single_entry_reflect' and context_grant.revoked_at is null
   where p.user_id=$1 and p.id=$2 and p.state in ('reviewed','closed')`,[actorId,practiceId])).rows[0];return r?{currentEntryId:r.current_entry_id,source:{id:r.id,preview:r.body,grant:r.grant_id?{id:r.grant_id,revision:r.revision,revokedAt:null}:null}}:null}),
  reserve: input=>authenticated(database,input.actorId,async client=>{const r=(await client.query('select * from rts_private.reserve_practice_review_reflect($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)',[input.intentId,input.requestFingerprint,input.currentEntryId,input.priorEntryId,input.grantId,input.grantRevision,input.modelId,input.globalPolicyVersion,input.stagePolicyVersion,input.modePolicyVersion,input.outputSchemaVersion])).rows[0];if(!r||r.reservation_result==='unavailable')return{kind:'unavailable'};if(r.reservation_result!=='dispatch')return{kind:r.reservation_result,threadId:r.thread_id};return{kind:'dispatch',threadId:r.thread_id,context:{entries:[{id:r.current_id,kind:'practice_review',body:r.current_body}],selectedPrior:{id:r.prior_id,kind:'event',body:r.prior_body}}}}),
  complete: input=>authenticated(database,input.actorId,async client=>{await client.query('select rts_private.complete_practice_review_reflect($1,$2,$3,$4::jsonb)',[input.threadId,input.status,input.durationMs,input.output?JSON.stringify(input.output):null])}),
  saveSuggestion: input=>authenticated(database,input.actorId,async client=>{const r=(await client.query('select * from rts_private.save_practice_reflect_suggestion($1,$2::jsonb)',[input.threadId,JSON.stringify(input.content)])).rows[0];return r?.artifact_id?{artifactId:r.artifact_id}:null}),
 }
}
