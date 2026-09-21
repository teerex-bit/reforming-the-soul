import { describe, expect, it } from 'vitest';
import { assertLocalE2eEnvironment } from '../../helpers/local-e2e';

const localEnvironment = {
  RTS_TEST_MODE: '1',
  SUPABASE_PROJECT_ID: 'rts-phase1-prototype',
  SUPABASE_URL: 'http://127.0.0.1:54321',
  SUPABASE_ANON_KEY: 'local-anon-key',
  TEST_DATABASE_URL: 'postgresql://postgres:postgres@127.0.0.1:54322/postgres',
  AI_TEST_ADAPTER: 'fake',
};

describe('local E2E environment guard', () => {
  it('rejects an unsafe environment before destructive account cleanup', () => {
    expect(() => assertLocalE2eEnvironment({ ...localEnvironment, TEST_DATABASE_URL: 'postgresql://postgres@db.example.com/postgres' }))
      .toThrow('TEST_DATABASE_URL');
  });

  it('accepts the designated local environment', () => {
    expect(() => assertLocalE2eEnvironment(localEnvironment)).not.toThrow();
  });
});
