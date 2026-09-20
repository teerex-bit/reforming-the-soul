import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

// Focused source contracts, not a browser layout emulator. Media ranges and
// declarations are parsed so a later contradictory rule cannot silently pass.
const read = path => readFileSync(new URL(`../public/${path}`, import.meta.url), 'utf8');
function rules(source, range = [0, Infinity]) {
  const result = [];
  const css = source.replace(/\/\*[\s\S]*?\*\//g, '');
  for (let start = 0; start < css.length;) {
    const open = css.indexOf('{', start);
    if (open < 0) break;
    let end = open + 1;
    let depth = 1;
    while (depth && end < css.length) {
      if (css[end] === '{') depth++;
      if (css[end] === '}') depth--;
      end++;
    }
    assert.equal(depth, 0, 'CSS braces are balanced');
    const selector = css.slice(start, open).trim();
    const body = css.slice(open + 1, end - 1);
    if (selector.startsWith('@media')) {
      const min = Number(selector.match(/min-width\s*:\s*(\d+)px/)?.[1] ?? 0);
      const max = Number(selector.match(/max-width\s*:\s*(\d+)px/)?.[1] ?? Infinity);
      result.push(...rules(body, [Math.max(min, range[0]), Math.min(max, range[1])]));
    } else {
      const declarations = Object.fromEntries(body.split(';').filter(s => s.trim()).map(s => {
        const colon = s.indexOf(':');
        return [s.slice(0, colon).trim(), s.slice(colon + 1).trim()];
      }));
      for (const item of selector.split(',')) result.push({ selector: item.trim(), declarations, range });
    }
    start = end;
  }
  return result;
}
const sheets = {
  awaken1: rules(read('assets/css/pages/awaken-lesson-1.css')),
  awaken2: rules(read('assets/css/pages/awaken-lesson-2-overview.css')),
  see: rules(read('see-clearly/see-clearly-overview.css')),
  yourself: rules(read('see-clearly/part-1/part-1.css')),
  god: rules(read('see-clearly/lesson-2/lesson-2.css')),
  integration: rules(read('see-clearly/integration/integration.css')),
  become: rules(read('become/become.css')),
};
const style = (sheet, selector, width) => Object.assign({}, ...sheet
  .filter(r => r.selector === selector && width >= r.range[0] && width <= r.range[1])
  .map(r => r.declarations));

test('Awaken final heading scales have one desktop and one mobile owner', () => {
  const headings = [
    ['awaken1', '.title-deck h1', 'clamp(4.2rem,6.2vw,6.8rem)', 'clamp(3.5rem,17vw,4.65rem)', '.92', '.96'],
    ['awaken2', '.title-intro h1', 'clamp(3.8rem,5.8vw,6.2rem)', 'clamp(3.2rem,14vw,4.25rem)', '1.08', '1.08'],
    ...['.editorial-pair h2', '.practice h2'].map(s => ['awaken1', s, 'clamp(2.35rem,3.35vw,3.65rem)', 'clamp(2.15rem,9.5vw,2.85rem)', '1.08', '1.1']),
    ...['.underneath h2', '.questions h2', '.patterns h2'].map(s => ['awaken2', s, 'clamp(2.35rem,3.35vw,3.65rem)', 'clamp(2.15rem,9.5vw,2.85rem)', '1.08', '1.1']),
    ['awaken1', '.moment-bridge h3', 'clamp(2.25rem,3vw,3.35rem)', '2.35rem', '1.08', '1.1'],
    ...['awaken1', 'awaken2'].map(s => [s, '.series-next h2', 'clamp(2.35rem,3.35vw,3.65rem)', '2.15rem', '1.08', '1.1']),
  ];
  for (const [name, selector, desktopSize, mobileSize, desktopLeading, mobileLeading] of headings) {
    const sheet = sheets[name];
    const owners = sheet.filter(r => r.selector === selector && r.declarations['font-size']);
    assert.equal(owners.length, 2, `${name} ${selector}: duplicate scale owners`);
    assert.equal(style(sheet, selector, 1440)['font-size'], desktopSize);
    assert.equal(style(sheet, selector, 375)['font-size'], mobileSize);
    assert.equal(style(sheet, selector, 1440)['line-height'], desktopLeading);
    assert.equal(style(sheet, selector, 375)['line-height'], mobileLeading);
  }
});

test('Awaken paired introductions stack before tablet columns become narrow', () => {
  assert.equal(style(sheets.awaken1, '.title-deck', 800).display, 'block');
  for (const selector of ['.title-intro', '.questions-intro', '.underneath', '.patterns']) {
    assert.equal(style(sheets.awaken2, selector, 820).display, 'block', selector);
  }
  assert.equal(style(sheets.awaken2, '.questions-intro>div', 820).display, 'block');
  assert.equal(style(sheets.awaken1, '.title-deck', 1440).display, 'grid');
});

test('Awaken moment uses one content-centered transition without a duplicate divider', () => {
  const html = read('awaken/lesson-1/index.html');
  assert.match(html, /class="moment-flow"/);
  assert.equal((html.match(/class="moment-step"/g) ?? []).length, 2);
  assert.equal((html.match(/class="moment-arrow"/g) ?? []).length, 1);
  assert.doesNotMatch(html, /class="moment-details"/);
  assert.equal(style(sheets.awaken1, '.moment-flow', 1440)['grid-template-columns'], 'minmax(0,1fr) auto minmax(0,1fr)');
  assert.equal(style(sheets.awaken1, '.moment-flow', 375)['grid-template-columns'], '1fr');
  assert.equal(style(sheets.awaken1, '.moment-step p', 1440)['font-size'], '17px');
});

test('See Clearly paired heroes receive tablet room without changing wide compositions', () => {
  assert.equal(style(sheets.yourself, '.part-hero', 900)['grid-template-columns'], '1fr');
  assert.equal(style(sheets.god, '.hero', 900)['grid-template-columns'], '1fr');
  assert.equal(style(sheets.god, '.formed-view', 900)['grid-template-columns'], '.95fr 1.05fr');
  assert.notEqual(style(sheets.yourself, '.part-hero', 1440)['grid-template-columns'], '1fr');
});

test('Integration keeps scripture and copy together and chain statements readable on tablet', () => {
  assert.equal(style(sheets.integration, '.intro-side', 1440)['justify-content'], 'flex-start');
  assert.equal(style(sheets.integration, '.intro-side', 1440).gap, 'clamp(32px,5vw,72px)');
  assert.equal(style(sheets.integration, '.chain-lines', 900)['grid-template-columns'], '1fr');
  assert.equal(style(sheets.integration, '.chain-lines', 1440)['grid-template-columns'], 'repeat(3,1fr)');
});

test('Integration teaching previews use four asterisks and one shared curriculum note', () => {
  const html = read('see-clearly/integration/index.html');
  const rows = [...html.matchAll(/<article class="truth-row">([\s\S]*?)<\/article>/g)];
  assert.equal(rows.length, 4);
  for (const [, row] of rows) {
    assert.match(row, /<h3>[\s\S]*?<sup class="preview-mark"[^>]*>\*<\/sup><\/h3>/);
  }
  assert.equal((html.match(/class="curriculum-note"/g) ?? []).length, 1);
  assert.match(html, /\* Explored more fully in the deeper-dive curriculum\./);
});

test('Become tablet safeguards preserve cinematic and editorial desktop layouts', () => {
  assert.equal(style(sheets.become, '.hero--become-intro__content', 800).width, '78%');
  assert.equal(style(sheets.become, '.hero--become-intro__content', 375).width, '100%');
  assert.equal(style(sheets.become, '.hero--live', 1024)['grid-template-columns'], '1fr');
  assert.equal(style(sheets.become, '.whole-hero', 900)['grid-template-columns'], '1fr');
  assert.equal(style(sheets.become, '.dimension-row', 900)['grid-template-columns'], '55px 1fr');
  assert.equal(style(sheets.become, '.posture-band', 740)['grid-template-columns'], '1fr');
  assert.equal(style(sheets.become, '.whole-hero', 900)['min-height'], 'auto');
});

test('Practice tablet cadence drops the desktop stagger and compensating note margin', () => {
  assert.equal(style(sheets.become, '.cadence-grid .card:nth-child(even)', 900).transform, 'none');
  assert.equal(style(sheets.become, '.cadence-grid .curriculum-note', 900)['margin-top'], '22px');
  assert.equal(style(sheets.become, '.cadence-grid .card:nth-child(even)', 1440).transform, 'translateY(54px)');
});

test('Fruit closing rules target actual articles even with the curriculum note after them', () => {
  const html = read('become/fruit/index.html');
  assert.equal((html.match(/<article>/g) ?? []).length, 6);
  assert.ok(html.indexOf('class="curriculum-note"') > html.lastIndexOf('</article>'));
  assert.equal(style(sheets.become, '.fruit-field article:nth-of-type(6)', 375)['border-bottom'], '1px solid #cfc2b1');
  assert.equal(style(sheets.become, '.fruit-field article:nth-of-type(n+5)', 375)['border-bottom'], '0');
  assert.equal(style(sheets.become, '.fruit-field article:nth-of-type(n+5)', 768)['border-bottom'], '1px solid #cfc2b1');
});

test('Fruit overview vertically balances the original text columns', () => {
  assert.equal(style(sheets.become, '.fruit-overview', 1440)['align-items'], 'center');
  assert.equal(style(sheets.become, '.fruit-overview', 1440)['grid-template-columns'], '.85fr 1.15fr');
  assert.equal(style(sheets.become, '.fruit-overview>p', 1440)['font-size'], '1.08rem');
  assert.equal(style(sheets.become, '.fruit-overview h2', 1440)['max-width'], '10ch');
});

test('Operational labels and text navigation stay readable and touchable across all 11 pages', () => {
  const controls = { awaken1: '.next-link', awaken2: '.next-link', see: '.see-next__copy a', yourself: '.next a', god: '.button', integration: '.button', become: '.button' };
  for (const [name, selector] of Object.entries(controls)) {
    for (const width of [375, 768, 1440]) {
      assert.equal(style(sheets[name], selector, width)['font-size'], '12px', `${name} control size`);
      assert.equal(style(sheets[name], selector, width)['min-height'], '44px', `${name} control target`);
      assert.equal(style(sheets[name], 'body .context-nav', width)['font-size'], '12px', `${name} breadcrumb size`);
      assert.equal(style(sheets[name], 'body .context-nav a', width)['min-height'], '44px', `${name} breadcrumb target`);
    }
  }
  assert.equal(style(sheets.god, '.back-link', 375)['min-height'], '44px');
  assert.equal(style(sheets.awaken1, '.progression', 375)['font-size'], '12px');
  assert.equal(style(sheets.awaken2, '.progression', 375)['font-size'], '12px');
});

// The mobile rule removes the BR box; it does not insert a space between
// adjacent text nodes. Check those real heading text nodes after that removal.
for (const [path, expected] of [
  ['become/index.html', 'Truth must become a way of living.'],
  ['become/live-with-god/index.html', 'Formation happens in the life you are already living.'],
  ['become/practice-forms-the-person/index.html', 'Practice forms the person.'],
]) {
  test(`${path}: mobile hero break removal preserves word separation`, () => {
    assert.equal(style(sheets.become, '.hero br', 375).display, 'none');
    const heading = read(path).match(/<h1\b[^>]*>([\s\S]*?)<\/h1>/)?.[1];
    assert.ok(heading, 'the page has its real hero heading');
    const mobileText = heading.replace(/<br\s*\/?>/g, '').replace(/\s+/g, ' ').trim();
    assert.equal(mobileText, expected);
  });
}
