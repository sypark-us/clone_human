const { test, expect } = require('@playwright/test');
const E = require('../../js/engine.js');
const KEY = 'clone-human:save';
const savedRun = page => page.evaluate(key => JSON.parse(localStorage.getItem(key)).run, KEY);

async function resume(page, run, language = 'ko') {
  await page.addInitScript(({ key, value }) => localStorage.setItem(key, value), {
    key: KEY, value: JSON.stringify({ version: 1, run, settings: { language, tutorialSeen: true, sfx: false } })
  });
  await page.goto('/');
  await page.locator('#resume-button').click();
}
test.beforeEach(async ({ page }) => {
  page.runtimeErrors = [];
  page.on('pageerror', error => page.runtimeErrors.push(error.message));
  page.on('response', response => { if (response.status() >= 400) page.runtimeErrors.push(response.url()); });
});
test.afterEach(async ({ page }) => { expect(page.runtimeErrors).toEqual([]); });

for (const size of [{ width: 1280, height: 720 }, { width: 1366, height: 768 }]) {
  test(`combat is above management and fully visible at ${size.width}x${size.height}`, async ({ page }) => {
    await page.setViewportSize(size);
    await resume(page, E.createRun({ seed: 1 }));
    const geometry = await page.evaluate(() => {
      const panel = document.querySelector('.battle-panel').getBoundingClientRect();
      const manager = document.querySelector('.desktop-manager').getBoundingClientRect();
      return { above: panel.bottom <= manager.top, fits: panel.top >= 0 && panel.bottom <= innerHeight,
        pageFits: document.documentElement.scrollHeight <= innerHeight, height: panel.height };
    });
    expect(geometry.above).toBe(true);
    expect(geometry.fits && geometry.pageFits).toBe(true);
    expect(geometry.height).toBeGreaterThanOrEqual(195);
    await expect(page.locator('#allies-heading')).toContainText('아군');
    await expect(page.locator('#enemy-heading')).toContainText('적');
    await expect(page.locator('#enemy-hp')).toBeInViewport();
    await page.locator('#language-select').selectOption('en');
    await expect(page.locator('#allies-heading')).toHaveText('YOUR CLONES');
    await expect(page.locator('#enemy-heading')).toHaveText('ENEMY CORE');
    expect(await page.evaluate(() => document.documentElement.scrollHeight <= innerHeight)).toBe(true);
  });
}

test('a real combat turn shows exact core, shield, and retaliation results without replaying on translation', async ({ page }) => {
  const run = E.createRun({ seed: 1 });
  E.chooseRoute(run, 0); E.installModule(run, run.offers[0]); E.startBattle(run);
  run.shield = 7;
  await page.clock.install();
  await resume(page, run);
  await page.locator('#step-button').click();
  const after = await savedRun(page);
  await expect(page.locator('#combat-damage')).toHaveAttribute('data-value', String(run.hp - after.hp));
  await expect(page.locator('#combat-shield')).toHaveAttribute('data-value', '7');
  await expect(page.locator('#combat-loss')).toHaveAttribute('data-value', String(run.enemyAttack));
  const sequence = await page.locator('.battle-panel').getAttribute('data-combat-sequence');
  expect(Number(sequence)).toBe(1);
  const names = await page.locator('.battle-panel').evaluate(node => node.getAnimations({ subtree: true }).map(a => a.animationName));
  expect(names).toContain('combat-core-hit');
  expect(names).toContain('combat-retaliation');
  await page.locator('#language-select').selectOption('en');
  await expect(page.locator('.battle-panel')).toHaveAttribute('data-combat-sequence', sequence);
  await expect(page.locator('#combat-damage')).toHaveAttribute('data-value', String(run.hp - after.hp));
  expect(await savedRun(page)).toEqual(after);
});

test('adjacent bonuses and manual connectors use real compatible targets on the map', async ({ page }) => {
  const run = E.createRun({ seed: 1 });
  await resume(page, run);
  await page.locator('[data-slot="1"]').click();
  await page.locator('#move-button').click();
  const source = run.positions[0];
  await page.locator(`.map-tile[data-x="${source.x + 1}"][data-y="${source.y}"]`).click();
  await expect(page.locator('.synergy-link[data-via="adjacent"][data-from="0"][data-to="1"]')).toHaveCount(1);
  await page.locator('[data-slot="0"]').click();
  await expect(page.locator(`.map-tile[data-x="${source.x + 1}"][data-y="${source.y}"]`)).toHaveClass(/synergy-neighbor/);
  await page.locator('#connect-button').click();
  const before = await savedRun(page);
  // Disabled targets remain arrow-key navigable; Enter must still be a no-op.
  await page.locator('.map-tile[data-x="0"][data-y="0"]').focus();
  await page.keyboard.press('Enter');
  expect(await savedRun(page)).toEqual(before);
  const target = before.positions[2];
  const targetButton = page.locator(`.map-tile[data-x="${target.x}"][data-y="${target.y}"]`);
  await expect(targetButton).toHaveClass(/connect-target/);
  await targetButton.focus(); await page.keyboard.press('Enter');
  const after = await savedRun(page);
  expect(after.connectors).toContainEqual({ from: 0, to: 2 });
  await expect(page.locator('.synergy-link[data-via="connector"][data-from="0"][data-to="2"]')).toHaveCount(1);
});

test('reduced motion keeps actual turn results without combat movement', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  const run = E.createRun({ seed: 1 });
  E.chooseRoute(run, 0); E.installModule(run, run.offers[0]); E.startBattle(run);
  await page.clock.install(); await resume(page, run);
  await page.locator('#step-button').click();
  const after = await savedRun(page);
  await expect(page.locator('#combat-damage')).toHaveAttribute('data-value', String(run.hp - after.hp));
  const animations = await page.locator('.battle-panel').evaluate(node => node.getAnimations({ subtree: true }).length);
  expect(animations).toBe(0);
});
