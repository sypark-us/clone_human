const { test, expect } = require('@playwright/test');
const E = require('../../js/engine');
const KEY = 'clone-human:save';
const read = page => page.evaluate(key => JSON.parse(localStorage.getItem(key)).run, KEY);
const cell = (page, p) => page.locator(`.map-tile[data-x="${p.x}"][data-y="${p.y}"]`);
async function resume(page, run = E.createRun({ seed: 1 })) {
  await page.addInitScript(({ key, run }) => {
    if (!localStorage.getItem(key)) localStorage.setItem(key, JSON.stringify({ version: 1, run, settings: { tutorialSeen: true } }));
  }, { key: KEY, run });
  await page.goto('/'); await page.locator('#resume-button').click();
}
test.beforeEach(async ({ page }) => {
  page.errors = [];
  page.on('pageerror', error => page.errors.push(error.message));
  page.on('response', r => { if (r.status() >= 400) page.errors.push(r.url()); });
});
test.afterEach(async ({ page }) => { expect(page.errors).toEqual([]); });

test('dragging machines swaps positions and saves without reordering production or links', async ({ page }) => {
  const run = E.createRun({ seed: 1 }); E.connectSlots(run, 0, 1);
  await resume(page, run);
  const before = await read(page);
  await cell(page, before.positions[0]).dragTo(cell(page, before.positions[1]));
  const after = await read(page);
  expect(after.positions[0]).toEqual(before.positions[1]);
  expect(after.positions[1]).toEqual(before.positions[0]);
  expect(after.slots).toEqual(before.slots);
  expect(after.connectors).toEqual(before.connectors);
  expect(after.selectedSlot).toBe(0);
  expect(E.validateRun(after)).toBe(true);
  await page.reload(); await page.locator('#resume-button').click();
  expect(await read(page)).toEqual(after);
});

test('drag shows swap targets and cancelled or empty drops never save a move', async ({ page }) => {
  await resume(page); const before = await read(page);
  const source = cell(page, before.positions[0]);
  const target = cell(page, before.positions[1]);
  const from = await source.boundingBox(), to = await target.boundingBox();
  await page.mouse.move(from.x + from.width / 2, from.y + from.height / 2);
  await page.mouse.down();
  await page.mouse.move(to.x + to.width / 2, to.y + to.height / 2, { steps: 12 });
  await page.mouse.move(to.x + to.width / 2 + 1, to.y + to.height / 2);
  await expect(target).toHaveClass(/drop-target/);
  await page.keyboard.press('Escape'); await page.mouse.up();
  expect(await read(page)).toEqual(before);
  await expect(page.locator('.drag-source,.drop-target,.swap-target')).toHaveCount(0);
  await source.dragTo(cell(page, { x: 0, y: 0 }));
  expect(await read(page)).toEqual(before);
  await source.dragTo(cell(page, before.positions[3]));
  expect(await read(page)).toEqual(before);
});

test('battle and explicit movement or connector modes cannot start a machine drag', async ({ page }) => {
  await resume(page); const before = await read(page);
  const source = cell(page, before.positions[0]);
  await page.locator('[data-slot="0"]').click();
  await page.locator('#connect-button').click();
  await expect(source).toHaveAttribute('draggable', 'false');
  await page.keyboard.press('Escape');
  await page.locator('#move-button').click();
  await expect(source).toHaveAttribute('draggable', 'false');
  await page.keyboard.press('Escape');
  await expect(source).toHaveAttribute('draggable', 'true');
  await page.locator('[data-layout-tab="route"]').click(); await page.locator('[data-route="0"]').click();
  await page.locator('.offer').first().click();
  await page.locator('#primary-button').click(); await page.locator('#primary-button').click();
  await expect(source).toHaveAttribute('draggable', 'false');
  const locked = await read(page);
  await source.dragTo(cell(page, before.positions[1]));
  expect(await read(page)).toEqual(locked);
});
