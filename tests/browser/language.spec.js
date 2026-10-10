const { test, expect } = require('@playwright/test');
const E = require('../../js/engine.js');
const KEY = 'clone-human:save';
const hangul = /[\u3131-\u318e\uac00-\ud7a3]/;
const saved = page => page.evaluate(key => JSON.parse(localStorage.getItem(key)), KEY);

test.beforeEach(async ({ page }) => {
  page.errors = [];
  page.on('pageerror', error => page.errors.push(error.message));
  page.on('response', response => { if (response.status() >= 400) page.errors.push(response.url()); });
});
test.afterEach(async ({ page }) => { expect(page.errors).toEqual([]); });

test('language selector translates welcome and help, preserves chosen loadout, and survives reload', async ({ page }) => {
  await page.goto('/');
  await expect(page.locator('html')).toHaveAttribute('lang', 'ko');
  await page.locator('input[value="cloning"]').check();
  await page.locator('#language-select').selectOption('en', { timeout: 3000 });
  await expect(page.locator('html')).toHaveAttribute('lang', 'en');
  await expect(page).toHaveTitle(/Clone Factory/);
  await expect(page.locator('#welcome')).not.toContainText(hangul);
  await expect(page.locator('input[value="cloning"]')).toBeChecked();
  await page.locator('#welcome-guide').click();
  await expect(page.locator('#guide-dialog')).not.toContainText(hangul);
  await page.getByRole('button', { name: 'Got it', exact: true }).click();
  await page.locator('#launch-button').click();
  await page.getByRole('button', { name: 'Got it', exact: true }).click();
  expect((await saved(page)).run.loadoutId).toBe('cloning');
  await page.reload();
  await expect(page.locator('#language-select')).toHaveValue('en');
  await expect(page.locator('#resume-button')).toHaveText('Continue →');
});

test('switching a saved battle translates history and labels without altering paused progress', async ({ page }) => {
  const run = E.createRun({ seed: 1 });
  E.chooseRoute(run, 0); E.installModule(run, run.offers[0]); E.startBattle(run); E.tick(run);
  await page.addInitScript(({ key, run }) => {
    if (!localStorage.getItem(key)) localStorage.setItem(key, JSON.stringify({ version: 1, run, settings: { tutorialSeen: true } }));
  }, { key: KEY, run });
  await page.clock.install();
  await page.goto('/'); await page.locator('#resume-button').click();
  const before = (await saved(page)).run;
  await page.locator('#language-select').selectOption('en', { timeout: 3000 });
  expect((await saved(page)).run).toEqual(before);
  await expect(page.locator('#game')).not.toContainText(hangul);
  const labels = await page.locator('#game [aria-label]').evaluateAll(nodes => nodes.map(node => node.getAttribute('aria-label')));
  expect(labels.join(' ')).not.toMatch(hangul);
  await page.locator('[data-layout-tab="upgrades"]').click();
  await page.locator('#codex-button').click();
  await expect(page.locator('.codex-entry')).toHaveCount(12);
  await expect(page.locator('#codex-dialog')).not.toContainText(hangul);
  await page.keyboard.press('Escape');
  await page.locator('#layout-log-button').click();
  await expect(page.locator('#log')).not.toContainText(hangul);
  await page.keyboard.press('Escape');
  await page.clock.runFor(4000);
  expect((await saved(page)).run).toEqual(before);
  await page.locator('#language-select').selectOption('ko');
  await expect(page.locator('#game')).toContainText('생산 순서');
  expect((await saved(page)).run).toEqual(before);
  await page.reload(); await page.locator('#resume-button').click();
  expect((await saved(page)).run).toEqual(before);
  await expect(page.locator('html')).toHaveAttribute('lang', 'ko');
});

test('English storage warning is visible and a language change preserves corrupt save bytes', async ({ page }) => {
  await page.addInitScript(key => { if (!localStorage.getItem(key)) localStorage.setItem(key, '{bad'); }, KEY);
  await page.goto('/');
  await page.locator('#language-select').selectOption('en', { timeout: 3000 });
  expect(await page.evaluate(key => localStorage.getItem(key), KEY)).toBe('{bad');
  await expect(page.locator('#save-warning')).toBeVisible();
  await expect(page.locator('#save-warning')).not.toContainText(hangul);
  await expect(page.locator('#welcome-save-note')).not.toContainText(hangul);
  await page.locator('#launch-button').click();
  await page.getByRole('button', { name: 'Got it', exact: true }).click();
  expect(E.validateRun((await saved(page)).run)).toBe(true);
  await expect(page.locator('#save-warning')).toBeHidden();
});

test('both languages remain usable at narrow phone widths', async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 740 });
  await page.goto('/');
  for (const language of ['en', 'ko', 'en']) {
    await page.locator('#language-select').selectOption(language, { timeout: 3000 });
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    await expect(page.locator('#language-select')).toBeInViewport();
  }
  await page.locator('#launch-button').click();
  await page.getByRole('button', { name: 'Got it', exact: true }).click();
  await expect(page.locator('#game')).not.toContainText(hangul);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await page.locator('#new-game-button').click(); await page.locator('#launch-button').click();
  await expect(page.locator('#confirm-dialog')).not.toContainText(hangul);
  await page.getByRole('button', { name: 'Keep playing', exact: true }).click();
  await page.locator('#resume-button').click();
  await expect(page.locator('#game')).toBeVisible();
});

test('English battle action describes pausing and switching language keeps the battle running', async ({ page }) => {
  const run = E.createRun({ seed: 1 });
  E.chooseRoute(run, 0); E.installModule(run, run.offers[0]); E.startBattle(run);
  await page.addInitScript(({ key, run }) => {
    localStorage.setItem(key, JSON.stringify({ version: 1, run, settings: { language: 'en', tutorialSeen: true } }));
  }, { key: KEY, run });
  await page.clock.install();
  await page.goto('/'); await page.locator('#resume-button').click();
  await expect(page.locator('#primary-button')).toContainText('Resume battle');
  await page.locator('#primary-button').click();
  await expect(page.locator('#primary-button')).toContainText('Pause battle', { timeout: 2000 });
  const before = (await saved(page)).run;
  await page.locator('#language-select').selectOption('ko');
  await page.locator('#language-select').selectOption('en');
  expect((await saved(page)).run).toEqual(before);
  await expect(page.locator('#command-title')).toHaveText('Fighting');
  await page.clock.runFor(1100);
  expect((await saved(page)).run.turn).toBe(1);
});
