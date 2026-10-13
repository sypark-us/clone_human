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

test('dragging a machine onto another swaps their plots and production order and saves', async ({ page }) => {
  const run = E.createRun({ seed: 1 }); E.connectSlots(run, 0, 1);
  await resume(page, run);
  const before = await read(page);
  await cell(page, before.positions[0]).dragTo(cell(page, before.positions[1]));
  const after = await read(page);
  expect(after.positions).toEqual(before.positions);
  expect(after.slots.slice(0, 3)).toEqual([before.slots[1], before.slots[0], before.slots[2]]);
  expect(after.connectors).toEqual([{ from: 1, to: 0 }]);
  expect(after.selectedSlot).toBe(1);
  await expect(cell(page, before.positions[1]).locator('.machine-number')).toHaveText('2');
  expect(E.validateRun(after)).toBe(true);
  await page.reload(); await page.locator('#resume-button').click();
  expect(await read(page)).toEqual(after);
});

test('drag shows targets, cancel never saves, and empty ground or plots accept the machine', async ({ page }) => {
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
  const moved = await read(page);
  expect(moved.positions[0]).toEqual({ x: 0, y: 0 });
  expect(moved.slots).toEqual(before.slots);
  expect(moved.positions.length).toBe(8);
  // An empty plot swaps like a machine: the machine takes plot 4's number.
  await cell(page, { x: 0, y: 0 }).dragTo(cell(page, before.positions[3]));
  const plotted = await read(page);
  expect(plotted.slots[3]).toBe(before.slots[0]); expect(plotted.slots[0]).toBe(null);
  expect(plotted.positions[3]).toEqual(before.positions[3]); expect(plotted.positions[0]).toEqual({ x: 0, y: 0 });
  expect(E.validateRun(plotted)).toBe(true);
});

test('dropping a machine on empty ground renumbers production by map position', async ({ page }) => {
  await resume(page); const before = await read(page);
  // Miner (#1) dropped just right of Clone Vat (#2) runs second.
  const ground = { x: before.positions[1].x + 1, y: before.positions[1].y };
  await cell(page, before.positions[0]).dragTo(cell(page, ground));
  const after = await read(page);
  expect(after.slots.slice(0, 3)).toEqual([before.slots[1], before.slots[0], before.slots[2]]);
  await expect(cell(page, ground).locator('.machine-number')).toHaveText('2');
  await expect(cell(page, before.positions[1]).locator('.machine-number')).toHaveText('1');
  expect(after.selectedSlot).toBe(1); expect(E.validateRun(after)).toBe(true);
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

test('links preview the exact drop result and restore over the source or on cancel', async ({ page }) => {
  const run = E.createRun({ seed: 1 }); E.connectSlots(run, 0, 1);
  await resume(page, run);
  const before = await read(page);
  const links = () => page.evaluate(() => ({
    belts: [...document.querySelectorAll('.map-belts .belt-base')].map(p => p.getAttribute('d')),
    connector: document.querySelector('.manual-connector[data-from="0"][data-to="1"]')?.getAttribute('d'),
    links: [...document.querySelectorAll('.synergy-link')].map(p => p.dataset.from + '>' + p.dataset.to + ':' + p.getAttribute('d'))
  }));
  const center = async p => { const b = await cell(page, p).boundingBox(); return { x: b.x + b.width / 2, y: b.y + b.height / 2 }; };
  const idle = await links();
  const from = await center(before.positions[0]);
  const empty = before.positions[0].y > 0 ? { x: before.positions[0].x, y: before.positions[0].y - 1 } : { x: before.positions[0].x, y: 1 };
  expect(before.positions.some(p => p.x === empty.x && p.y === empty.y)).toBe(false);
  await page.mouse.move(from.x, from.y); await page.mouse.down();
  const ground = await center(empty);
  await page.mouse.move(ground.x, ground.y, { steps: 12 }); await page.mouse.move(ground.x + 1, ground.y);
  // Over empty ground the preview moves the machine's belts and connector there.
  const ground0 = await links();
  expect(ground0.belts[0].startsWith(`M${empty.x * 80 + 40} ${empty.y * 80 + 44}`)).toBe(true);
  expect(ground0.connector).not.toEqual(idle.connector);
  const to = await center(before.positions[1]);
  await page.mouse.move(to.x, to.y, { steps: 12 }); await page.mouse.move(to.x + 1, to.y);
  await expect(cell(page, before.positions[1])).toHaveClass(/drop-target/);
  // Over a swap target the links snap to the result the drop will save: the
  // connector follows its machines while belts keep the plots' production order.
  const preview = await links();
  expect(preview.belts).toEqual(idle.belts);
  expect(preview.connector).toBeUndefined();
  expect(await page.locator('.manual-connector[data-from="1"][data-to="0"]').count()).toBe(1);
  await page.mouse.move(ground.x, ground.y, { steps: 12 }); await page.mouse.move(ground.x + 1, ground.y);
  expect(await links()).toEqual(ground0);
  await page.mouse.move(from.x, from.y, { steps: 12 }); await page.mouse.move(from.x + 1, from.y);
  expect(await links()).toEqual(idle);
  await page.mouse.move(to.x, to.y, { steps: 12 }); await page.mouse.move(to.x + 1, to.y);
  expect(await links()).toEqual(preview);
  await page.keyboard.press('Escape'); await page.mouse.up();
  expect(await read(page)).toEqual(before);
  expect(await links()).toEqual(idle);
  // The preview is exactly what the real drop renders.
  await cell(page, before.positions[0]).dragTo(cell(page, before.positions[1]));
  expect(await links()).toEqual(preview);
  expect(preview.links).not.toEqual(idle.links);
});
