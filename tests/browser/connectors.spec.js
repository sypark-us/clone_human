const { test, expect } = require('@playwright/test');
const E = require('../../js/engine');
const KEY = 'clone-human:save';
const read = page => page.evaluate(key => JSON.parse(localStorage.getItem(key)).run, KEY);
const tile = (page, p) => page.locator(`.map-tile[data-x="${p.x}"][data-y="${p.y}"]`);

test('manual links cap at two, cancel safely, persist, and can be removed', async ({ page }) => {
  const run = E.createRun({ seed: 1 });
  E.chooseRoute(run, 0); E.installModule(run, run.offers[0]);
  run.slots = ['mine', 'clone', 'soldier', 'mutation', 'bomb', null, null, null];
  expect(E.validateRun(run)).toBe(true);
  await page.addInitScript(({ key, run }) => {
    if (!localStorage.getItem(key)) localStorage.setItem(key, JSON.stringify({ version: 1, run, settings: { tutorialSeen: true, language: 'en' } }));
  }, { key: KEY, run });
  await page.goto('/'); await page.locator('#resume-button').click();
  for (const [from, to] of [[0, 1], [3, 2]]) {
    await page.locator(`[data-slot="${from}"]`).click();
    await page.locator('#connect-button').click();
    await tile(page, run.positions[to]).focus(); await page.keyboard.press('Enter');
  }
  expect((await read(page)).connectors).toEqual([{ from: 0, to: 1 }, { from: 3, to: 2 }]);
  await page.locator('[data-slot="1"]').click();
  await expect(page.locator('#connect-button')).toBeDisabled();
  await page.reload(); await page.locator('#resume-button').click();
  expect((await read(page)).connectors).toHaveLength(2);
  await page.locator('[data-layout-tab="machine"]').click();
  await page.locator('#connections-summary').click();
  await page.locator('[data-disconnect="0:1"]').click();
  expect((await read(page)).connectors).toEqual([{ from: 3, to: 2 }]);
  await page.locator('#connect-button').click();
  await page.keyboard.press('Escape');
  await expect(page.locator('#connect-button')).toHaveAttribute('aria-pressed', 'false');
  expect((await read(page)).connectors).toHaveLength(1);
  await page.locator('#primary-button').click(); await page.locator('#primary-button').click();
  await expect(page.locator('#connect-button')).toBeDisabled();
  await expect(page.locator('[data-disconnect="3:2"]')).toBeDisabled();
});
