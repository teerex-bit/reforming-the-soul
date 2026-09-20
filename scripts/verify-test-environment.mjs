function parseUrl(name, value, errors) {
  if (!value) {
    errors.push(`${name} is required.`);
    return null;
  }
  try {
    return new URL(value);
  } catch {
    errors.push(`${name} must be a valid URL.`);
    return null;
  }
}

export function validateTestEnvironment(env) {
  const errors = [];
  const supabaseUrl = parseUrl('SUPABASE_URL', env.SUPABASE_URL, errors);
  const databaseUrl = parseUrl('TEST_DATABASE_URL', env.TEST_DATABASE_URL, errors);

  if (!env.SUPABASE_ANON_KEY) errors.push('SUPABASE_ANON_KEY is required.');
  if (env.RTS_TEST_MODE !== '1') errors.push('RTS_TEST_MODE=1 is required for destructive test commands.');
  if (env.SUPABASE_PROJECT_ID !== 'rts-phase1-prototype') {
    errors.push('SUPABASE_PROJECT_ID=rts-phase1-prototype is required.');
  }
  if (env.AI_TEST_ADAPTER !== 'fake') errors.push('AI_TEST_ADAPTER=fake is required for automated tests.');
  if (env.OPENAI_API_KEY) errors.push('OPENAI_API_KEY must be unset during ordinary automated tests.');

  if (supabaseUrl && supabaseUrl.origin !== 'http://127.0.0.1:54321') {
    errors.push('SUPABASE_URL must use the designated local endpoint http://127.0.0.1:54321.');
  }
  if (databaseUrl) {
    if (!['postgres:', 'postgresql:'].includes(databaseUrl.protocol)) {
      errors.push('TEST_DATABASE_URL must use PostgreSQL.');
    }
    if (databaseUrl.search) {
      errors.push('TEST_DATABASE_URL connection-string query parameters are prohibited.');
    }
    if (databaseUrl.hostname !== '127.0.0.1' || databaseUrl.port !== '54322' || databaseUrl.pathname !== '/postgres') {
      errors.push('TEST_DATABASE_URL must use designated local PostgreSQL at 127.0.0.1:54322/postgres.');
    }
  }

  return errors;
}

if (process.argv[1] && new URL(`file://${process.argv[1]}`).pathname === new URL(import.meta.url).pathname) {
  const errors = validateTestEnvironment(process.env);
  if (errors.length) {
    process.stderr.write(`Unsafe or incomplete test environment:\n- ${errors.join('\n- ')}\n`);
    process.exitCode = 1;
  } else {
    process.stdout.write('Test environment boundaries verified.\n');
  }
}
