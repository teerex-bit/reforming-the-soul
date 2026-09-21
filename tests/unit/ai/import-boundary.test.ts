import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

function sourceFiles(directory = '.'): string[] {
  const ignored = new Set(['.git', '.next', '.vinext', 'dist', 'node_modules']);
  return readdirSync(directory, { withFileTypes: true }).flatMap(entry => {
    const path = join(directory, entry.name);
    if (entry.isDirectory()) return ignored.has(entry.name) ? [] : sourceFiles(path);
    return /\.tsx?$/.test(entry.name) ? [path] : [];
  });
}

describe('OpenAI server boundary', () => {
  it('keeps OpenAI SDK/API imports below server/ai', () => {
    const files = sourceFiles().filter(file => /from ['"]openai['"]|api\.openai\.com/.test(readFileSync(file, 'utf8')));
    const production = files.filter(file => !file.startsWith('tests/'));
    expect(production.every(file => file.startsWith('server/ai/'))).toBe(true);
    for (const file of production) expect(readFileSync(file, 'utf8')).not.toMatch(/['\"]use client['\"]/);
  });
});
