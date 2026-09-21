import { expect, test } from '@playwright/test';
import { appRuntimeUrl } from '../setup/app-runtime';

const canonicalTokens = {
  '--color-navy': '#06223a',
  '--color-navy-deep': '#031d32',
  '--color-ivory': '#faf6ef',
  '--color-ivory-secondary': '#f5efe5',
  '--color-paper': '#fffdfa',
  '--color-gold': '#c88a31',
  '--color-green': '#607c43',
  '--color-text': '#13263a',
  '--color-line': '#ded8cf',
  '--color-sage': '#e9eee3',
  '--content-reading': '46rem',
  '--content-editorial': '70rem',
  '--content-wide': '100rem',
};

test('app runtime renders the complete foundation without overflow or region overlap', async ({ page }, testInfo) => {
  await page.goto(appRuntimeUrl('/design-foundation'));
  await expect(page.getByRole('heading', { name: 'What happened?', level: 1 })).toBeVisible();
  await expect(page.getByRole('textbox', { name: 'What happened?' })).toBeVisible();
  await expect(page.getByRole('group', { name: 'What feels most true right now?' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Save reflection' })).toBeVisible();
  await expect(page.getByRole('link', { name: 'Return to this practice' })).toBeVisible();

  const tokens = await page.evaluate((names) => {
    const style = getComputedStyle(document.documentElement);
    return Object.fromEntries(names.map(name => [name, style.getPropertyValue(name).trim()]));
  }, Object.keys(canonicalTokens));
  expect(tokens).toEqual(canonicalTokens);
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(testInfo.project.use.viewport?.width ?? 0);

  const geometry = await page.locator('header, nav[aria-label="Formation stages"], .editorial-hero, .reflection-panel, .choice-panel, .design-foundation-fixture__provenance, .practice-panel').evaluateAll(regions => {
    const boxes = regions.map(region => {
      const rect = region.getBoundingClientRect();
      return { name: region.className || region.tagName, top: rect.top, right: rect.right, bottom: rect.bottom, left: rect.left };
    });
    const overlaps = boxes.flatMap((box, index) => boxes.slice(index + 1).flatMap(other => (
      box.left < other.right && box.right > other.left && box.top < other.bottom && box.bottom > other.top
        ? [`${box.name} overlaps ${other.name}`] : []
    )));
    return { boxes, overlaps };
  });
  expect(geometry.boxes).toHaveLength(7);
  expect(geometry.overlaps).toEqual([]);

  const controlGeometry = await page.locator('a:visible, button:visible, input:visible, textarea:visible, select:visible').evaluateAll(controls => controls.map(control => {
    const rect = control.getBoundingClientRect();
    return { label: control.getAttribute('aria-label') ?? control.textContent, left: rect.left, right: rect.right, top: rect.top, bottom: rect.bottom };
  }));
  const viewportWidth = testInfo.project.use.viewport?.width ?? 0;
  for (const control of controlGeometry) {
    expect(control.left, `${control.label} should not be clipped left`).toBeGreaterThanOrEqual(0);
    expect(control.right, `${control.label} should not be clipped right`).toBeLessThanOrEqual(viewportWidth);
  }
  const controlOverlaps = controlGeometry.flatMap((control, index) => controlGeometry.slice(index + 1).flatMap(other => (
    control.left < other.right && control.right > other.left && control.top < other.bottom && control.bottom > other.top
      ? [`${control.label} overlaps ${other.label}`] : []
  )));
  expect(controlOverlaps).toEqual([]);

  const saveButton = page.getByRole('button', { name: 'Save reflection' });
  await saveButton.focus();
  expect(await saveButton.evaluate(button => getComputedStyle(button).boxShadow)).not.toBe('none');

  await page.screenshot({ path: testInfo.outputPath('design-foundation-exploratory.png'), fullPage: true });
});
