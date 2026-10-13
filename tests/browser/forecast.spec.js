const { test, expect } = require('@playwright/test');
const E = require('../../js/engine.js');
const KEY = 'clone-human:save';
const savedRun = page => page.evaluate(key => JSON.parse(localStorage.getItem(key)).run, KEY);
const cell = (page, p) => page.locator(`.map-tile[data-x="${p.x}"][data-y="${p.y}"]`);

async function resume(page, run, language = 'ko') {
  await page.addInitScript(({ key, value }) => localStorage.setItem(key, value), {
    key: KEY, value: JSON.stringify({ version: 1, run, settings: { music: false, sfx: false, speed: 3, tutorialSeen: true, language } })
  });
  await page.goto('/');
  await page.locator('#resume-button').click();
}
function startable(loadout, seed, route = 0) {
  const run = E.createRun({ seed, loadout });
  E.chooseRoute(run, route); E.installModule(run, run.offers[0]);
  return run;
}
const forecastOf = page => page.locator('#forecast').evaluate(node => ({ win: node.dataset.win === 'true', turns: Number(node.dataset.turns), hpLeft: Number(node.dataset.hpLeft), text: node.textContent }));

test.beforeEach(async ({ page }) => {
  page.runtimeErrors = [];
  page.on('pageerror', error => page.runtimeErrors.push(error.message));
  page.on('response', response => { if (response.status() >= 400) page.runtimeErrors.push(response.url()); });
});
test.afterEach(async ({ page }) => { expect(page.runtimeErrors).toEqual([]); });

test('the displayed win forecast is the battle that actually plays out', async ({ page }) => {
  const run = startable('balanced', 13);
  const expected = E.getForecast(run);
  expect(expected.win).toBe(true);
  await resume(page, run);
  const forecast = await forecastOf(page);
  expect(forecast).toMatchObject({ win: true, turns: expected.turns });
  await expect(page.locator('#command-detail')).toContainText(`예상: ${expected.turns}턴에 코어 격파`);
  await page.locator('#primary-button').click();
  await expect(page.locator('#forecast')).toHaveCount(0);
  await expect.poll(async () => (await savedRun(page)).phase, { timeout: 20000 }).toBe('report');
  const after = await savedRun(page);
  expect(after.report.win).toBe(forecast.win);
  expect(after.report.turns).toBe(forecast.turns);
  await expect(page.locator('#forecast')).toHaveCount(0);
});

test('the displayed shortfall is the loss that actually plays out, in both languages', async ({ page }) => {
  const run = startable('mining', 1, 1);
  const expected = E.getForecast(run);
  expect(expected.win).toBe(false);
  await resume(page, run);
  await expect(page.locator('#command-detail')).toContainText(`예상: 제한 턴 내 체력 ${expected.hpLeft} 부족`);
  await page.locator('#language-select').selectOption('en');
  await expect(page.locator('#command-detail')).toContainText(`Forecast: falls ${expected.hpLeft} HP short`);
  await page.locator('#primary-button').click();
  await expect.poll(async () => (await savedRun(page)).phase, { timeout: 30000 }).toBe('lost');
  const after = await savedRun(page);
  expect(after.hp).toBe(expected.hpLeft);
  expect(after.report.turns).toBe(expected.turns);
  await expect(page.locator('#forecast')).toHaveCount(0);
});

test('moving a machine to another zone recomputes the forecast, and the new forecast is the one played', async ({ page }) => {
  const run = startable('balanced', 13);
  const before = E.getForecast(run);
  const moved = JSON.parse(JSON.stringify(run));
  E.relocateSlot(moved, 0, 4, 6);
  const after = E.getForecast(moved);
  expect(after.turns).not.toBe(before.turns);
  await resume(page, run);
  await expect(page.locator('#command-detail')).toContainText(`${before.turns}턴에 코어 격파`);
  await cell(page, run.positions[0]).dragTo(cell(page, { x: 4, y: 6 }));
  await expect(page.locator('#command-detail')).toContainText(`예상: ${after.turns}턴에 코어 격파`);
  expect((await forecastOf(page)).turns).toBe(after.turns);
  await page.locator('#primary-button').click();
  await expect.poll(async () => (await savedRun(page)).phase, { timeout: 20000 }).toBe('report');
  expect((await savedRun(page)).report.turns).toBe(after.turns);
});

test('no forecast is shown while the battle cannot start', async ({ page }) => {
  await resume(page, E.createRun({ seed: 1 }));
  await expect(page.locator('#primary-button')).toBeDisabled();
  await expect(page.locator('#forecast')).toHaveCount(0);
});
