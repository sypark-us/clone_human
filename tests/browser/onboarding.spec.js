const { test, expect } = require('@playwright/test');

test('first play teaches three actions and keeps explanations optional', async ({ page }) => {
  await page.goto('/');
  await page.locator('#language-select').selectOption('en');
  await page.locator('#launch-button').click();
  await expect(page.locator('#guide-basics .guide-step')).toHaveCount(3);
  await expect(page.locator('#guide-details')).not.toHaveAttribute('open', '');
  expect((await page.locator('#guide-basics').innerText()).split(/\s+/).length).toBeLessThan(65);
  await page.getByRole('button', { name: 'Got it', exact: true }).click();
  await expect(page.locator('#command-title')).toHaveText('1. Choose a route');
  await page.locator('[data-route="0"]').click();
  await expect(page.locator('#command-title')).toHaveText('2. Add a machine');
  for (const text of await page.locator('.offer > span').allTextContents()) expect(text.length).toBeLessThan(65);
  await page.locator('.offer').first().click();
  await expect(page.locator('#command-title')).toHaveText('3. Start the fight');
  await page.locator('[data-layout-tab="machine"]').click();
  await page.locator('#module-details-button').click();
  await expect(page.locator('#module-dialog')).toBeVisible();
  await expect(page.locator('#module-detail-description')).not.toBeEmpty();
  await page.keyboard.press('Escape');
  await page.locator('#primary-button').click();
  await expect(page.locator('#enemy-heading')).toHaveText('ENEMY CORE');
});

test('optional route details reveal rules before committing in either language', async ({ page }) => {
  await page.goto('/'); await page.locator('#launch-button').click();
  await page.getByRole('button', { name: '알겠습니다', exact: true }).click();
  for (const language of ['en', 'ko']) {
    await page.locator('#language-select').selectOption(language);
    await page.locator('#route-details-button').click();
    await expect(page.locator('#route-detail-content article')).toHaveCount(2);
    if (language === 'en') await expect(page.locator('#route-dialog')).not.toContainText(/[\uac00-\ud7a3]/);
    expect(await page.evaluate(() => JSON.parse(localStorage.getItem('clone-human:save')).run.routePending)).toBe(true);
    await page.keyboard.press('Escape');
  }
});
