import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

const root = path.resolve(import.meta.dirname, '../../..');

describe('authentication credential boundary', () => {
  it('keeps service-role credentials out of browser and request paths', async () => {
    const files = [
      'server/auth/browser-client.ts',
      'server/auth/server-client.ts',
      'server/auth/require-actor.ts',
      'server/auth/middleware.ts',
      'middleware.ts',
      'app/(auth)/sign-in/page.tsx',
      'app/(auth)/sign-up/page.tsx',
      'app/auth/callback/route.ts',
      'app/(app)/layout.tsx',
    ];
    const source = (await Promise.all(files.map(file => readFile(path.join(root, file), 'utf8')))).join('\n');

    expect(source).not.toMatch(/service[_-]?role/i);
    expect(source).not.toMatch(/SUPABASE_SERVICE_ROLE_KEY/);
  });
});
