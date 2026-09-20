import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const html = await readFile(join(here, 'index.html'), 'utf8');
const css = await readFile(join(here, 'lesson-2.css'), 'utf8');

assert.match(html, /<title>Seeing God Clearly \| Reforming the Soul<\/title>/);
assert.match(html, /data-page-status="working-draft"/);
assert.match(html, /See Yourself Clearly/);
assert.match(html, /See God Clearly/);
assert.match(html, /class="movement-card is-current"[\s\S]*See God Clearly/);
assert.match(html, /Looking again through Jesus/);
assert.match(html, /Father, not taskmaster/);
assert.match(html, /John 17:3/);
assert.match(html, /href="\/see-clearly\/"/);
assert.doesNotMatch(html, />Walk</);
assert.match(html, /href="\.\/lesson-2\.css"/);
assert.match(css, /@media \(max-width: 720px\)/);

console.log('See Clearly lesson 2 route is structurally ready.');
