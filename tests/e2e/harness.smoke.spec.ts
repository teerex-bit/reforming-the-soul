import { test, expect } from '@playwright/test';
import { assertNoLiveAiCredentials } from '../setup/e2e';

assertNoLiveAiCredentials();

const authoritativeRoutes = [
  '/',
  '/formation/',
  '/overview/',
  '/awaken/lesson-1/',
  '/awaken/lesson-2/',
  '/see-clearly/',
];

test('browser harness serves every authoritative Overview route and its assets', async ({ page }) => {
  const runtimeErrors: string[] = [];
  const failedResources: string[] = [];
  page.on('pageerror', error => runtimeErrors.push(error.message));
  page.on('requestfailed', request => failedResources.push(`${request.method()} ${request.url()}`));

  for (const route of authoritativeRoutes) {
    const response = await page.goto(route);
    expect(response?.status(), `${route} should load`).toBe(200);
    await expect(page.locator('main')).toBeVisible();
    const images = page.locator('img');
    for (let index = 0; index < await images.count(); index += 1) {
      await expect(images.nth(index), `${route} image ${index + 1} should resolve`).toHaveJSProperty('complete', true);
      expect(
        await images.nth(index).evaluate(image => (image as HTMLImageElement).naturalWidth),
        `${route} image ${index + 1} should have decoded content`,
      ).toBeGreaterThan(0);
    }
  }

  expect(runtimeErrors).toEqual([]);
  expect(failedResources).toEqual([]);
});

test('browser harness certifies Overview identity, layout, focus, and evidence capture', async ({ page }, testInfo) => {
  const response = await page.goto('/overview/');
  expect(response?.status()).toBe(200);
  await expect(page.getByRole('heading', { name: 'A High-Level Overview' })).toBeVisible();
  await expect(page.getByRole('img', { name: 'Reforming the Soul' })).toBeVisible();
  expect(await page.evaluate(() => window.innerWidth)).toBe(testInfo.project.use.viewport?.width);
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(
    testInfo.project.use.viewport?.width ?? 0,
  );

  const controls = page.locator('a:visible, button:visible, input:visible, select:visible, textarea:visible');
  for (let index = 0; index < await controls.count(); index += 1) {
    const box = await controls.nth(index).boundingBox();
    expect(box, `visible control ${index + 1} should have a layout box`).not.toBeNull();
    expect(box!.x, `visible control ${index + 1} should not be clipped left`).toBeGreaterThanOrEqual(0);
    expect(
      box!.x + box!.width,
      `visible control ${index + 1} should not be clipped right`,
    ).toBeLessThanOrEqual(testInfo.project.use.viewport?.width ?? 0);
  }

  await page.keyboard.press('Tab');
  const focused = page.locator(':focus');
  await expect(focused).toBeVisible();
  await expect(focused).toHaveJSProperty('tagName', 'A');
  expect(await focused.evaluate(element => element.matches(':focus-visible'))).toBe(true);

  await page.screenshot({ path: testInfo.outputPath('overview-authority.png'), fullPage: true });
});
