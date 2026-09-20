import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';

const root = new URL('../', import.meta.url);
const read = path => readFileSync(new URL(path, root), 'utf8');
const pages = {
  intro: read('public/become/index.html'),
  live: read('public/become/live-with-god/index.html'),
  practice: read('public/become/practice-forms-the-person/index.html'),
  whole: read('public/become/whole-person/index.html'),
  fruit: read('public/become/fruit/index.html'),
};

for (const [name, html] of Object.entries(pages)) {
  assert.match(html, /become\.css\?v=9[1-6]/, `${name} uses the redesigned shared stylesheet`);
  assert.match(html, /context-nav/, `${name} retains breadcrumb navigation`);
  assert.match(html, /rts-tree-wordmark/, `${name} retains the Tree of Life wordmark`);
}

assert.match(pages.intro, /become-ordinary-life-hero-v2\.jpg/, 'intro uses the younger-woman hero');
assert.ok(existsSync(new URL('public/assets/page-become/become-ordinary-life-hero-v2.jpg', root)), 'new hero exists');
assert.match(pages.intro, /Live With God<sup[^>]*>\*<\/sup>/, 'intro marks Live With God preview');
assert.match(pages.intro, /The Whole Person<sup[^>]*>\*<\/sup>/, 'intro marks Whole Person preview');
assert.equal((pages.intro.match(/Explored more fully in the deeper-dive curriculum\./g) || []).length, 1, 'intro has one shared curriculum note');

assert.match(pages.live, /Formation happens in<br>\s*the life you are already<br>\s*living\./, 'live hero has intentional line breaks');
assert.match(pages.live, /growth-motif--rhythm/, 'live page uses four-point rhythm motif');
assert.match(pages.practice, /growth-motif--practice/, 'practice page uses strengthened repeating motif');
assert.match(pages.whole, /class="whole-hero"/, 'whole-person opens with a distinct editorial hero');
assert.match(pages.whole, /class="dimension-ledger"/, 'whole-person uses an editorial dimension ledger');
assert.equal((pages.whole.match(/class="dimension-row"/g) || []).length, 4, 'whole-person presents four connected dimensions');
assert.match(pages.whole, /class="whole-integration"/, 'whole-person concludes with an integration section');
assert.match(pages.fruit, /What a changed<br>person looks like\./, 'fruit hero has intentional line breaks');
assert.match(pages.fruit, /class="fruit-hero-new"/, 'fruit has a distinct culmination hero');
assert.match(pages.fruit, /class="fruit-field"/, 'fruit uses an open six-part editorial field');
assert.equal((pages.fruit.match(/<article><span>0[1-6]<\/span>/g) || []).length, 6, 'fruit presents six visible expressions of formation');
assert.match(pages.fruit, /class="fruit-closing"/, 'fruit resolves maturity and the Join handoff together');

const css = read('public/become/become.css');
assert.match(css, /\.hero--become-intro \.growth-motif--seed\{display:none\}/, 'intro photograph is unobstructed');
assert.match(css, /\.section\.light \.section-head\{align-items:center\}/, 'intro explanation is vertically centered');
assert.match(css, /\.reflection-slab__ring\{display:none!important\}/, 'practice quote has no decorative rings');
assert.match(css, /\.whole-hero\{/, 'whole-person has a dedicated editorial hero');
assert.match(css, /\.dimension-row\{/, 'whole-person dimensions use full-width editorial rows');
assert.match(css, /\.whole-integration\{/, 'whole-person has a dedicated integration treatment');
assert.match(css, /\.growth-motif/, 'shared CSS styles the growth motif');
assert.match(css, /\.curriculum-note/, 'shared CSS styles the curriculum note');
assert.match(css, /\.fruit-hero-new\{/, 'fruit has a dedicated culmination hero');
assert.match(css, /\.fruit-field\{/, 'fruit has a dedicated open fruit field');
assert.match(css, /\.fruit-closing\{/, 'fruit has a unified closing treatment');
assert.match(css, /@media\(max-width:680px\)/, 'mobile treatment remains defined');

console.log('Become design assertions passed.');
