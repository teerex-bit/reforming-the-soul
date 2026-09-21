begin;
select plan(20);

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
  not exists (
    select 1
    from pg_namespace namespace
    join pg_roles privileged_owner on privileged_owner.rolname = 'rts_privileged_owner'
    cross join lateral aclexplode(coalesce(namespace.nspacl, '{}'::aclitem[])) acl
    where namespace.nspname = 'rts_private'
      and acl.grantee = privileged_owner.oid
      and acl.privilege_type = 'CREATE'
  ),
  'no externally granted schema CREATE ACL remains after ownership transfer'
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

insert into auth.users (id, instance_id, aud, role, email, encrypted_password, email_confirmed_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at)
values
  ('00000000-0000-4000-8000-0000000000a1', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'resolver-a@example.test', '', now(), '{}', '{}', now(), now()),
  ('00000000-0000-4000-8000-0000000000b2', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'resolver-b@example.test', '', now(), '{}', '{}', now(), now());
insert into public.journal_entries (id, user_id, curriculum_version_id, node_id, entry_kind, body) values
  ('b1000000-0000-4000-8000-0000000000a1', '00000000-0000-4000-8000-0000000000a1', 'phase-1-v1', 'awaken.pay-attention.observe', 'event', 'resolver A'),
  ('b1000000-0000-4000-8000-0000000000b2', '00000000-0000-4000-8000-0000000000b2', 'phase-1-v1', 'awaken.pay-attention.observe', 'event', 'resolver B');

set local role authenticated;
select set_config('request.jwt.claim.sub', '', true);
select set_config('request.jwt.claims', '{"sub":"00000000-0000-4000-8000-0000000000a1"}', true);
select is(
  (select revision from rts_private.grant_ai_context('b1000000-0000-4000-8000-0000000000a1', 'single_entry_reflect')),
  1,
  'verified JSON claims let User A operate only as User A'
);
select throws_ok(
  $$select * from rts_private.grant_ai_context('b1000000-0000-4000-8000-0000000000b2', 'single_entry_reflect')$$,
  'P0002', 'journal entry not found',
  'verified JSON claims do not let User A operate as User B'
);

select set_config('request.jwt.claims', '{"sub":"00000000-0000-4000-8000-0000000000b2"}', true);
select is(
  (select revision from rts_private.grant_ai_context('b1000000-0000-4000-8000-0000000000b2', 'single_entry_reflect')),
  1,
  'verified JSON claims let User B operate only as User B'
);
select throws_ok(
  $$select * from rts_private.grant_ai_context('b1000000-0000-4000-8000-0000000000a1', 'single_entry_reflect')$$,
  'P0002', 'journal entry not found',
  'verified JSON claims do not let User B operate as User A'
);

select set_config('request.jwt.claims', '', true);
select set_config('request.jwt.claim.sub', '', true);
select throws_ok(
  $$select * from rts_private.delete_journal_entry_with_dependencies('ffffffff-ffff-4fff-8fff-fffffffffff1')$$,
  '42501', 'authentication required',
  'missing JWT subject is rejected by privileged functions'
);

select set_config('request.jwt.claim.sub', '00000000-0000-4000-8000-0000000000a1', true);
select set_config('request.jwt.claims', '{malformed', true);
select throws_ok(
  $$select * from rts_private.delete_journal_entry_with_dependencies('ffffffff-ffff-4fff-8fff-fffffffffff1')$$,
  '42501', 'authentication required',
  'malformed current claims cannot fall back to a legacy subject'
);

select set_config('request.jwt.claims', '{}', true);
select throws_ok(
  $$select * from rts_private.delete_journal_entry_with_dependencies('ffffffff-ffff-4fff-8fff-fffffffffff1')$$,
  '42501', 'authentication required',
  'current claims missing sub cannot fall back to a legacy subject'
);

select set_config('request.jwt.claims', '', true);
select is(
  (select revision from rts_private.grant_ai_context('b1000000-0000-4000-8000-0000000000a1', 'single_entry_reflect')),
  1,
  'legacy verified JWT subject remains supported when current claims are absent'
);

select set_config('request.jwt.claim.sub', 'not-a-uuid', true);
select throws_ok(
  $$select * from rts_private.delete_journal_entry_with_dependencies('ffffffff-ffff-4fff-8fff-fffffffffff1')$$,
  '42501', 'authentication required',
  'malformed JWT subject cannot create an authenticated actor'
);

select throws_matching(
  $$select rts_private.current_actor('00000000-0000-4000-8000-0000000000b2'::uuid)$$,
  '.*function rts_private.current_actor\(uuid\) does not exist.*',
  'callers cannot override actor identity through an SQL parameter'
);

select throws_matching(
  $$select rts_private.current_actor()$$,
  '.*permission denied.*',
  'authenticated callers cannot invoke the private resolver directly'
);

select * from finish();
rollback;
