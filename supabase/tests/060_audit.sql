begin;
select plan(29);

insert into auth.users (id, instance_id, aud, role, email, encrypted_password, email_confirmed_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at)
values
  ('00000000-0000-4000-8000-0000000000a1', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'grant-a@example.test', '', now(), '{}', '{}', now(), now()),
  ('00000000-0000-4000-8000-0000000000b2', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'grant-b@example.test', '', now(), '{}', '{}', now(), now());
insert into public.journal_entries (id, user_id, curriculum_version_id, node_id, entry_kind, body) values
  ('a1000000-0000-4000-8000-0000000000a1', '00000000-0000-4000-8000-0000000000a1', 'phase-1-v1', 'awaken.pay-attention.observe', 'event', 'grant A'),
  ('a1000000-0000-4000-8000-0000000000b2', '00000000-0000-4000-8000-0000000000b2', 'phase-1-v1', 'awaken.pay-attention.observe', 'event', 'grant B');

select is(
  (select count(*)::integer from pg_proc p join pg_namespace n on n.oid = p.pronamespace
   where n.nspname = 'rts_private' and p.proname in (
     'transition_practice', 'record_practice_return', 'review_practice',
     'grant_ai_context', 'revoke_ai_context', 'delete_journal_entry_with_dependencies'
   ) and p.prosecdef),
  6, 'all privileged functions are SECURITY DEFINER'
);
select ok(
  not exists (
    select 1 from pg_proc p join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'rts_private' and p.proname in (
      'transition_practice', 'record_practice_return', 'review_practice',
      'grant_ai_context', 'revoke_ai_context', 'delete_journal_entry_with_dependencies'
    ) and not ('search_path=pg_catalog' = any(coalesce(p.proconfig, array[]::text[])))
  ), 'privileged functions pin a safe search_path'
);
select ok(
  not exists (
    select 1 from pg_proc p join pg_namespace n on n.oid = p.pronamespace join pg_roles r on r.oid = p.proowner
    where n.nspname = 'rts_private' and p.proname in (
      'transition_practice', 'record_practice_return', 'review_practice',
      'grant_ai_context', 'revoke_ai_context', 'delete_journal_entry_with_dependencies'
    ) and r.rolcanlogin
  ), 'privileged functions are owned by a non-login role'
);
select is(
  (select count(*)::integer
   from pg_proc function_row
   join pg_namespace namespace on namespace.oid = function_row.pronamespace
   join pg_roles owner_role on owner_role.oid = function_row.proowner
   where namespace.nspname = 'rts_private'
     and function_row.proname in (
       'transition_practice', 'record_practice_return', 'review_practice',
       'grant_ai_context', 'revoke_ai_context', 'delete_journal_entry_with_dependencies'
     )
     and owner_role.rolname = 'rts_privileged_owner'),
  6, 'all privileged functions are owned specifically by rts_privileged_owner'
);
select ok(
  not exists (
    select 1
    from pg_auth_members membership
    join pg_roles granted_role on granted_role.oid = membership.roleid
    where granted_role.rolname = 'rts_privileged_owner'
  ),
  'temporary ownership-transfer membership is fully revoked after migration'
);
select ok(
  not has_schema_privilege('rts_privileged_owner', 'auth', 'usage'),
  'privileged function owner does not depend on the Supabase auth schema'
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
  'privileged function owner has no custom auth.uid execution grant'
);
select ok(
  not exists (
    select 1
    from pg_class relation
    join pg_namespace namespace on namespace.oid = relation.relnamespace
    where namespace.nspname = 'auth'
      and relation.relkind in ('r', 'p', 'v', 'm', 'f')
      and has_table_privilege(
        'rts_privileged_owner',
        relation.oid,
        'SELECT,INSERT,UPDATE,DELETE,TRUNCATE,REFERENCES,TRIGGER'
      )
  ),
  'privileged function owner has no effective auth relation privileges through direct, PUBLIC, or inherited ACLs'
);
select ok(
  not exists (
    select 1
    from pg_proc p
    join pg_namespace n on n.oid = p.pronamespace
    cross join lateral aclexplode(coalesce(p.proacl, acldefault('f', p.proowner))) acl
    where n.nspname = 'rts_private' and p.proname in (
      'transition_practice', 'record_practice_return', 'review_practice',
      'grant_ai_context', 'revoke_ai_context', 'delete_journal_entry_with_dependencies'
    ) and acl.grantee = 0 and acl.privilege_type = 'EXECUTE'
  ), 'PUBLIC cannot execute privileged functions'
);
select ok(
  not exists (
    select 1 from pg_proc p join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'rts_private' and p.proname in (
      'transition_practice', 'record_practice_return', 'review_practice',
      'grant_ai_context', 'revoke_ai_context', 'delete_journal_entry_with_dependencies'
    ) and has_function_privilege('anon', p.oid, 'execute')
  ), 'anonymous users cannot execute privileged functions'
);
select is(
  (select count(*)::integer from information_schema.role_routine_grants
   where specific_schema = 'rts_private' and grantee = 'authenticated' and privilege_type = 'EXECUTE'
     and routine_name in ('transition_practice', 'record_practice_return', 'review_practice', 'grant_ai_context', 'revoke_ai_context', 'delete_journal_entry_with_dependencies')),
  6, 'authenticated users can execute exactly the approved privileged functions'
);
select ok(not has_table_privilege('authenticated', 'public.audit_events', 'insert'), 'authenticated cannot insert audit events');
select ok(not has_table_privilege('authenticated', 'public.audit_events', 'update'), 'authenticated cannot update audit events');
select ok(not has_table_privilege('authenticated', 'public.audit_events', 'delete'), 'authenticated cannot delete audit events');
select ok(not has_table_privilege('authenticated', 'public.practice_returns', 'insert'), 'returns can only be created atomically by functions');
select ok(not has_table_privilege('authenticated', 'public.ai_context_grants', 'insert'), 'grants can only be created by functions');
select ok(not has_table_privilege('authenticated', 'public.ai_context_grants', 'update'), 'grant revocation can only occur through its function');
select ok(
  not exists (
    select 1 from information_schema.columns where table_schema = 'public' and table_name = 'audit_events'
      and data_type in ('text', 'json', 'jsonb') and column_name not in ('event_type', 'object_type')
  ), 'audit events have no free-form text or JSON payload'
);

set local role authenticated;
select set_config('request.jwt.claim.sub', '', true);
select set_config('request.jwt.claims', '{"sub":"00000000-0000-4000-8000-0000000000a1"}', true);
select lives_ok(
  $test$
  do $body$
  begin
    begin
      perform rts_private.transition_practice('ffffffff-ffff-4fff-8fff-fffffffffff1', 'draft', 0, 'open');
      raise exception 'transition_practice unexpectedly found a row';
    exception when no_data_found then null;
    end;
    begin
      perform rts_private.record_practice_return('ffffffff-ffff-4fff-8fff-fffffffffff2', 0, 'test');
      raise exception 'record_practice_return unexpectedly found a row';
    exception when no_data_found then null;
    end;
    begin
      perform rts_private.review_practice('ffffffff-ffff-4fff-8fff-fffffffffff3', 0, 'test');
      raise exception 'review_practice unexpectedly found a row';
    exception when no_data_found then null;
    end;
    begin
      perform rts_private.grant_ai_context('ffffffff-ffff-4fff-8fff-fffffffffff4', 'single_entry_reflect');
      raise exception 'grant_ai_context unexpectedly found a row';
    exception when no_data_found then null;
    end;
    begin
      perform rts_private.revoke_ai_context('ffffffff-ffff-4fff-8fff-fffffffffff5', 1);
      raise exception 'revoke_ai_context unexpectedly found a row';
    exception when no_data_found then null;
    end;
    perform rts_private.delete_journal_entry_with_dependencies('ffffffff-ffff-4fff-8fff-fffffffffff6');
  end
  $body$
  $test$,
  'every privileged function resolves the verified JWT actor under authenticated invocation'
);
select is(
  (select revision from rts_private.grant_ai_context('a1000000-0000-4000-8000-0000000000a1', 'single_entry_reflect')),
  1, 'explicit grant begins at revision one'
);
select is(
  (select count(distinct grant_id)::integer from (
    select grant_id from rts_private.grant_ai_context('a1000000-0000-4000-8000-0000000000a1', 'single_entry_reflect')
    union all
    select grant_id from rts_private.grant_ai_context('a1000000-0000-4000-8000-0000000000a1', 'single_entry_reflect')
  ) grants),
  1, 'repeated grant attempts return the same active grant identity'
);
select throws_like(
  $$select * from rts_private.revoke_ai_context(
    (select id from public.ai_context_grants where journal_entry_id = 'a1000000-0000-4000-8000-0000000000a1' and revoked_at is null), null
  )$$,
  '%expected AI context grant revision is required%', 'null revision cannot bypass grant optimistic locking'
);
select throws_like(
  $$select * from rts_private.grant_ai_context('a1000000-0000-4000-8000-0000000000b2', 'single_entry_reflect')$$,
  '%journal entry not found%', 'User A cannot grant access to User B journal'
);
select is(
  (select revision from rts_private.revoke_ai_context(
    (select id from public.ai_context_grants where journal_entry_id = 'a1000000-0000-4000-8000-0000000000a1' and revoked_at is null), 1
  )),
  2, 'revocation increments the locked grant revision'
);
select throws_like(
  $$select * from rts_private.revoke_ai_context(
    (select id from public.ai_context_grants where journal_entry_id = 'a1000000-0000-4000-8000-0000000000a1'), 1
  )$$,
  '%stale AI context grant revision%', 'stale grant revocation is rejected'
);
select is(
  (select revision from rts_private.grant_ai_context('a1000000-0000-4000-8000-0000000000a1', 'single_entry_reflect')),
  1, 're-grant creates a new identity at revision one'
);
select is((select count(*)::integer from public.ai_context_grants where journal_entry_id = 'a1000000-0000-4000-8000-0000000000a1'), 2,
  'revoked grant history remains alongside the new active grant');
select is((select count(*)::integer from public.ai_context_grants where journal_entry_id = 'a1000000-0000-4000-8000-0000000000a1' and revoked_at is null), 1,
  'only one active grant exists per entry and scope');

set local role anon;
select set_config('request.jwt.claims', '', true);
select set_config('request.jwt.claim.sub', '', true);
select throws_like(
  $$select * from rts_private.delete_journal_entry_with_dependencies('a1000000-0000-4000-8000-0000000000a1')$$,
  '%permission denied%', 'anonymous callers cannot execute privileged deletion'
);

select * from finish();
rollback;
