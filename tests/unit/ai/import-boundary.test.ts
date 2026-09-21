import { readFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { describe, expect, it } from 'vitest';

describe('OpenAI server boundary', () => {
  it('keeps OpenAI SDK/API imports below server/ai', () => {
    const files = execFileSync('rg', ['-l', "from ['\"]openai['\"]|api.openai.com", '--glob', '*.{ts,tsx}', '.'], { encoding: 'utf8' })
      .trim().split('\n').filter(Boolean);
    const production = files.filter(file => !file.startsWith('./tests/'));
    expect(production.every(file => file.startsWith('./server/ai/'))).toBe(true);
    for (const file of production) expect(readFileSync(file, 'utf8')).not.toMatch(/['\"]use client['\"]/);
  });
});
