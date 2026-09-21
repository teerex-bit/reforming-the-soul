import { afterAll, describe, expect, it } from 'vitest';
import { createTestPool } from '../helpers/db';
import { testActors } from '../helpers/auth';

const pool = createTestPool();
const privilegedFunctions = [
  'delete_journal_entry_with_dependencies',
  'grant_ai_context',
  'record_practice_return',
  'review_practice',
  'revoke_ai_context',
  'transition_practice',
];

afterAll(async () => {
  await pool.end();
});

describe('Task 3 privileged-owner preflight', () => {
  it('reports private SECURITY DEFINER ownership without Supabase auth-schema privileges', async () => {
    const result = await pool.query<{
      function_name: string;
      security_definer: boolean;
      owner_name: string;
      auth_schema_usage: boolean;
      direct_auth_uid_grant: boolean;
    }>(
      `select function_row.proname as function_name,
              function_row.prosecdef as security_definer,
              owner_role.rolname as owner_name,
              has_schema_privilege(owner_role.oid, 'auth', 'USAGE') as auth_schema_usage,
              exists (
                select 1
                from pg_proc auth_function
                join pg_namespace auth_namespace on auth_namespace.oid = auth_function.pronamespace
                cross join lateral aclexplode(coalesce(auth_function.proacl, acldefault('f', auth_function.proowner))) acl
                where auth_namespace.nspname = 'auth' and auth_function.proname = 'uid'
                  and acl.grantee = owner_role.oid and acl.privilege_type = 'EXECUTE'
              ) as direct_auth_uid_grant
       from pg_proc function_row
       join pg_namespace namespace on namespace.oid = function_row.pronamespace
       join pg_roles owner_role on owner_role.oid = function_row.proowner
       where namespace.nspname = 'rts_private'
         and function_row.proname = any($1::text[])
       order by function_row.proname`,
      [privilegedFunctions],
    );

    expect(result.rows).toEqual(privilegedFunctions.map(functionName => ({
      function_name: functionName,
      security_definer: true,
      owner_name: 'rts_privileged_owner',
      auth_schema_usage: false,
      direct_auth_uid_grant: false,
    })));
  });

  it('resolves verified JSON claims through an authenticated privileged call', async () => {
    const client = await pool.connect();
    try {
      await client.query('begin');
      await client.query('set local role authenticated');
      await client.query("select set_config('request.jwt.claims', $1, true)", [JSON.stringify({ sub: testActors.userA.id })]);
      const result = await client.query<{
        deleted_entry_id: string | null;
        dependent_artifact_count: number;
        dependent_record_count: number;
        dependent_link_count: number;
        grant_count: number;
      }>(
        `select *
         from rts_private.delete_journal_entry_with_dependencies(
           'ffffffff-ffff-4fff-8fff-fffffffffff1'::uuid
         )`,
      );
      expect(result.rows).toEqual([{
        deleted_entry_id: null,
        dependent_artifact_count: 0,
        dependent_record_count: 0,
        dependent_link_count: 0,
        grant_count: 0,
      }]);
    } finally {
      await client.query('rollback');
      client.release();
    }
  });
});
