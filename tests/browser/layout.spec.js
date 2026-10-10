const { test, expect } = require('@playwright/test');
const E = require('../../js/engine.js');
const KEY = 'clone-human:save';
const state = page => page.evaluate(key => JSON.parse(localStorage.getItem(key)).run, KEY);

async function resume(page, run = E.createRun({ seed: 1 }), language = 'ko') {
  await page.addInitScript(({ key, value }) => localStorage.setItem(key, value), {
    key: KEY, value: JSON.stringify({ version: 1, run, settings: { music: false, sfx: false, speed: 1, tutorialSeen: true, language } })
  });
  await page.goto('/');
  await page.locator('#resume-button').click();
}

test.beforeEach(async ({ page }) => {
  page.layoutErrors = [];
  page.on('pageerror', error => page.layoutErrors.push(error.message));
  page.on('response', response => { if (response.status() >= 400) page.layoutErrors.push(response.url()); });
});
test.afterEach(async ({ page }) => { expect(page.layoutErrors).toEqual([]); });

for (const viewport of [{ width: 1366, height: 768 }, { width: 1280, height: 720 }]) {
  test(`desktop gameplay fits ${viewport.width}x${viewport.height} with visible core controls`, async ({ page }) => {
    await page.setViewportSize(viewport);
    await resume(page);
    const geometry = () => page.evaluate(() => ({
      pageFits: document.documentElement.scrollHeight <= innerHeight && document.documentElement.scrollWidth <= innerWidth,
      rects: ['.resource-bar', '#factory', '.map-world', '.production-order', '.battle-panel', '.command-bar', '#primary-button'].map(selector => {
        const r = document.querySelector(selector).getBoundingClientRect();
        return { selector, fits: r.top >= 0 && r.left >= 0 && r.bottom <= innerHeight + 1 && r.right <= innerWidth + 1, height: r.height };
      })
    }));
    await expect.poll(async () => (await geometry()).pageFits).toBe(true);
    for (const rect of (await geometry()).rects) {
      expect(rect.fits, rect.selector).toBe(true);
      expect(rect.height, rect.selector).toBeGreaterThan(20);
    }
    await page.locator('#language-select').selectOption('en');
    expect((await geometry()).pageFits).toBe(true);
    for (const rect of (await geometry()).rects) expect(rect.fits, rect.selector).toBe(true);
  });
}

test('desktop tabs retain selection while translating and expose real build and movement controls', async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 720 });
  await resume(page);
  await page.locator('[data-layout-tab="route"]').click();
  await page.locator('[data-route="0"]').click();
  await page.locator('[data-layout-tab="build"]').click();
  await page.locator('[data-slot="3"]').click();
  await page.locator('[data-layout-tab="build"]').click();
  await page.locator('[data-install]').first().click();
  expect((await state(page)).needsReward).toBe(false);
  await page.locator('[data-layout-tab="machine"]').click();
  const selected = (await state(page)).selectedSlot;
  await page.locator('#language-select').selectOption('en');
  await expect(page.locator('[data-layout-tab="machine"]')).toHaveAttribute('aria-selected', 'true');
  expect((await state(page)).selectedSlot).toBe(selected);
  await page.locator('#move-button').click();
  await page.locator('.map-tile[data-x="5"][data-y="0"]').click();
  expect((await state(page)).positions[selected]).toEqual({ x: 5, y: 0 });
  await page.locator('#layout-log-button').click();
  await expect(page.locator('#layout-log-dialog')).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(page.locator('#layout-log-dialog')).toBeHidden();
  await expect(page.locator('#layout-log-button')).toBeFocused();
});

test('desktop report popup continues to the next wave through its real action', async ({ page }) => {
  await page.setViewportSize({ width: 1366, height: 768 });
  const run = E.createRun({ seed: 1 });
  E.chooseRoute(run, 0); E.installModule(run, run.offers[0]);
  run.attack = 999; E.startBattle(run); E.tick(run);
  expect(run.phase).toBe('report');
  await resume(page, run);
  await expect(page.locator('#layout-report-dialog')).toBeVisible();
  await page.locator('#layout-report-continue').click();
  await expect(page.locator('#layout-report-dialog')).toBeHidden();
  expect((await state(page)).wave).toBe(2);
  expect((await state(page)).phase).toBe('prepare');
  await expect(page.locator('[data-layout-tab="route"]')).toHaveAttribute('aria-selected', 'true');
});

test('resizing preserves gameplay and never offers an empty battle report', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await resume(page);
  const before = await state(page);
  await page.setViewportSize({ width: 1280, height: 720 });
  await expect(page.locator('#layout-log-button')).toBeVisible();
  await expect(page.locator('#layout-report-button')).toBeHidden();
  expect(await state(page)).toEqual(before);
  await page.setViewportSize({ width: 390, height: 844 });
  await expect(page.locator('#route-section')).toBeVisible();
  await expect(page.locator('#reward-section')).toBeVisible();
  await expect(page.locator('#move-button')).toBeVisible();
  expect(await state(page)).toEqual(before);
});

test('opening the desktop battle log pauses production and build tab explains completed choices', async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 720 });
  const run = E.createRun({ seed: 1 });
  E.chooseRoute(run, 0); E.installModule(run, run.offers[0]); E.startBattle(run);
  await page.clock.install();
  await resume(page, run);
  await page.locator('[data-layout-tab="build"]').click();
  await expect(page.locator('#layout-build-empty')).toBeVisible();
  await page.locator('#primary-button').click();
  await expect(page.locator('#command-title')).toHaveText('생산 가동 중');
  const before = await state(page);
  await page.locator('#layout-log-button').click();
  await expect(page.locator('#layout-log-dialog')).toBeVisible();
  await expect(page.locator('#command-title')).toHaveText('생산 일시정지');
  await page.clock.runFor(4000);
  expect(await state(page)).toEqual(before);
});

test('a report still opens after changing language on the welcome screen', async ({ page }) => {
  const run = E.createRun({ seed: 1 });
  E.chooseRoute(run, 0); E.installModule(run, run.offers[0]);
  run.attack = 999; E.startBattle(run); E.tick(run);
  await page.addInitScript(({ key, run }) => localStorage.setItem(key, JSON.stringify({ version: 1, run, settings: { tutorialSeen: true } })), { key: KEY, run });
  await page.goto('/');
  await page.locator('#language-select').selectOption('en');
  await page.locator('#resume-button').click();
  await expect(page.locator('#layout-report-dialog')).toBeVisible();
  await page.keyboard.press('Escape');
  await page.setViewportSize({ width: 390, height: 844 });
  await page.setViewportSize({ width: 1280, height: 720 });
  await expect(page.locator('#layout-report-dialog')).toBeHidden();
  await expect(page.locator('#layout-report-button')).toBeVisible();
  await page.locator('#new-game-button').click();
  await page.locator('#resume-button').click();
  await expect(page.locator('#layout-report-dialog')).toBeVisible();
});
