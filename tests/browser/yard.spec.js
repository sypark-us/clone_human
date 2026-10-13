const { test, expect } = require('@playwright/test');
const E = require('../../js/engine.js');
const KEY = 'clone-human:save';
const PROPS = ['power', 'training', 'fort'];

async function resume(page, run, { language = 'ko', viewport = { width: 1366, height: 768 } } = {}) {
  await page.setViewportSize(viewport);
  await page.addInitScript(({ key, value }) => localStorage.setItem(key, value), {
    key: KEY, value: JSON.stringify({ version: 1, run, settings: { music: false, sfx: false, speed: 1, tutorialSeen: true, language } })
  });
  await page.goto('/');
  await page.locator('#resume-button').click();
}
function prepareRun(upgrades = {}) {
  const run = E.createRun({ seed: 1 });
  E.chooseRoute(run, 0); E.installModule(run, run.offers[0]);
  Object.assign(run.upgrades, upgrades);
  return run;
}
function battleRun(upgrades = {}, wave = 1) {
  const run = prepareRun(upgrades);
  run.wave = wave;
  E.startBattle(run);
  return run;
}
// Eight machines, three of them on row 0 (one per zone band).
function rowZeroLayout() {
  const run = prepareRun();
  run.slots = ['mine', 'clone', 'soldier', 'bomb', 'recycle', 'echo', 'boost', 'revive'];
  run.positions = run.slots.map((_, i) => ({ x: i < 6 ? (i % 3) * 4 + 1 : (i - 6) * 4 + 1, y: i < 3 ? 0 : i < 6 ? 2 : 4 }));
  run.selectedSlot = 0;
  expect(E.validateRun(run)).toBe(true);
  return run;
}
// Click the real step button and read the yard in the same task, so
// self-removing effects cannot finish before they are observed.
const stepAndReadYard = page => page.evaluate(() => {
  document.getElementById('step-button').click();
  const read = {};
  for (const id of ['power', 'training', 'fort']) {
    const prop = document.querySelector(`.yard-prop[data-prop="${id}"]`);
    read[id] = {
      animations: prop.getAnimations().length,
      floats: [...prop.querySelectorAll('.yard-float')].map(node => ({ text: node.textContent, kind: node.dataset.fxKind, slot: node.dataset.fxSlot, prop: node.dataset.fxProp }))
    };
  }
  return read;
});
const rect = (page, selector) => page.locator(selector).first().evaluate(node => { const r = node.getBoundingClientRect(); return { left: r.left, right: r.right, top: r.top, bottom: r.bottom, width: r.width, height: r.height }; });
const intersects = (a, b) => a.left < b.right && b.left < a.right && a.top < b.bottom && b.top < a.bottom;

test.beforeEach(async ({ page }) => {
  page.errors = [];
  page.on('pageerror', error => page.errors.push(error.message));
  page.on('response', response => { if (response.status() >= 400) page.errors.push(response.url()); });
});
test.afterEach(async ({ page }) => { expect(page.errors).toEqual([]); });

test('the yard shows the three structures with level pips and labels, in both languages', async ({ page }) => {
  await resume(page, prepareRun({ power: 2, training: 0, fort: 3 }));
  const props = page.locator('.map-yard .yard-prop');
  await expect(props).toHaveCount(3);
  expect(await props.evaluateAll(nodes => nodes.map(node => node.dataset.prop))).toEqual(PROPS);
  expect(await props.evaluateAll(nodes => nodes.map(node => node.getAttribute('aria-label')))).toEqual(['발전기 확장 Lv.2', '복제 배양조 Lv.0', '방어벽 증설 Lv.3']);
  expect(await props.evaluateAll(nodes => nodes.map(node => [node.querySelectorAll('.yard-pip').length, node.querySelectorAll('.yard-pip.on').length]))).toEqual([[3, 2], [3, 0], [3, 3]]);
  expect(await props.evaluateAll(nodes => nodes.map(node => node.classList.contains('unbuilt')))).toEqual([false, true, false]);
  expect(await props.evaluateAll(nodes => nodes.every(node => node.querySelector('svg')))).toBe(true);
  await page.locator('#language-select').selectOption('en');
  expect(await props.evaluateAll(nodes => nodes.map(node => node.getAttribute('aria-label')))).toEqual(['Generator Expansion Lv.2', 'Growth Tanks Lv.0', 'Fortifications Lv.3']);
});

test('the yard is a strip under the grid and never overlaps a tile', async ({ page }) => {
  await resume(page, prepareRun({ power: 1 }));
  const yard = await rect(page, '.map-yard');
  const world = await rect(page, '.map-world');
  expect(yard.height).toBeGreaterThan(20);
  expect(yard.top).toBeGreaterThanOrEqual(world.bottom - 0.5);
  expect(Math.abs(yard.left - world.left)).toBeLessThanOrEqual(1);
  expect(Math.abs(yard.width - world.width)).toBeLessThanOrEqual(1);
  const tiles = await page.locator('.map-tile').evaluateAll(nodes => nodes.map(node => { const r = node.getBoundingClientRect(); return { left: r.left, right: r.right, top: r.top, bottom: r.bottom }; }));
  expect(tiles.some(tile => intersects(tile, yard))).toBe(false);
  for (const prop of await page.locator('.yard-prop').evaluateAll(nodes => nodes.map(node => { const r = node.getBoundingClientRect(); return { left: r.left, right: r.right, top: r.top, bottom: r.bottom }; }))) {
    expect(prop.top).toBeGreaterThanOrEqual(world.bottom - 0.5);
    expect(prop.bottom).toBeLessThanOrEqual(yard.bottom + 0.5);
  }
});

test('buying an upgrade levels its prop on the next render', async ({ page }) => {
  const run = prepareRun(); run.energy = 99;
  await resume(page, run);
  const generator = page.locator('.yard-prop[data-prop="power"]');
  await expect(generator).toHaveAttribute('aria-label', '발전기 확장 Lv.0');
  await page.locator('[data-layout-tab="upgrades"]').click();
  await page.locator('[data-upgrade="power"]').click();
  await expect(generator).toHaveAttribute('aria-label', '발전기 확장 Lv.1');
  await expect(generator).not.toHaveClass(/unbuilt/);
  await expect(generator.locator('.yard-pip.on')).toHaveCount(1);
  await page.locator('[data-upgrade="power"]').click();
  await expect(generator.locator('.yard-pip.on')).toHaveCount(2);
});

test('a battle turn pulses the generator and floats its energy over it', async ({ page }) => {
  await resume(page, battleRun({ power: 2 }));
  const read = await stepAndReadYard(page);
  expect(read.power.animations).toBeGreaterThan(0);
  expect(read.power.floats).toHaveLength(1);
  expect(read.power.floats[0]).toEqual({ text: '+4 E', kind: 'energy', slot: '-1', prop: 'power' });
  // No vat or wall was built, so they stay quiet.
  expect(read.training.animations).toBe(0);
  expect(read.fort.animations).toBe(0);
  await expect(page.locator('.yard-float')).toHaveCount(0, { timeout: 4000 });
});

test('the vat pulses on battle turns once it is built', async ({ page }) => {
  await resume(page, battleRun({ training: 1 }));
  const read = await stepAndReadYard(page);
  expect(read.training.animations).toBeGreaterThan(0);
  expect(read.power.animations).toBe(0);
});

test('the wall pulses when the enemy retaliation costs soldiers and the wall is built', async ({ page }) => {
  const run = battleRun({ fort: 1 }, 5);
  await resume(page, run);
  const read = await stepAndReadYard(page);
  const turn = await page.evaluate(key => JSON.parse(localStorage.getItem(key)).run.lastTurn, KEY);
  expect(turn.some(event => event.slot === -1 && event.kind === 'loss')).toBe(true);
  expect(read.fort.animations).toBeGreaterThan(0);
  expect(read.power.animations).toBe(0);
});

test('props stay still under reduced motion', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await resume(page, battleRun({ power: 1, training: 1, fort: 1 }, 5));
  const read = await stepAndReadYard(page);
  for (const id of PROPS) { expect(read[id].animations).toBe(0); expect(read[id].floats).toEqual([]); }
});

test('the zone label strip sits above the grid, clear of machines on row 0, aligned to the bands', async ({ page }) => {
  await resume(page, rowZeroLayout(), { language: 'en' });
  const strip = await rect(page, '.map-zone-labels');
  const world = await rect(page, '.map-world');
  expect(strip.bottom).toBeLessThanOrEqual(world.top + 0.5);
  expect(Math.abs(strip.left - world.left)).toBeLessThanOrEqual(1);
  expect(Math.abs(strip.width - world.width)).toBeLessThanOrEqual(1);
  for (const x of [1, 5, 9]) {
    const tile = await rect(page, `.map-tile[data-x="${x}"][data-y="0"]`);
    expect(intersects(strip, tile), `row 0 tile ${x}`).toBe(false);
  }
  const labels = await page.locator('.map-zone-labels > span').evaluateAll(spans => spans.map(span => { const r = span.getBoundingClientRect(); return { left: r.left, right: r.right, center: (r.left + r.right) / 2 }; }));
  const washes = await page.locator('.zone-wash').evaluateAll(zones => zones.map(zone => { const r = zone.getBoundingClientRect(); return { left: r.left, right: r.right }; }));
  expect(labels).toHaveLength(3);
  labels.forEach((label, i) => { expect(label.left).toBeGreaterThanOrEqual(washes[i].left - 0.5); expect(label.right).toBeLessThanOrEqual(washes[i].right + 0.5); });
});

test('zooming keeps the label strip and yard aligned to the bands', async ({ page }) => {
  await resume(page, rowZeroLayout(), { language: 'en' });
  for (let i = 0; i < 2; i++) await page.locator('#zoom-in').click();
  const world = await rect(page, '.map-world');
  for (const selector of ['.map-zone-labels', '.map-yard']) {
    const strip = await rect(page, selector);
    expect(Math.abs(strip.left - world.left), selector).toBeLessThanOrEqual(1);
    expect(Math.abs(strip.width - world.width), selector).toBeLessThanOrEqual(1);
  }
});

for (const viewport of [{ width: 1366, height: 768 }, { width: 1280, height: 720 }]) {
  test(`desktop ${viewport.width}x${viewport.height} keeps the label strip, map and yard inside the map panel`, async ({ page }) => {
    await resume(page, prepareRun({ power: 3, training: 3, fort: 3 }), { viewport });
    await expect.poll(() => page.evaluate(() => document.documentElement.scrollHeight <= innerHeight && document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    const panel = await rect(page, '#factory');
    for (const selector of ['.map-zone-labels', '.map-world', '.map-yard']) {
      const box = await rect(page, selector);
      expect(box.top, selector).toBeGreaterThanOrEqual(panel.top - 0.5);
      expect(box.bottom, selector).toBeLessThanOrEqual(panel.bottom + 1);
    }
  });
}

test('phone keeps the page narrow and the strips as wide as the map', async ({ page }) => {
  await resume(page, prepareRun({ power: 1 }), { viewport: { width: 390, height: 844 } });
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  const world = await rect(page, '.map-world');
  for (const selector of ['.map-zone-labels', '.map-yard']) {
    const strip = await rect(page, selector);
    expect(Math.abs(strip.left - world.left), selector).toBeLessThanOrEqual(1);
    expect(Math.abs(strip.width - world.width), selector).toBeLessThanOrEqual(1);
  }
  await expect(page.locator('.yard-prop')).toHaveCount(3);
});
