const { test, expect } = require('@playwright/test');
const E = require('../../js/engine.js');
const KEY = 'clone-human:save';
const state = page => page.evaluate(key => JSON.parse(localStorage.getItem(key)).run, KEY);

async function seed(page, run = E.createRun({ seed: 1, loadout: 'balanced' })) {
  await page.addInitScript(({ key, value }) => {
    if (!localStorage.getItem(key)) localStorage.setItem(key, value);
  }, { key: KEY, value: JSON.stringify({ version: 1, run, settings: { music: false, sfx: true, speed: 1, tutorialSeen: true } }) });
}
async function panel(page, name) {
  const tab = page.locator('[data-layout-tab="' + name + '"]');
  if (await tab.isVisible()) await tab.click();
}
async function launch(page) {
  await page.goto('/');
  await page.locator('#launch-button').click();
  await page.getByRole('button', { name: '알겠습니다', exact: true }).click();
}
test.beforeEach(async ({ page }) => {
  page.runtimeErrors = [];
  page.on('pageerror', error => page.runtimeErrors.push(error.message));
  page.on('response', response => { if (response.status() >= 400) page.runtimeErrors.push(`${response.status()} ${response.url()}`); });
});
test.afterEach(async ({ page }) => { expect(page.runtimeErrors).toEqual([]); });

test('new player builds, relocates, starts, pauses and resumes the exact saved battle', async ({ page }) => {
  // Fix only randomness; the player still starts through the actual launch flow.
  await page.addInitScript(() => {
    Crypto.prototype.getRandomValues = array => { array.fill(1); return array; };
  });
  await page.clock.install();
  await launch(page);
  await expect(page.locator('#primary-button')).toBeDisabled();
  await page.locator('[data-slot="0"]').click();
  await expect(page.locator('[data-slot="0"]')).toBeFocused();
  await panel(page, 'machine');
  await page.locator('#move-button').click();
  await page.locator('.map-tile[data-x="5"][data-y="0"]').click();
  expect((await state(page)).positions[0]).toEqual({ x: 5, y: 0 });
  await expect(page.locator('#selected-slot')).toHaveText('슬롯 1 · B 구역');
  await page.locator('[data-slot="3"]').click();
  await panel(page, 'build');
  await page.locator('[data-install]').first().click();
  await expect(page.locator('#reward-section')).toBeHidden();
  await expect(page.locator('#primary-button')).toBeDisabled();
  await panel(page, 'route');
  await page.locator('[data-route="0"]').click();
  await expect(page.locator('#primary-button')).toBeEnabled();
  await page.locator('#primary-button').click();
  await page.locator('#primary-button').click();
  await expect(page.locator('#command-title')).toHaveText('생산 일시정지');
  await expect(page.locator('#move-button')).toBeDisabled();
  await page.locator('#step-button').click();
  const checkpoint = await state(page);
  expect(checkpoint.turn).toBe(1);
  await page.reload(); await page.locator('#resume-button').click();
  expect(await state(page)).toEqual(checkpoint);
  await expect(page.locator('#command-title')).toHaveText('생산 일시정지');
  await page.clock.runFor(5000);
  expect(await state(page)).toEqual(checkpoint);
  await page.locator('#step-button').click();
  expect((await state(page)).turn).toBe(2);
});

for (const language of ['ko', 'en']) test('eight-wave campaign completes through real controls in ' + language, async ({ page }) => {
  await seed(page); await page.clock.install();
  await page.goto('/'); await page.locator('#language-select').selectOption(language); await page.locator('#resume-button').click();
  const scores = { mine: 4, clone: 7, soldier: 2, mutation: 9, echo: 6, boost: 3, bomb: 1, recycle: 6, onclone: 5, onkill: 0, autoclone: 0, revive: 1 };
  for (let wave = 1; wave <= 8; wave++) {
    let s = await state(page); expect(s.wave).toBe(wave);
    const route = s.routes[0].enemyId === 'swarm' || s.routes[0].objectiveId === 'rush' ? 1 : 0;
    await panel(page, 'route');
    await page.locator(`[data-route="${route}"]`).click();
    const score = id => scores[id] - s.slots.filter(other => other === id).length * (id === 'mutation' ? 8 : id === 'clone' ? 4 : 5);
    const offer = [...s.offers].sort((a, b) => score(b) - score(a))[0];
    if (!s.slots.includes(null)) {
      const worst = s.slots.reduce((index, id, slot) => scores[id] < scores[s.slots[index]] ? slot : index, 0);
      await page.locator(`[data-slot="${worst}"]`).click();
    }
    await panel(page, 'build');
    await page.locator(`[data-install="${offer}"]`).click();
    await panel(page, 'upgrades');
    for (const id of ['fort', 'training', 'power']) {
      const desired = { power: 1, training: 2, fort: 3 };
      s = await state(page);
      while (s.energy >= 20 && s.upgrades[id] < desired[id]) {
        await page.locator(`[data-upgrade="${id}"]`).click(); s = await state(page);
      }
    }
    await page.locator('#primary-button').click();
    for (let turn = 0; turn < 12 && (await state(page)).phase === 'battle'; turn++) await page.clock.runFor(1100);
    s = await state(page); expect(s.report.win).toBe(true);
    await expect(page.locator('#report-reason')).not.toContainText('core-destroyed');
    await expect(page.locator('#report-section')).toBeVisible();
    if (wave < 8) {
      const next = page.locator('#layout-report-continue');
      await (await next.isVisible() ? next : page.locator('#primary-button')).click();
    }
  }
  expect((await state(page)).phase).toBe('won');
  await expect(page.locator('#report-title')).toHaveText(language === 'ko' ? '공장이 미래를 만들었습니다.' : 'Your factory built the future.');
});

test('mobile map supports keyboard movement without page overflow and preserves a canceled restart', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await seed(page); await page.goto('/'); await page.locator('#resume-button').click();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await page.locator('[data-slot="0"]').click();
  await panel(page, 'machine');
  await page.locator('#move-button').click();
  const cell = page.locator('.map-tile[data-x="1"][data-y="2"]');
  await cell.focus(); await page.keyboard.press('ArrowRight'); await page.keyboard.press('Enter');
  expect((await state(page)).positions[0]).toEqual({ x: 2, y: 2 });
  const before = await state(page);
  await page.locator('#new-game-button').click(); await page.locator('#launch-button').click();
  await expect(page.locator('#confirm-dialog')).toBeVisible();
  await page.getByRole('button', { name: '계속 플레이', exact: true }).click();
  await page.locator('#resume-button').click();
  expect(await state(page)).toEqual(before);
  await page.locator('#codex-button').click();
  await expect(page.locator('.codex-entry')).toHaveCount(12);
  await page.keyboard.press('Escape'); await expect(page.locator('#codex-dialog')).toBeHidden();
});

test('save failure is visible during gameplay on a phone', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.addInitScript(() => { Storage.prototype.setItem = () => { throw new DOMException('Quota exceeded', 'QuotaExceededError'); }; });
  await launch(page);
  await expect(page.locator('#save-warning')).toBeVisible();
  await expect(page.locator('#save-warning')).toContainText('저장');
  await expect(page.locator('#game')).toBeVisible();
});

test('corrupt save stays intact until a new run is explicitly started', async ({ page }) => {
  await page.addInitScript(key => { localStorage.setItem(key, '{bad'); }, KEY);
  await page.goto('/');
  await expect(page.locator('#resume-button')).toBeHidden();
  await expect(page.locator('#welcome-save-note')).toContainText('읽을 수 없습니다');
  expect(await page.evaluate(key => localStorage.getItem(key), KEY)).toBe('{bad');
  await page.locator('#music-button').click();
  expect(await page.evaluate(key => localStorage.getItem(key), KEY)).toBe('{bad');
  await page.locator('#launch-button').click();
  expect(E.validateRun(await state(page))).toBe(true);
});

test('music creates running audio after opt-in and both controls persist independently', async ({ page }) => {
  await page.addInitScript(() => {
    const Original = window.AudioContext;
    window.__sound = { contexts: [], oscillators: 0 };
    window.AudioContext = class extends Original {
      constructor(...args) { super(...args); window.__sound.contexts.push(this); }
      createOscillator() { window.__sound.oscillators++; return super.createOscillator(); }
    };
  });
  await page.goto('/');
  expect(await page.evaluate(() => window.__sound.contexts.length)).toBe(0);
  await page.locator('#music-button').click();
  await expect.poll(() => page.evaluate(() => window.__sound.oscillators)).toBeGreaterThan(0);
  expect(await page.evaluate(() => window.__sound.contexts[0].state)).toBe('running');
  await page.locator('#sfx-button').click();
  await page.reload();
  await expect(page.locator('#music-button')).toHaveAttribute('aria-pressed', 'true');
  await expect(page.locator('#sfx-button')).toHaveAttribute('aria-pressed', 'false');
  expect(await page.evaluate(() => window.__sound.contexts.length)).toBe(0);
});
