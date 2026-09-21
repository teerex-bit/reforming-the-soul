begin;
select plan(10);

select has_role('anon', 'local Supabase exposes the anonymous role');
select has_role('authenticated', 'local Supabase exposes the authenticated role');
select has_schema('auth', 'local Supabase exposes the auth schema');
select has_function('auth', 'uid', array[]::text[], 'local Supabase exposes auth.uid() for real JWT-role RLS tests');

create table public.__rts_harness_rls_probe (
  id uuid primary key,
  owner_id uuid not null,
  note text not null
);
alter table public.__rts_harness_rls_probe enable row level security;
grant select, insert on public.__rts_harness_rls_probe to authenticated;
grant select on public.__rts_harness_rls_probe to anon;
create policy harness_owner_isolation on public.__rts_harness_rls_probe
  for all to authenticated
  using ((select auth.uid()) = owner_id)
  with check ((select auth.uid()) = owner_id);

insert into public.__rts_harness_rls_probe (id, owner_id, note) values
  ('10000000-0000-4000-8000-000000000001', '00000000-0000-4000-8000-000000000001', 'user-a'),
  ('10000000-0000-4000-8000-000000000002', '00000000-0000-4000-8000-000000000002', 'user-b');

set local role authenticated;
select set_config('request.jwt.claim.sub', '00000000-0000-4000-8000-000000000001', true);
select is(current_user, 'authenticated', 'RLS probe executes as the authenticated role');
select is(auth.uid()::text, '00000000-0000-4000-8000-000000000001', 'auth.uid reads User A from the JWT subject');
select is((select count(*)::integer from public.__rts_harness_rls_probe), 1, 'User A sees only its own row');
select throws_ok(
  $$insert into public.__rts_harness_rls_probe (id, owner_id, note) values ('10000000-0000-4000-8000-000000000003', '00000000-0000-4000-8000-000000000002', 'cross-owner')$$,
  '42501',
  'new row violates row-level security policy for table "__rts_harness_rls_probe"',
  'User A cannot insert a row owned by User B'
);

select set_config('request.jwt.claim.sub', '00000000-0000-4000-8000-000000000002', true);
select is((select note from public.__rts_harness_rls_probe), 'user-b', 'User B sees only its own row');

set local role anon;
select set_config('request.jwt.claim.sub', '', true);
select is((select count(*)::integer from public.__rts_harness_rls_probe), 0, 'anonymous access sees no protected rows');

select * from finish();
rollback;
