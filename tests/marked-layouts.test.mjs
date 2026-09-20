import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

// Source-level layout contracts; browser geometry is checked separately.
const read = path => readFileSync(new URL(`../${path}`, import.meta.url), 'utf8');
const become = read('public/become/become.css');
const see = read('public/see-clearly/lesson-2/lesson-2.css');
const rule = (css, selector) => {
  const escaped = selector.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const matches = [...css.matchAll(new RegExp(`${escaped}\\s*\\{([^}]+)\\}`, 'g'))];
  assert.ok(matches.length, `Missing rule for ${selector}`);
  return Object.fromEntries(matches[0][1].split(';').filter(Boolean).map(declaration => {
    const [property, ...value] = declaration.trim().split(':');
    return [property.trim(), value.join(':').trim()];
  }));
};

for (const selector of ['.whole-hero h1', '.fruit-hero-new h1']) {
  const heading = rule(become, selector);
  const lineHeight = Number(heading.font.match(/\)\/([\d.]+)/)?.[1]);
  assert.ok(lineHeight >= 1.05, `${selector}: lines need breathing room`);
  const maxRem = Number(heading.font.match(/,\s*([\d.]+)rem\)/)?.[1]);
  assert.ok(maxRem <= 5.8, `${selector}: headline should not dominate at wide widths`);
}
assert.equal(rule(become, '.whole-hero__mark')['min-height'], 'auto', 'WHOLE and its labels should size to their content');
assert.equal(rule(become, '.whole-dimensions__header')['align-items'], 'center', 'dimension intro should align around actual copy');
assert.equal(rule(become, '.reflection-slab')['align-items'], 'center', 'practice quote should align with actual copy, not its bottom');
assert.equal(rule(become, '.reflection-slab .quote').margin, '0', 'quote alignment must not include the shared 50px top margin');
assert.equal(rule(see, 'h1 span')['white-space'], 'normal', 'editable title lines must remain able to wrap');
assert.ok(Number(rule(see, 'h1').font.match(/\)\/([\d.]+)/)?.[1]) >= 1.05, 'See Clearly heading lines need breathing room');
assert.ok(!read('public/become/whole-person/index.html').includes('class="whole-hero__mark" aria-hidden="true"'), 'dimension labels remain accessible live text');
console.log('Marked-layout source contracts passed.');
