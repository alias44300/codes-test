import { test, expect } from '@playwright/test';

test('V5 photo manager and battle flow stay usable', async ({ page }) => {
  await page.goto('/');
  await page.locator('.game-splash').click();
  await expect(page.locator('.premium-home')).toBeVisible();

  await page.locator('[data-action="import"]').click();
  await expect(page.locator('.import-manager')).toBeVisible();
  await expect(page.locator('.import-card-grid .collection-card').first()).toBeVisible();
  await page.locator('[data-import-back]').click();

  await page.locator('[data-action="battle"]').click();
  await expect(page.locator('.battle-hud')).toBeVisible();
  await expect(page.locator('.battle-message')).toBeVisible();
  await page.locator('.battle-exit').click();
  await expect(page.locator('.premium-home')).toBeVisible();

  await page.locator('[data-action="options"]').click();
  await expect(page.locator('[data-v5-photo-manager]')).toBeVisible();
});
