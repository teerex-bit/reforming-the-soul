import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const project = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const config = readFileSync(path.join(project, 'playwright.config.ts'), 'utf8');
const authSpec = readFileSync(path.join(project, 'tests/e2e/auth.spec.ts'), 'utf8');

test('Playwright keeps the Overview preview and authenticated app runtime on separate authorities', () => {
  assert.match(config, /baseURL:\s*'http:\/\/127\.0\.0\.1:4186'/);
  assert.match(config, /webServer:\s*\[/);
  assert.match(config, /command:\s*'npm run preview'/);
  assert.match(config, /url:\s*'http:\/\/127\.0\.0\.1:4186\/overview\/'/);
  assert.match(config, /command:\s*'npm run build && npm run start -- --port 4187'/);
  assert.match(config, /url:\s*'http:\/\/127\.0\.0\.1:4187\/sign-in'/);
  assert.match(config, /name:\s*'mobile-375'/);
  assert.match(config, /name:\s*'tablet-768'/);
  assert.match(config, /name:\s*'desktop-1536'/);
  assert.match(authSpec, /appRuntimeUrl\('\/dashboard'\)/);
  assert.doesNotMatch(authSpec, /page\.goto\('\/dashboard'\)/);
});
