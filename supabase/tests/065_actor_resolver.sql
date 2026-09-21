begin;
select plan(19);

select has_schema('rts_private', 'private application schema exists');
select has_function('rts_private', 'current_actor', array[]::text[],
  'private actor resolver exists without caller-controlled parameters');
select is(
  (select owner_role.rolname
   from pg_proc procedure
   join pg_namespace namespace on namespace.oid = procedure.pronamespace
   join pg_roles owner_role on owner_role.oid = procedure.proowner
   where namespace.nspname = 'rts_private' and procedure.proname = 'current_actor'),
  'rts_privileged_owner',
  'private actor resolver is owned by the approved non-login role'
);
select ok(
  not has_schema_privilege('anon', 'rts_private', 'usage'),
  'anonymous callers cannot resolve private application objects'
);
select ok(
  not has_function_privilege('authenticated', 'rts_private.current_actor()', 'execute'),
  'authenticated callers cannot invoke the actor resolver directly'
);
select ok(
  not has_schema_privilege('rts_privileged_owner', 'auth', 'usage'),
  'privileged owner does not require access to the Supabase auth schema'
);
select ok(
  not exists (
    select 1
    from pg_proc procedure
    join pg_namespace namespace on namespace.oid = procedure.pronamespace
    join pg_roles owner_role on owner_role.rolname = 'rts_privileged_owner'
    cross join lateral aclexplode(coalesce(procedure.proacl, acldefault('f', procedure.proowner))) acl
    where namespace.nspname = 'auth' and procedure.proname = 'uid'
      and acl.grantee = owner_role.oid and acl.privilege_type = 'EXECUTE'
  ),
  'privileged owner has no custom auth.uid execution grant'
);
select is(
  (select count(*)::integer
   from pg_proc procedure
   join pg_namespace namespace on namespace.oid = procedure.pronamespace
   where namespace.nspname in ('public', 'graphql_public')
     and procedure.proname in (
       'transition_practice', 'record_practice_return', 'review_practice',
       'grant_ai_context', 'revoke_ai_context', 'delete_journal_entry_with_dependencies'
     )),
  0,
  'privileged functions are absent from exposed API schemas'
);

set local role rts_privileged_owner;
select set_config('request.jwt.claim.sub', '', true);
select set_config('request.jwt.claims', '{"sub":"00000000-0000-4000-8000-0000000000a1"}', true);
select is(rts_private.current_actor()::text, '00000000-0000-4000-8000-0000000000a1',
  'verified JSON claims resolve User A only');

select set_config('request.jwt.claims', '{"sub":"00000000-0000-4000-8000-0000000000b2"}', true);
select is(rts_private.current_actor()::text, '00000000-0000-4000-8000-0000000000b2',
  'verified JSON claims resolve User B only');

select set_config('request.jwt.claims', '', true);
select set_config('request.jwt.claim.sub', '', true);
select is(rts_private.current_actor(), null::uuid, 'missing JWT subject resolves to NULL');

select set_config('request.jwt.claim.sub', '00000000-0000-4000-8000-0000000000a1', true);
select set_config('request.jwt.claims', '{malformed', true);
select is(rts_private.current_actor(), null::uuid,
  'malformed current claims cannot fall back to a legacy subject');

select set_config('request.jwt.claims', '{}', true);
select is(rts_private.current_actor(), null::uuid,
  'current claims missing sub cannot fall back to a legacy subject');

select set_config('request.jwt.claims', '', true);
select is(rts_private.current_actor()::text, '00000000-0000-4000-8000-0000000000a1',
  'legacy verified JWT subject convention remains supported when current claims are absent');

select set_config('request.jwt.claim.sub', 'not-a-uuid', true);
select is(rts_private.current_actor(), null::uuid, 'malformed JWT subject cannot create an actor');

select throws_like(
  $$select rts_private.current_actor('00000000-0000-4000-8000-0000000000b2'::uuid)$$,
  '%function rts_private.current_actor(uuid) does not exist%',
  'callers cannot override actor identity through an SQL parameter'
);

reset role;
set local role authenticated;
select set_config('request.jwt.claims', '', true);
select set_config('request.jwt.claim.sub', '', true);
select throws_like(
  $$select rts_private.current_actor()$$,
  '%permission denied%',
  'authenticated callers cannot invoke the private resolver directly'
);
select throws_like(
  $$select * from rts_private.delete_journal_entry_with_dependencies('ffffffff-ffff-4fff-8fff-fffffffffff1')$$,
  '%authentication required%',
  'authenticated role without a JWT subject is rejected by privileged functions'
);

select set_config('request.jwt.claims', '{"sub":"not-a-uuid"}', true);
select throws_like(
  $$select * from rts_private.delete_journal_entry_with_dependencies('ffffffff-ffff-4fff-8fff-fffffffffff1')$$,
  '%authentication required%',
  'malformed JWT subject is rejected by privileged functions'
);

select * from finish();
rollback;
