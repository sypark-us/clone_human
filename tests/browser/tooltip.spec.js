const { test, expect } = require('@playwright/test');
const E = require('../../js/engine');
const KEY = 'clone-human:save';
const cell = (page, p) => page.locator(`.map-tile[data-x="${p.x}"][data-y="${p.y}"]`);
async function resume(page, run = E.createRun({ seed: 1 })) {
  run.sectorId = 'factory';
  await page.addInitScript(({ key, run }) => localStorage.setItem(key, JSON.stringify({ version: 1, run, settings: { tutorialSeen: true, language: 'en' } })), { key: KEY, run });
  await page.goto('/'); await page.locator('#resume-button').click();
}
test.beforeEach(async ({ page }) => {
  page.errors = []; page.on('pageerror', e => page.errors.push(e.message));
  page.on('response', r => { if (r.status() >= 400) page.errors.push(r.url()); });
});
test.afterEach(async ({ page }) => expect(page.errors).toEqual([]));

test('hovering Miner explains its base effect and applicable terrain below the icon', async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 720 }); await resume(page);
  const miner = cell(page, { x: 1, y: 2 });
  await miner.hover();
  const tip = page.getByRole('tooltip'); await expect(tip).toBeVisible();
  await expect(tip).toContainText('Miner'); await expect(tip).toContainText('+4 energy / turn');
  await expect(tip).toContainText('Mining +2');
  await expect(miner).toHaveAttribute('aria-describedby', 'machine-tooltip');
  const icon = await miner.boundingBox(), popup = await tip.boundingBox();
  expect(popup.y).toBeGreaterThanOrEqual(icon.y + icon.height);
  expect(popup.x >= 0 && popup.x + popup.width <= 1280).toBe(true);
  await tip.hover(); await expect(tip).toBeVisible();
  await page.mouse.move(5, 5); await expect(tip).toBeHidden();
  await cell(page, { x: 0, y: 0 }).hover(); await expect(tip).toBeHidden();
});

test('keyboard focus and production rack show translated descriptions; Escape dismisses', async ({ page }) => {
  await resume(page);
  const rack = page.locator('[data-slot="0"]'); await rack.focus();
  const tip = page.getByRole('tooltip'); await expect(tip).toBeVisible();
  await expect(tip).toContainText('+4 energy / turn');
  await page.keyboard.press('Escape'); await expect(tip).toBeHidden();
  await page.locator('#language-select').selectOption('ko');
  await rack.hover(); await expect(tip).toContainText('채굴기'); await expect(tip).toContainText('에너지 +4');
  await page.locator('#language-select').selectOption('en'); await rack.hover();
  await expect(tip).not.toContainText(/[\uac00-\ud7a3]/);
});

test('dragging dismisses the tooltip and shows the moved machine effect afterwards', async ({ page }) => {
  await resume(page);
  const source = cell(page, { x: 1, y: 2 }), target = cell(page, { x: 5, y: 2 });
  await source.hover(); const tip = page.getByRole('tooltip'); await expect(tip).toBeVisible();
  const a = await source.boundingBox(), b = await target.boundingBox();
  await page.mouse.move(a.x + a.width / 2, a.y + a.height / 2); await page.mouse.down();
  await page.mouse.move(b.x + b.width / 2, b.y + b.height / 2, { steps: 12 });
  await page.mouse.move(b.x + b.width / 2 + 1, b.y + b.height / 2);
  await expect(tip).toBeHidden(); await page.mouse.up();
  await page.mouse.move(5, 5); await target.hover(); await expect(tip).toContainText('Miner');
  await expect(tip).not.toContainText('Mining +2');
});

test('touch reveals the same information without widening the phone page', async ({ browser }) => {
  const context = await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });
  const page = await context.newPage();
  try {
    await resume(page); await cell(page, { x: 1, y: 2 }).tap();
    const tip = page.getByRole('tooltip'); await expect(tip).toBeVisible();
    await expect(tip).toContainText('+4 energy / turn');
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    await page.locator('.footer').scrollIntoViewIfNeeded(); await expect(tip).toBeHidden();
  } finally { await context.close(); }
});

test('edge tooltips fit the viewport and report real connection bonuses', async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 720 });
  const run = E.createRun({ seed: 1 }); run.positions[1] = { x: 11, y: 6 }; E.connectSlots(run, 0, 1);
  await resume(page, run); await cell(page, run.positions[1]).hover();
  const tip = page.getByRole('tooltip'); await expect(tip).toBeVisible();
  await expect(tip).toContainText('−1 E cost');
  const rect = await tip.boundingBox();
  expect(rect.x >= 0 && rect.y >= 0 && rect.x + rect.width <= 1280 && rect.y + rect.height <= 720).toBe(true);
  await page.locator('#help-button').click(); await expect(tip).toBeHidden();
});
