begin;
select plan(4);

select has_role('anon', 'local Supabase exposes the anonymous role');
select has_role('authenticated', 'local Supabase exposes the authenticated role');
select has_schema('auth', 'local Supabase exposes the auth schema');
select has_function('auth', 'uid', array[]::text[], 'local Supabase exposes auth.uid() for real JWT-role RLS tests');

select * from finish();
rollback;
