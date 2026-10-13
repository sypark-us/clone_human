const { test, expect } = require('@playwright/test');
const E = require('../../js/engine.js');
const KEY = 'clone-human:save';
const savedRun = page => page.evaluate(key => JSON.parse(localStorage.getItem(key)).run, KEY);

async function resume(page, run, viewport = { width: 1366, height: 768 }) {
  await page.setViewportSize(viewport);
  await page.addInitScript(({ key, value }) => localStorage.setItem(key, value), {
    key: KEY, value: JSON.stringify({ version: 1, run, settings: { music: false, sfx: false, speed: 1, tutorialSeen: true, language: 'ko' } })
  });
  await page.goto('/');
  await page.locator('#resume-button').click();
}
function battleRun({ win = false } = {}) {
  const run = E.createRun({ seed: 1 });
  E.chooseRoute(run, 0); E.installModule(run, run.offers[0]);
  if (win) run.attack = 999;
  E.startBattle(run);
  return run;
}
// Click the real step button and read the effect layer in the same task, so
// self-removing effects cannot finish before they are observed.
const stepAndRead = page => page.evaluate(() => {
  document.getElementById('step-button').click();
  const banner = document.querySelector('.map-result');
  return {
    floats: [...document.querySelectorAll('.map-float')].map(node => ({ slot: Number(node.dataset.fxSlot), kind: node.dataset.fxKind, text: node.textContent })),
    tokens: document.querySelectorAll('.map-token').length,
    pulses: [...document.querySelectorAll('.map-tile')].filter(tile => tile.getAnimations().length).length,
    banner: !!banner && !banner.hidden && banner.getClientRects().length > 0
  };
});

test.beforeEach(async ({ page }) => {
  page.runtimeErrors = [];
  page.on('pageerror', error => page.runtimeErrors.push(error.message));
  page.on('response', response => { if (response.status() >= 400) page.runtimeErrors.push(response.url()); });
});
test.afterEach(async ({ page }) => { expect(page.runtimeErrors).toEqual([]); });

test('a battle turn plays its machine events on the map in engine order', async ({ page }) => {
  await resume(page, battleRun());
  const played = await stepAndRead(page);
  const turn = (await savedRun(page)).lastTurn;
  const expected = turn.filter(event => event.slot >= 0 || event.kind === 'damage').map(event => ({ slot: event.slot, kind: event.kind }));
  expect(expected.length).toBeGreaterThan(1);
  expect(played.floats.map(({ slot, kind }) => ({ slot, kind }))).toEqual(expected);
  expect(played.tokens).toBeGreaterThan(0);
  expect(played.pulses).toBeGreaterThan(0);
  const basic = played.floats.find(item => item.slot === -1);
  expect(basic.text).toMatch(/^-\d+/);
  // Every effect removes itself once the turn has played.
  await expect(page.locator('.map-float')).toHaveCount(0, { timeout: 4000 });
  await expect(page.locator('.map-token')).toHaveCount(0);
});

test('the battle ends in an on-map result banner; the report dialog opens only on request', async ({ page }) => {
  await resume(page, battleRun({ win: true }));
  const played = await stepAndRead(page);
  expect(played.banner).toBe(false);
  expect((await savedRun(page)).phase).toBe('report');
  const banner = page.locator('.map-result');
  await expect(banner).toBeVisible({ timeout: 4000 });
  await expect(banner).toContainText('구역 1 돌파 완료');
  await expect(banner).toContainText('에너지');
  await expect(page.locator('#map-result-action')).toHaveText('다음 웨이브');
  await expect(page.locator('#layout-report-dialog')).toBeHidden();
  await page.locator('#map-result-report').click();
  await expect(page.locator('#layout-report-dialog')).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(page.locator('#layout-report-dialog')).toBeHidden();
  await expect(page.locator('#map-result-report')).toBeFocused();
  await page.locator('#map-result-action').click();
  const next = await savedRun(page);
  expect(next.wave).toBe(2);
  expect(next.phase).toBe('prepare');
  await expect(banner).toBeHidden();
});

test('reduced motion skips the turn animation and shows the banner at once', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await resume(page, battleRun({ win: true }));
  const played = await stepAndRead(page);
  expect(played.floats).toEqual([]);
  expect(played.tokens).toBe(0);
  expect(played.pulses).toBe(0);
  expect(played.banner).toBe(true);
});

test('the result banner fits a phone and its buttons are keyboard reachable', async ({ page }) => {
  await resume(page, battleRun({ win: true }), { width: 390, height: 844 });
  await page.locator('#step-button').click();
  const banner = page.locator('.map-result');
  await expect(banner).toBeVisible({ timeout: 4000 });
  const geometry = await page.evaluate(() => {
    const rect = document.querySelector('.map-result').getBoundingClientRect();
    return { overflow: document.documentElement.scrollWidth > innerWidth, left: rect.left, right: rect.right, width: innerWidth };
  });
  expect(geometry.overflow).toBe(false);
  expect(geometry.left).toBeGreaterThanOrEqual(0);
  expect(geometry.right).toBeLessThanOrEqual(geometry.width);
  await page.locator('#map-result-report').focus();
  await page.keyboard.press('Shift+Tab');
  await expect(page.locator('#map-result-action')).toBeFocused();
  await page.keyboard.press('Enter');
  expect((await savedRun(page)).wave).toBe(2);
});

test('a running battle advances one turn every 1.8 seconds at 1x', async ({ page }) => {
  await page.clock.install();
  await resume(page, battleRun());
  await page.locator('#primary-button').click();
  await page.clock.runFor(1500);
  expect((await savedRun(page)).turn).toBe(0);
  await page.clock.runFor(400);
  expect((await savedRun(page)).turn).toBe(1);
});
