import { readFileSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { validateTestEnvironment } from './verify-test-environment.mjs';

const project = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

if (process.argv.length > 2) {
  process.stderr.write('The local database test runner does not accept command-line arguments.\n');
  process.exit(2);
}

const errors = validateTestEnvironment(process.env);
const config = readFileSync(path.join(project, 'supabase', 'config.toml'), 'utf8');
if (!/^project_id = "rts-phase1-prototype"$/m.test(config)) {
  errors.push('supabase/config.toml must identify project_id rts-phase1-prototype.');
}
if (errors.length) {
  process.stderr.write(`Unsafe or incomplete local database test environment:\n- ${errors.join('\n- ')}\n`);
  process.exit(1);
}

const executable = process.platform === 'win32' ? 'supabase.cmd' : 'supabase';
for (const args of [
  ['test', 'db', '--local', '--workdir', project],
  ['test', 'db', '--local', '--workdir', project, 'scripts/hosted-review-verification.sql'],
]) {
  const result = spawnSync(executable, args, {
    cwd: project,
    env: process.env,
    stdio: 'inherit',
    shell: false,
  });
  if (result.error) {
    process.stderr.write(`${result.error.message}\n`);
    process.exit(1);
  }
  if (result.status !== 0) process.exit(result.status ?? 1);
}
