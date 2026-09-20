import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';

const root = new URL('../', import.meta.url);
const read = path => readFileSync(new URL(path, root), 'utf8');

assert.ok(existsSync(new URL('public/join/index.html', root)), 'Join introduction route exists');
assert.ok(existsSync(new URL('public/join/useful/index.html', root)), 'Join conclusion route exists');
assert.ok(existsSync(new URL('public/join/join.css', root)), 'Join has a focused stylesheet');

const intro = read('public/join/index.html');
const useful = read('public/join/useful/index.html');

for (const [name, html] of Object.entries({ intro, useful })) {
  assert.match(html, /rts-tree-wordmark/, `${name} uses the Tree of Life wordmark`);
  assert.match(html, /overview-context-nav\.css\?v=1/, `${name} uses shared breadcrumb styling`);
  assert.match(html, /class="context-nav"/, `${name} has breadcrumb navigation`);
  assert.match(html, /join\.css\?v=1/, `${name} uses the Join stylesheet`);
}

assert.match(intro, /A restored life becomes available\./, 'Join opens with the approved premise');
assert.match(intro, /Notice where God is already at work\./, 'Join introduces attention to God’s work');
assert.match(intro, /Offer the person you are becoming\./, 'Join introduces availability');
assert.equal((intro.match(/class="join-preview"/g) || []).length, 2, 'Join has two teaching previews');
const previews = [...intro.matchAll(/<article class="join-preview">([\s\S]*?)<\/article>/g)];
assert.equal(previews.length, 2, 'Join has two complete teaching preview articles');
for (const [, preview] of previews) {
  assert.doesNotMatch(preview, /<a\b/, 'teaching previews are not menu links');
}
assert.equal((intro.match(/Explored more fully in the deeper-dive curriculum\./g) || []).length, 1, 'Join has one curriculum note');
assert.ok(intro.indexOf('class="join-preview"') < intro.indexOf('class="join-transition"'), 'Join previews precede the conclusion transition');
assert.match(intro, /href="\/join\/useful\/"/, 'Join introduction advances to the conclusion');

assert.match(useful, /God restored your soul to be useful\./, 'conclusion carries the central statement');
assert.match(useful, /Ephesians 2:10/, 'conclusion includes the biblical anchor');
assert.match(useful, /href="\/join\/"/, 'conclusion returns to Join');
assert.match(useful, /href="\/"/, 'conclusion returns to the Formation Journey doorway');

const css = read('public/join/join.css');
assert.ok(existsSync(new URL('public/assets/page-join/join-community-hero.jpg', root)), 'communal hero asset exists');
assert.match(intro, /join-community-hero\.jpg\?v=1/, 'Join uses the communal hero asset');
assert.match(intro, /alt="Friends of different generations gathered in conversation around a campfire"/, 'hero has meaningful alt text');
assert.match(css, /\.join-hero\{/, 'Join has a dedicated hero composition');
assert.match(css, /\.join-invitation\{/, 'Join has a continuous invitation section');
assert.match(css, /\.useful-hero\{/, 'conclusion has a dedicated typographic hero');
assert.match(css, /@media\(max-width:760px\)/, 'Join has a mobile breakpoint');
assert.match(css, /min-height:44px/, 'interactive controls retain touch height');
assert.match(css, /overflow-wrap:break-word/, 'long text cannot force horizontal overflow');

const tabletStyles = css.split('@media(max-width:960px){')[1]?.split('@media(max-width:760px){')[0];
const mobileStyles = css.split('@media(max-width:760px){')[1]?.split('@media(prefers-reduced-motion:reduce)')[0];
assert.ok(tabletStyles, 'Join has a tablet adjustment range');
assert.ok(mobileStyles, 'Join has a mobile adjustment range');
assert.doesNotMatch(tabletStyles, /\.join-hero\{[^}]*flex-direction:column/, 'tablet hero retains its composed arrangement');
assert.match(mobileStyles, /\.join-hero\{[^}]*flex-direction:column/, 'hero stacks only at the mobile breakpoint');
assert.match(mobileStyles, /\.join-hero figure\{[^}]*position:relative[^}]*order:-1/, 'mobile photograph moves above live copy');
