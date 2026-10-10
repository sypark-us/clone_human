const { test, expect } = require('@playwright/test');
const E = require('../../js/engine');
const KEY = 'clone-human:save';
const read = page => page.evaluate(key => JSON.parse(localStorage.getItem(key)).run, KEY);
const cell = (page, p) => page.locator(`.map-tile[data-x="${p.x}"][data-y="${p.y}"]`);
const popup = page => page.locator('#machine-upgrade-menu');
async function resume(page, run = E.createRun({ seed: 1 })) {
  await page.addInitScript(({ key, run }) => {
    if (!localStorage.getItem(key)) localStorage.setItem(key, JSON.stringify({ version: 1, run, settings: { tutorialSeen: true, language: 'en' } }));
  }, { key: KEY, run });
  await page.goto('/'); await page.locator('#resume-button').click();
}
test.beforeEach(async ({ page }) => {
  page.errors = []; page.on('pageerror', e => page.errors.push(e.message));
  page.on('response', r => { if (r.status() >= 400) page.errors.push(r.status() + ':' + r.url()); });
});
test.afterEach(async ({ page }) => { expect(page.errors).toEqual([]); });

test('right-click previews then purchases an individual upgrade and persists through drag and reload', async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 720 }); await resume(page);
  const before = await read(page), miner = cell(page, before.positions[0]);
  await miner.click({ button: 'right' }); await expect(popup(page)).toBeVisible();
  await expect(popup(page)).toContainText('Lv.1 → Lv.2'); await expect(popup(page)).toContainText('+4 energy / turn');
  await expect(popup(page)).toContainText('+6 energy / turn'); expect((await read(page)).energy).toBe(before.energy);
  await popup(page).getByRole('button', { name: 'Upgrade · 12 E', exact: true }).click();
  const bought = await read(page); expect(bought.energy).toBe(0); expect(bought.machineLevels[0]).toBe(2); expect(E.validateRun(bought)).toBe(true);
  await expect(popup(page)).toBeHidden(); await expect(miner.locator('.machine-level')).toHaveText('Lv.2');
  await miner.hover(); await expect(page.getByRole('tooltip')).toContainText('+6 energy / turn');
  await miner.dragTo(cell(page, before.positions[1]));
  const moved = await read(page); expect(moved.machineLevels).toEqual(bought.machineLevels); expect(moved.positions[0]).toEqual(before.positions[1]);
  await page.reload(); await page.locator('#resume-button').click(); expect(await read(page)).toEqual(moved);
  expect(await page.evaluate(() => document.documentElement.scrollHeight <= innerHeight && document.documentElement.scrollWidth <= innerWidth)).toBe(true);
});

test('rack and keyboard shortcuts show the same menu, dismiss cleanly, and translate', async ({ page }) => {
  await resume(page); const rack = page.locator('#slot-rack [data-slot="0"]');
  await rack.focus(); await page.keyboard.press('Shift+F10'); await expect(popup(page)).toBeVisible();
  await page.keyboard.press('Escape'); await expect(popup(page)).toBeHidden(); await expect(rack).toBeFocused();
  await rack.click({ button: 'right' }); await page.locator('#energy').click(); await expect(popup(page)).toBeHidden();
  await page.locator('#language-select').selectOption('ko'); await rack.click({ button: 'right' });
  await expect(popup(page)).toContainText('채굴기'); await expect(popup(page)).toContainText('강화 · 12 E');
  await popup(page).getByRole('button', { name: '닫기', exact: true }).click();
  await page.locator('#language-select').selectOption('en'); await rack.click({ button: 'right' });
  await expect(popup(page)).not.toContainText(/[\uac00-\ud7a3]/);
  await page.keyboard.press('Escape'); await cell(page, { x: 0, y: 0 }).click({ button: 'right' }); await expect(popup(page)).toBeHidden();
});

test('panel upgrade access fits a phone and bounded context menus fit viewport corners', async ({ page }) => {
  const run = E.createRun({ seed: 1 }); E.relocateSlot(run, 0, 11, 6);
  await page.setViewportSize({ width: 1280, height: 720 }); await resume(page, run);
  await cell(page, run.positions[0]).click({ button: 'right' });
  let box = await popup(page).boundingBox(); expect(box.x >= 0 && box.x + box.width <= 1280 && box.y + box.height <= 720).toBe(true);
  await page.keyboard.press('Escape'); await page.setViewportSize({ width: 390, height: 844 });
  await page.locator('#slot-rack [data-slot="0"]').click();
  await page.locator('#machine-upgrade-button').click(); await expect(popup(page)).toBeVisible();
  box = await popup(page).boundingBox(); expect(box.x >= 0 && box.x + box.width <= 390 && box.y + box.height <= 844).toBe(true);
  await popup(page).getByRole('button', { name: 'Upgrade · 12 E', exact: true }).click(); expect((await read(page)).machineLevels[0]).toBe(2);
});

test('unaffordable, capped and battle upgrades explain why and never spend energy', async ({ page }) => {
  const run = E.createRun({ seed: 1 }); run.energy = 40; E.upgradeMachine(run, 0); E.upgradeMachine(run, 0);
  E.chooseRoute(run, 0); E.installModule(run, run.offers[0]); await resume(page, run);
  await cell(page, run.positions[0]).click({ button: 'right' }); await expect(popup(page)).toContainText('Max level');
  await expect(popup(page).locator('[data-machine-purchase]')).toBeDisabled(); await page.keyboard.press('Escape');
  await cell(page, run.positions[1]).click({ button: 'right' }); await expect(popup(page)).toContainText('Not enough energy');
  await expect(popup(page).locator('[data-machine-purchase]')).toBeDisabled(); await page.keyboard.press('Escape');
  await page.locator('#primary-button').click(); await expect(popup(page)).toBeHidden();
  await cell(page, run.positions[1]).click({ button: 'right' }); await expect(popup(page)).toContainText('Upgrade between waves');
  await expect(popup(page).locator('[data-machine-purchase]')).toBeDisabled(); expect((await read(page)).machineLevels[1]).toBe(1);
});

test('open previews close for drag, scrolling and help without blocking existing interactions', async ({ page }) => {
  await resume(page); const run = await read(page), miner = cell(page, run.positions[0]);
  await miner.click({ button: 'right' }); await expect(popup(page)).toBeVisible(); await page.locator('#help-button').click(); await expect(popup(page)).toBeHidden();
  await page.keyboard.press('Escape'); await miner.click({ button: 'right' });
  await miner.dragTo(cell(page, run.positions[1])); await expect(popup(page)).toBeHidden();
  expect((await read(page)).positions[0]).toEqual(run.positions[1]);
  await page.setViewportSize({ width: 390, height: 844 });
  await page.locator('#slot-rack [data-slot="0"]').click({ button: 'right' }); await expect(popup(page)).toBeVisible();
  await page.evaluate(() => window.scrollBy(0, 120));
  await expect(popup(page)).toBeHidden();
});

test('touch users can review and buy from the selected machine panel', async ({ browser }) => {
  const context = await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });
  const page = await context.newPage(), errors = [];
  page.on('pageerror', e => errors.push(e.message));
  page.on('response', r => { if (r.status() >= 400) errors.push(r.status() + ':' + r.url()); });
  try {
    await resume(page); await page.locator('#slot-rack [data-slot="0"]').tap();
    await page.locator('#machine-upgrade-button').tap(); await expect(popup(page)).toBeVisible();
    await popup(page).getByRole('button', { name: 'Upgrade · 12 E', exact: true }).tap();
    expect((await read(page)).machineLevels[0]).toBe(2); expect(errors).toEqual([]);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  } finally { await context.close(); }
});
