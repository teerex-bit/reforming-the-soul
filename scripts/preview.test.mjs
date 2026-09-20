import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const project = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const source = path.join(project, 'src');

async function withPreview(run) {
  const { createPreviewServer } = await import('./preview.mjs');
  const server = createPreviewServer();
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  try {
    await run(`http://127.0.0.1:${server.address().port}`);
  } finally {
    await new Promise(resolve => server.close(resolve));
  }
}

function authoritativeAssetReferences() {
  const references = new Set();
  const visit = directory => {
    for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
      const absolute = path.join(directory, entry.name);
      if (entry.isDirectory()) visit(absolute);
      if (!entry.isFile() || !/\.(?:css|html)$/.test(entry.name)) continue;
      const contents = fs.readFileSync(absolute, 'utf8');
      for (const match of contents.matchAll(/(?:\.\.\/)*assets\/[A-Za-z0-9._/-]+/g)) {
        references.add('/' + match[0].replace(/^(?:\.\.\/)*|^\//g, ''));
      }
    }
  };
  visit(source);
  return [...references].sort();
}

test('preview imports without external machine-local configuration', async () => {
  const preview = await import('./preview.mjs');
  assert.equal(typeof preview.createPreviewServer, 'function');
});

test('every asset referenced by authoritative Overview source resolves from the preview', async () => {
  const references = authoritativeAssetReferences();
  assert(references.length > 0, 'authoritative source should reference assets');
  await withPreview(async root => {
    for (const reference of references) {
      const response = await fetch(root + reference);
      assert.equal(response.status, 200, reference);
      assert((await response.arrayBuffer()).byteLength > 0, reference);
    }
  });
});

test('HEAD returns GET metadata without a response body', async () => {
  await withPreview(async root => {
    const get = await fetch(`${root}/overview/`);
    const head = await fetch(`${root}/overview/`, { method: 'HEAD' });
    assert.equal(head.status, 200);
    assert.equal(head.headers.get('content-type'), get.headers.get('content-type'));
    assert.equal(head.headers.get('cache-control'), 'no-store');
    assert.equal(await head.text(), '');
  });
});

test('preview serves the editable lesson and assets but rejects writes and unrelated original files', async () => {
  assert(fs.existsSync(new URL('./preview.mjs', import.meta.url)), 'Isolated preview is not implemented yet');
  const { createPreviewServer } = await import('./preview.mjs');
  const server = createPreviewServer();
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  const root = `http://127.0.0.1:${server.address().port}`;
  try {
    const overview = await fetch(`${root}/overview/`);
    assert.equal(overview.status, 200);
    const overviewHtml = await overview.text();
    assert.match(overviewHtml, /A High-Level Overview/);
    assert.match(overviewHtml, /larger picture of Reforming the Soul/);
    assert.match(overviewHtml, /Explore the Reforming the Soul Curriculum/);

    const home = await (await fetch(`${root}/`)).text();
    assert.match(home, /href="\/overview\/"[\s\S]*<span>Start Here<\/span>[\s\S]*<h2>Overview<\/h2>/);

    const page = await fetch(`${root}/awaken/lesson-1/`);
    assert.equal(page.status, 200);
    const awakenOneHtml = await page.text();
    assert.match(awakenOneHtml, /<h1[^>]*>Pay<br>Attention<\/h1>/);
    assert.match(awakenOneHtml, /assets\/images\/awaken-01-forest-clearing\.png/, 'Awaken 1 should use the approved sunlit forest clearing');
    assert.match(awakenOneHtml, /class="hero-landscape"[\s\S]*class="title-deck"/, 'Awaken 1 should lead with the landscape and then cross into the title deck');
    assert.match(awakenOneHtml, /Something happens<br>around you\./, 'Around you should begin the second line');
    assert.match(awakenOneHtml, /A response begins<br><em>within you\.<\/em>/, 'Within you should begin the second line');
    assert.match(awakenOneHtml, /class="scripture scripture--patterns"[\s\S]*Keep your heart with all diligence, for out of it is the wellspring of life\.[\s\S]*Proverbs 4:23/, 'Proverbs 4:23 should anchor the recurring-patterns teaching');
    assert.match(awakenOneHtml, /id="practice-title">What is happening inside me\?<\/h2>/, 'The practice prompt should keep awareness in the present moment');
    assert.match(awakenOneHtml, /pause and notice what is already moving within you\./, 'The practice instruction should advance the outside-to-inside progression');
    assert.match(awakenOneHtml, /class="[^"]*editorial-centered[^"]*"/, 'The opening teaching should break the repeated left-hand axis');
    assert.match(awakenOneHtml, /class="[^"]*practice-centered[^"]*"/, 'The practice question should be centered rather than repeating the left column');
    assert.match(awakenOneHtml, /class="[^"]*editorial-reverse[^"]*"/, 'The pattern section should reverse the text balance');
    assert.match(awakenOneHtml, /class="[^"]*next-centered[^"]*"/, 'The transition should be centered');
    assert.match(awakenOneHtml, /class="[^"]*practice-band[^"]*"/, 'Awaken 1 should use one decisive navy practice band');
    assert.match(awakenOneHtml, /class="[^"]*series-next[^"]*"/, 'Awaken 1 should close with a restrained series transition');
    assert.doesNotMatch(awakenOneHtml, /curriculum-mountain-seated-person\.png/, 'Awaken 1 should not enlarge the low-resolution mountain image');
    assert.doesNotMatch(awakenOneHtml, /assets\/icons\/rts-stage-awaken\.svg/, 'Awaken 1 hero image should not be covered by a decorative stage badge');
    assert.doesNotMatch(awakenOneHtml, /curriculum-leaf\.png/, 'Awaken 1 should not use the rejected leaf icon');
    const awakenOneCss = await (await fetch(`${root}/assets/css/pages/awaken-lesson-1.css`)).text();
    assert.match(awakenOneCss, /main\{width:100%;max-width:1600px;margin:0 auto;/, 'Awaken 1 should share the approved wide centered canvas');
    assert.match(awakenOneCss, /\.hero-landscape img\{[^}]*aspect-ratio:16\/7/, 'Awaken 1 should use a cinematic landscape crop');
    assert.match(awakenOneCss, /\.title-deck h1\{[^}]*font-size:clamp\(4.2rem,6.2vw,6.8rem\)/, 'Awaken 1 title should be prominent without dominating the page');
    assert.match(awakenOneCss, /\.title-deck h1\{[^}]*line-height:\.92/, 'Awaken 1 title lines should have comfortable vertical separation');
    assert.match(awakenOneCss, /\.editorial-pair h2,[^}]*line-height:1\.08/, 'Awaken 1 large section headings should not be tightly stacked');
    assert.match(awakenOneCss, /\.editorial-pair h2,[^}]*font-size:clamp\(2.35rem,3.35vw,3.65rem\)/, 'Awaken 1 section headings should remain subordinate to the page title');
    assert.match(awakenOneCss, /\.title-deck\{[^}]*grid-template-columns:minmax\(0,1fr\) minmax\(0,1fr\)/, 'Awaken 1 title and supporting copy should balance both sides of the page');
    assert.equal((awakenOneHtml.match(/assets\/images\/awaken-01-forest-clearing\.png/g) || []).length, 1, 'The forest image should appear once');
    assert.doesNotMatch(awakenOneCss, /\.why-heading\{[^}]*padding-left:86px/, 'The teaching section should not reserve empty space for a duplicate icon');
    assert.match(awakenOneHtml, /id="next-title">Notice What Is Driving You<\/h2>/, 'Awaken 1 should transition directly to its next lesson');
    const page2 = await fetch(`${root}/awaken/lesson-2/`);
    assert.equal(page2.status, 200);
    const awakenTwoHtml = await page2.text();
    assert.match(awakenTwoHtml, /<h1[^>]*>Notice What Is Driving You<\/h1>/);
    assert.match(awakenTwoHtml, /assets\/images\/awaken-02-still-lake\.png/, 'Awaken 2 should use the approved still lake at dawn');
    assert.match(awakenTwoHtml, /class="title-intro"[\s\S]*class="lake-panorama"/, 'Awaken 2 should reverse Awaken 1 by leading with typography before the lake');
    assert.match(awakenTwoHtml, /class="[^"]*inward-turn[^"]*"/, 'Awaken 2 should use a navy inward-turn section');
    assert.equal((awakenTwoHtml.match(/class="question-row"/g) || []).length, 4, 'Awaken 2 should present four connected questions without cards');
    assert.match(awakenTwoHtml, /class="[^"]*reflection-section[^"]*"/, 'Awaken 2 should use the reflection composition without duplicating the image');
    assert.match(awakenTwoHtml, /class="scripture scripture--discernment"[\s\S]*For the word of God is living and active[\s\S]*dividing of soul and spirit[\s\S]*able to discern the thoughts and intentions of the heart\.[\s\S]*Hebrews 4:12/, 'The full thought of Hebrews 4:12 should support discernment of what is driving the response');
    assert.doesNotMatch(awakenTwoHtml, /curriculum-leaf\.png/, 'Awaken 2 should not use the rejected decorative leaf');
    assert.doesNotMatch(awakenTwoHtml, /curriculum-mountain-seated-person\.png/, 'Awaken 2 should no longer repeat the mountain-person imagery');
    const awakenTwoCss = await (await fetch(`${root}/assets/css/pages/awaken-lesson-2-overview.css`)).text();
    assert.match(awakenTwoCss, /\.title-intro h1\{[^}]*line-height:1\.08/, 'Awaken 2 title lines should have comfortable vertical separation');
    assert.match(awakenTwoCss, /\.title-intro h1\{[^}]*letter-spacing:-\.02em/, 'Awaken 2 title should use readable, balanced kerning');
    assert.match(awakenTwoCss, /\.underneath h2,[^}]*line-height:1\.08/, 'Awaken 2 large section headings should not be tightly stacked');
    assert.match(awakenTwoCss, /\.underneath h2,[^}]*font-size:clamp\(2.35rem,3.35vw,3.65rem\)/, 'Awaken 2 section headings should remain subordinate to the page title');
    assert.match(awakenTwoCss, /\.title-intro\{[^}]*grid-template-columns:minmax\(0,1fr\) minmax\(0,1fr\)/, 'Awaken 2 title and supporting copy should balance both sides of the page');
    const formation = await fetch(`${root}/formation/`);
    assert.equal(formation.status, 200);
    assert.match(await formation.text(), /You did not become<br><span class="hero-title-spread">who you are<\/span><br><span class="hero-title-spread">all at once\.<\/span>/);
    const formationCss = await fetch(`${root}/assets/css/pages/formation-introduction.css`);
    assert.equal(formationCss.status, 200);
    const formationCssText = await formationCss.text();
    assert.match(formationCssText, /main\{width:100%;max-width:1600px;margin:0 auto\}/, 'Formation page should use the approved wide centered canvas');
    const formationHtml = await (await fetch(`${root}/formation/`)).text();
    assert.match(formationHtml, /class="formation-progression"/, 'Formation logic should be presented as a stacked progression');
    assert.match(formationHtml, /class="progression-arrow"/, 'Each formation step should visibly connect cause to effect');
    assert.doesNotMatch(formationHtml, /assets\/icons\/formation-/, 'The formation progression should not use decorative icons');
    assert.doesNotMatch(formationHtml, /assets\/icons\/progression-/, 'The four journey stages should not use the rejected icons');
    for (const icon of ['awaken', 'see-clearly', 'become', 'join']) {
      assert.match(formationHtml, new RegExp(`assets/icons/rts-stage-${icon}\\.svg`), `Formation page should use the approved ${icon} stage asset`);
    }
    assert.doesNotMatch(formationHtml, /class="journey-stage-number"/, 'The temporary numbered-circle treatment should be removed');
    assert.match(formationCssText, /content:"\\2192"/, 'Arrow glyphs should use a stable CSS escape');
    assert.match(formationCssText, /\.journey-stage--active\{[^}]*background:var\(--paper\)/, 'Active stage should use the same light surface rather than a green box');
    assert.doesNotMatch(formationCssText, /START HERE|journey-stage--active:before/, 'Formation journey should not show a Start Here label');
    assert.match(formationHtml, /noticing what has shaped us, seeing it clearly, and becoming available to God's transforming work/, 'Definition section should end with a clear transition into the RTS process');
    assert.equal((formationHtml.match(/class="notice-pair"/g) || []).length, 5, 'Notice section should contain five matched event-response pairs');
    assert.doesNotMatch(formationHtml, /class="notice-columns"/, 'Notice examples should not be presented as unrelated columns');
    assert.match(formationCssText, /\.journey-grid\{grid-template-columns:repeat\(4,minmax\(0,1fr\)\);gap:40px\}/, 'Journey cards should leave enough room for connectors');
    assert.match(formationHtml, /YOU MAY RESPOND BY/, 'Response examples should be framed as possibilities rather than assumptions');
    assert.match(formationHtml, /You did not become<br><span class="hero-title-spread">who you are<\/span><br><span class="hero-title-spread">all at once\.<\/span>/, 'Hero should avoid the malformed contraction glyph');
    assert.match(formationHtml, /You did not become<br><span class="hero-title-spread">who you are<\/span><br><span class="hero-title-spread">all at once\.<\/span>/, 'Only the final two hero lines should use expanded letter spacing');
    assert.match(formationCssText, /\.hero-title-spread\{[^}]*letter-spacing:\.04em[^}]*white-space:nowrap/, 'The final two hero lines should spread their letters while keeping each phrase together');
    assert.doesNotMatch(formationHtml, /didn(?:'|&rsquo;)t/, 'Hero should not use an apostrophe contraction in the display typeface');
    assert.doesNotMatch(formationHtml, /class="cycle"/, 'The Become formation cycle should not be taught on the introduction page');
    assert.doesNotMatch(formationHtml, /Release control/, 'The detailed formation rhythm belongs in Become');
    assert.match(formationCssText, /\.hero-callout\{[^}]*background:transparent/, 'That is Formation callout should not use a green rectangle');
    assert.match(formationCssText, /\.deeper \.sequence-meaning\{[^}]*background:transparent/, 'Behavior takeaway should not use a green rectangle');
    assert.doesNotMatch(formationHtml, /new circumstances reveal new patterns/, 'Removed journey-process paragraph should remain removed');
    assert.match(formationHtml, /id="recognition-title">What has been<br>forming you\?<\/h2>/, 'Recognition heading should break before “forming you?”');
    assert.match(formationHtml, /class="scripture scripture--response"[^>]*>[\s\S]*Out of the abundance of the heart, the mouth speaks\.[\s\S]*Luke 6:45/, 'Luke 6:45 should use the approved familiar wording');
    assert.match(formationHtml, /class="scripture scripture--transformation"[^>]*>[\s\S]*Be transformed by the renewing of your mind&hellip;[\s\S]*Romans 12:2/, 'Romans 12:2 should support inner transformation');
    assert.match(formationHtml, /You did not become<br><span class="hero-title-spread">who you are<\/span><br><span class="hero-title-spread">all at once\.<\/span>/, 'Hero should use the approved three-line phrasing');
    assert.doesNotMatch(formationHtml, /The point is not whether the response is good or bad|The way you respond today has been formed over time/, 'Luke 6:45 should stand alone beside the response statement');
    assert.match(formationHtml, /class="rhythm[^"]*"[\s\S]*class="scripture scripture--destination"[^>]*>[\s\S]*For whom he foreknew, he also predestined to be conformed to the image of his Son, that he might be the firstborn among many brothers\.[\s\S]*Romans 8:29/, 'The full Romans 8:29 verse should sit beside Formation is not a straight line');
    assert.doesNotMatch(formationHtml, /class="journey-heading"[\s\S]*?scripture--destination[\s\S]*?class="journey-grid"/, 'Romans 8:29 should no longer sit in the journey heading');
    assert.equal((formationHtml.match(/class="scripture /g) || []).length, 3, 'Formation page should contain exactly the three approved Scripture treatments');
    assert.match(formationCssText, /\.scripture\{[^}]*border-left:2px solid var\(--gold\)/, 'Scripture treatments should use the page gold-rule language');
    const review = await fetch(`${root}/review/`);
    assert.equal(review.status, 200);
    const reviewHtml = await review.text();
    for (const label of ['Formation Introduction', 'Overview Statement', 'Awaken 1', 'Awaken 2', 'See Clearly 1', 'See Clearly 2', 'Become 1', 'Become 2', 'Join 1', 'Join 2', 'Conversations', 'Books', 'Music']) {
      assert.match(reviewHtml, new RegExp(label), label);
    }
    assert(reviewHtml.indexOf('Overview Statement') < reviewHtml.indexOf('Awaken 1'), 'Overview statement should come before Awaken');
    assert.doesNotMatch(reviewHtml, /class="review-list"/, 'review switcher must not use a width-reducing sidebar');
    assert.match(reviewHtml, /class="page-grid"/, 'review switcher must show the page listing across the top');
    assert.match(reviewHtml, /const freshUrl = `\$\{url\}\$\{url\.includes\('\?'\) \? '&' : '\?'\}review_refresh=\$\{Date\.now\(\)\}`/, 'Review pages should bypass stale browser caches');
    assert.match(reviewHtml, /frame\.dataset\.route = url/, 'Review navigation should track the clean route separately from its cache-busting URL');
    const reviewCss = await fetch(`${root}/assets/css/review-switcher.css`);
    assert.equal(reviewCss.status, 200);
    for (const rejected of ['progression-awaken.png', 'progression-see.png', 'progression-become.png', 'progression-join.png', 'formation-see.svg']) {
      assert.equal((await fetch(`${root}/assets/icons/${rejected}`)).status, 404, `${rejected} should no longer be available`);
    }
    for (const asset of ['/assets/css/curriculum.css', '/assets/css/pages/awaken-lesson-1.css', '/assets/css/pages/awaken-lesson-2-overview.css', '/assets/logos/rts-tree-wordmark.png', '/assets/images/awaken-01-forest-clearing.png', '/assets/images/awaken-02-still-lake.png']) {
      const response = await fetch(root + asset);
      assert.equal(response.status, 200, asset);
      assert((await response.arrayBuffer()).byteLength > 0);
    }
    assert.equal((await fetch(`${root}/assets/logos/rts-tree-wordmark.png`, { method: 'PUT', body: 'test' })).status, 405);
    for (const denied of ['/awaken/lesson-3/', '/.git/config', '/assets/../AGENTS.md', '/assets/%2e%2e%5cAGENTS.md']) {
      assert.equal((await fetch(root + denied)).status, 404, denied);
    }
  } finally {
    await new Promise(resolve => server.close(resolve));
  }
});
