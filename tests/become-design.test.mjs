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
  assert.match(html, /become\.css\?v=9[12]/, `${name} uses the redesigned shared stylesheet`);
  assert.match(html, /class="growth-motif/, `${name} carries the Become growth motif`);
  assert.match(html, /context-nav/, `${name} retains breadcrumb navigation`);
  assert.match(html, /rts-tree-wordmark/, `${name} retains the Tree of Life wordmark`);
}

assert.match(pages.intro, /become-ordinary-life-hero-v2\.jpg/, 'intro uses the younger-woman hero');
assert.ok(existsSync(new URL('public/assets/page-become/become-ordinary-life-hero-v2.jpg', root)), 'new hero exists');
assert.match(pages.intro, /Live With God<sup[^>]*>\*<\/sup>/, 'intro marks Live With God preview');
assert.match(pages.intro, /The Whole Person<sup[^>]*>\*<\/sup>/, 'intro marks Whole Person preview');
assert.equal((pages.intro.match(/Explored more fully in the deeper-dive curriculum\./g) || []).length, 1, 'intro has one shared curriculum note');

assert.match(pages.live, /Formation happens in<br>the life you are already<br>living\./, 'live hero has intentional line breaks');
assert.match(pages.live, /growth-motif--rhythm/, 'live page uses four-point rhythm motif');
assert.match(pages.practice, /growth-motif--practice/, 'practice page uses strengthened repeating motif');
assert.match(pages.whole, /growth-motif--branches/, 'whole-person page uses branching motif');
assert.match(pages.fruit, /What a changed<br>person looks like\./, 'fruit hero has intentional line breaks');
assert.match(pages.fruit, /hero--fruit/, 'fruit has a distinct culmination hero');
assert.match(pages.fruit, /fruit-stage/, 'fruit uses the redesigned editorial culmination layout');
assert.match(pages.fruit, /growth-motif--fruit/, 'fruit motif resolves into leaf forms');

const css = read('public/become/become.css');
assert.match(css, /\.hero--become-intro \.growth-motif--seed\{display:none\}/, 'intro photograph is unobstructed');
assert.match(css, /\.section\.light \.section-head\{align-items:center\}/, 'intro explanation is vertically centered');
assert.match(css, /\.reflection-slab__ring\{display:none!important\}/, 'practice quote has no decorative rings');
assert.match(css, /\.growth-motif/, 'shared CSS styles the growth motif');
assert.match(css, /\.curriculum-note/, 'shared CSS styles the curriculum note');
assert.match(css, /\.hero--fruit/, 'shared CSS styles the fruit culmination hero');
assert.match(css, /@media\(max-width:680px\)/, 'mobile treatment remains defined');

console.log('Become design assertions passed.');
