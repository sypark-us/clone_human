const { test, expect } = require('@playwright/test');
const E = require('../../js/engine');
const KEY = 'clone-human:save';
const cell = (page, p) => page.locator(`.map-tile[data-x="${p.x}"][data-y="${p.y}"]`);
const MODULES = Object.keys(E.MODULES);

// Eight machines in map reading order, two or three to a row, spread over all three zones.
function layout(sectorId, modules) {
  const run = E.createRun({ seed: 1 });
  E.chooseRoute(run, 0); E.installModule(run, run.offers[0]);
  run.sectorId = sectorId;
  run.slots = modules.slice(0, 8);
  run.positions = run.slots.map((_, i) => ({ x: i < 6 ? (i % 3) * 4 + 1 : (i - 6) * 4 + 1, y: i < 3 ? 0 : i < 6 ? 2 : 4 }));
  run.selectedSlot = 0;
  expect(E.validateRun(run)).toBe(true);
  return run;
}
async function resume(page, run, language = 'ko') {
  await page.addInitScript(({ key, run, language }) => {
    if (!localStorage.getItem(key)) localStorage.setItem(key, JSON.stringify({ version: 1, run, settings: { tutorialSeen: true, language } }));
  }, { key: KEY, run, language });
  await page.goto('/'); await page.locator('#resume-button').click();
}
const hot = page => page.locator('.zone-wash.zone-hot').evaluateAll(zones => zones.map(zone => zone.dataset.kind));
const kindsFor = (run, id) => E.SECTORS.find(sector => sector.id === run.sectorId).lanes.map(lane => lane.kind).filter(kind => E.terrainKinds(id).includes(kind));
test.beforeEach(async ({ page }) => {
  page.errors = [];
  page.on('pageerror', error => page.errors.push(error.message));
  page.on('response', r => { if (r.status() >= 400) page.errors.push(r.url()); });
});
test.afterEach(async ({ page }) => { expect(page.errors).toEqual([]); });

test('a tile shows a lane chip exactly when its tooltip lists that lane bonus', async ({ browser }) => {
  let chips = 0, bare = 0;
  const layouts = [];
  for (const sector of E.SECTORS) {
    layouts.push(layout(sector.id, MODULES.slice(0, 8)), layout(sector.id, MODULES.slice(4)), layout(sector.id, [...MODULES].reverse()));
  }
  for (const run of layouts) {
    // The app autosaves over storage on reload, so each layout gets a fresh browser context.
    const context = await browser.newContext({ viewport: { width: 1440, height: 1000 } }), page = await context.newPage();
    await resume(page, run);
    const rows = await page.evaluate(() => [...document.querySelectorAll('.map-tile.occupied')].map(tile => {
      tile.focus();
      const tip = document.getElementById('machine-tooltip');
      return { x: Number(tile.dataset.x), y: Number(tile.dataset.y), tip: tip.hidden ? null : tip.textContent, chip: tile.querySelector('.terrain-chip')?.textContent ?? null };
    }));
    expect(rows.length).toBe(8);
    for (const row of rows) {
      const slot = run.positions.findIndex(p => p.x === row.x && p.y === row.y);
      const lane = E.SECTORS.find(sector => sector.id === run.sectorId).lanes[Math.floor(row.x / 4)];
      const where = `${run.sectorId} ${run.slots[slot]} in ${lane.kind}`;
      expect(row.tip, where + ': tooltip shown').not.toBeNull();
      expect(row.chip !== null, where + ': chip iff tooltip lists the lane').toBe(row.tip.includes(lane.name));
      expect(row.chip !== null, where + ': chip iff engine terrainKinds').toBe(E.terrainKinds(run.slots[slot]).includes(lane.kind));
      if (row.chip !== null) { chips++; expect(row.chip).toContain(String(lane.value)); } else bare++;
    }
    await context.close();
  }
  expect(chips).toBeGreaterThan(10); expect(bare).toBeGreaterThan(10);
});

test('selecting or dragging a machine highlights the bands that would boost it, and clears afterwards', async ({ page }) => {
  const run = layout('factory', ['mine', 'soldier', 'echo', 'bomb', 'recycle', 'onkill', 'clone', 'revive']);
  run.slots[5] = null; run.slots[3] = 'bomb';
  await resume(page, run, 'en');
  const rack = slot => page.locator(`[data-slot="${slot}"]`).first();
  expect(await hot(page)).toEqual(kindsFor(run, 'mine'));
  expect((await hot(page)).length).toBe(1);
  await rack(1).click(); expect(await hot(page)).toEqual(kindsFor(run, 'soldier'));
  await rack(3).click(); expect(await hot(page)).toEqual(kindsFor(run, 'bomb'));
  await rack(2).click(); expect(await hot(page)).toEqual([]);
  await rack(5).click(); expect(await hot(page)).toEqual([]);
  // Drag the miner while the echo is selected: the miner's band lights, and Escape-cancel puts it back.
  await rack(2).click();
  const source = cell(page, run.positions[0]), target = cell(page, run.positions[4]);
  const from = await source.boundingBox(), to = await target.boundingBox();
  await page.mouse.move(from.x + from.width / 2, from.y + from.height / 2); await page.mouse.down();
  await page.mouse.move(to.x + to.width / 2, to.y + to.height / 2, { steps: 12 });
  await page.mouse.move(to.x + to.width / 2 + 1, to.y + to.height / 2);
  await expect(target).toHaveClass(/drop-target/);
  expect(await hot(page)).toEqual(kindsFor(run, 'mine'));
  await page.keyboard.press('Escape'); await page.mouse.up();
  await expect(page.locator('.drag-source')).toHaveCount(0);
  expect(await hot(page)).toEqual([]);
  // Starting the battle drops the highlight.
  await rack(0).click(); expect(await hot(page)).toEqual(kindsFor(run, 'mine'));
  await page.locator('#primary-button').click();
  await expect(page.locator('.zone-wash.zone-hot')).toHaveCount(0);
});

test('bands are tinted with their lane colour, edged, and labelled at a readable size with the bonus', async ({ page }) => {
  const run = layout('factory', ['mine', 'clone', 'soldier', 'bomb', 'recycle', 'echo', 'boost', 'revive']);
  run.selectedSlot = 5; // the echo: no band lit, so the resting tint is what gets measured
  await resume(page, run, 'en');
  const bands = await page.locator('.zone-wash').evaluateAll(zones => zones.map(zone => {
    const style = getComputedStyle(zone), color = style.backgroundColor.match(/[\d.]+/g).map(Number);
    return { alpha: color.length > 3 ? color[3] : 1, kind: zone.dataset.kind, edge: parseFloat(style.borderRightWidth) + parseFloat(style.borderTopWidth) + (style.boxShadow !== 'none' ? 1 : 0), rgb: color.slice(0, 3).join() };
  }));
  expect(bands.map(band => band.kind)).toEqual(E.SECTORS[0].lanes.map(lane => lane.kind));
  for (const band of bands) { expect(band.alpha).toBeGreaterThanOrEqual(0.07); expect(band.alpha).toBeLessThanOrEqual(0.13); expect(band.edge).toBeGreaterThan(0); }
  expect(new Set(bands.map(band => band.rgb)).size).toBe(3);
  const labels = await page.locator('.map-zone-labels > span').evaluateAll(spans => spans.map(span => ({ size: parseFloat(getComputedStyle(span).fontSize), text: span.textContent })));
  expect(labels.length).toBe(3);
  labels.forEach((label, i) => { expect(label.size).toBeGreaterThanOrEqual(11); expect(label.text).toContain(String(E.SECTORS[0].lanes[i].value)); });
  // Machines and belts stay on top of the wash.
  const order = await page.evaluate(() => { const index = selector => [...document.querySelector('.map-world').children].indexOf(document.querySelector(selector)); return { wash: index('.zone-a'), tiles: index('.map-tiles'), belts: index('.map-belts') }; });
  expect(order.wash).toBeLessThan(order.belts); expect(order.wash).toBeLessThan(order.tiles);
});

test('the idle map instruction says machines go anywhere and order follows the map', async ({ page }) => {
  await resume(page, E.createRun({ seed: 1 }), 'en');
  await expect(page.locator('#map-instruction')).toHaveText('Drag machines anywhere · production runs top to bottom, left to right');
  await page.locator('#language-select').selectOption('ko');
  await expect(page.locator('#map-instruction')).toHaveText('설비를 어느 땅으로든 드래그 · 생산은 위에서 아래, 왼쪽에서 오른쪽 순서');
});

test('highlight transitions stop under reduced motion', async ({ page }) => {
  await resume(page, layout('factory', ['mine', 'clone', 'soldier', 'bomb', 'recycle', 'echo', 'boost', 'revive']), 'en');
  const read = () => page.locator('.zone-wash').evaluateAll(zones => zones.map(zone => getComputedStyle(zone).transitionDuration));
  expect((await read()).some(value => value !== '0s')).toBe(true);
  await page.emulateMedia({ reducedMotion: 'reduce' });
  const durations = await read();
  expect(durations.every(value => /^0s(, 0s)*$/.test(value))).toBe(true);
});

test('chips, bands and labels do not widen the phone page', async ({ browser }) => {
  const context = await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });
  const page = await context.newPage();
  try {
    await resume(page, layout('canyon', ['mine', 'clone', 'soldier', 'bomb', 'recycle', 'revive', 'mutation', 'onclone']), 'en');
    await expect(page.locator('.terrain-chip').first()).toBeVisible();
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  } finally { await context.close(); }
});
