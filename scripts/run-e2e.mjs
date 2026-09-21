import { spawnSync } from 'node:child_process';
import { validateTestEnvironment } from './verify-test-environment.mjs';

export function createPlaywrightEnvironment(env) {
  return {
    ...env,
    RTS_DATABASE_URL: env.TEST_DATABASE_URL,
    DATABASE_URL: env.TEST_DATABASE_URL,
    NEXT_PUBLIC_SUPABASE_URL: env.SUPABASE_URL,
    NEXT_PUBLIC_SUPABASE_ANON_KEY: env.SUPABASE_ANON_KEY,
    NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: env.SUPABASE_ANON_KEY,
  };
}

if (process.argv[1] && new URL(`file://${process.argv[1]}`).pathname === new URL(import.meta.url).pathname) {
  const errors = validateTestEnvironment(process.env);
  if (errors.length) {
    process.stderr.write(`Unsafe or incomplete test environment:\n- ${errors.join('\n- ')}\n`);
    process.exit(1);
  }

  const executable = process.platform === 'win32' ? 'playwright.cmd' : 'playwright';
  const result = spawnSync(executable, ['test'], {
    cwd: process.cwd(),
    env: createPlaywrightEnvironment(process.env),
    stdio: 'inherit',
    shell: false,
  });
  if (result.error) process.stderr.write(`${result.error.message}\n`);
  process.exit(result.status ?? 1);
}
