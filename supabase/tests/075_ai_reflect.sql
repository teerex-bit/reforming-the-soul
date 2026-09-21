begin;
select plan(11);

select is((select count(*)::integer from pg_enum e join pg_type t on t.oid=e.enumtypid where t.typname='ai_outcome' and e.enumlabel='pending'), 1, 'AI outcome includes pending reservation state');
select has_function('rts_private', 'reserve_ai_reflect', array['uuid','text','text','text','text','text','text'], 'reservation function exists');
select has_function('rts_private', 'complete_ai_reflect', array['uuid','ai_outcome','integer'], 'completion function exists');
select has_function('rts_private', 'save_reflect_insight', array['uuid','text'], 'confirmed insight function exists');
select is((select prosecdef from pg_proc where oid='rts_private.reserve_ai_reflect(uuid,text,text,text,text,text,text)'::regprocedure), true, 'reservation is security definer');
select is((select proconfig @> array['search_path=pg_catalog'] from pg_proc where oid='rts_private.reserve_ai_reflect(uuid,text,text,text,text,text,text)'::regprocedure), true, 'reservation has hardened search path');
select function_privs_are('rts_private', 'reserve_ai_reflect', array['uuid','text','text','text','text','text','text'], 'authenticated', array['EXECUTE'], 'authenticated may reserve');
select function_privs_are('rts_private', 'reserve_ai_reflect', array['uuid','text','text','text','text','text','text'], 'anon', array[]::text[], 'anonymous may not reserve');
select is((select rolname from pg_roles r join pg_proc p on p.proowner=r.oid where p.oid='rts_private.reserve_ai_reflect(uuid,text,text,text,text,text,text)'::regprocedure), 'rts_privileged_owner', 'reservation owner is non-login role');
select matches((select prosrc from pg_proc where oid='rts_private.reserve_ai_reflect(uuid,text,text,text,text,text,text)'::regprocedure), 'pg_advisory_xact_lock', 'reservation serializes on actor curriculum lock');
select matches((select prosrc from pg_proc where oid='rts_private.reserve_ai_reflect(uuid,text,text,text,text,text,text)'::regprocedure), 'provider_error', 'stale pending reservation terminalizes without redispatch');

select * from finish();
rollback;
