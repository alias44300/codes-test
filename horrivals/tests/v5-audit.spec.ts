import { test, expect } from '@playwright/test';

test('V5 roster manager and battle flow stay game-first and usable', async ({ page }) => {
  await page.setViewportSize({ width: 1536, height: 709 });
  await page.goto('/');
  await page.locator('.game-splash').click();
  await expect(page.locator('.premium-home')).toBeVisible();

  await page.locator('[data-action="import"]').click();
  await expect(page.locator('.sc-card-roster')).toBeVisible();
  await expect(page.locator('.sc-focus-card')).toBeVisible();
  await expect(page.locator('.sc-roster-thumb').first()).toBeVisible();
  await expect(page.locator('[data-change-art]')).toBeVisible();
  await expect(page.getByText('CHOISIS LA CARTE')).toHaveCount(0);
  await expect(page.locator('.import-card-grid')).toHaveCount(0);

  const initialId = await page.locator('[data-focus-id]').textContent();
  await page.locator('.sc-roster-thumb').nth(1).click();
  await expect(page.locator('[data-focus-id]')).not.toHaveText(initialId || '');

  await page.locator('[data-tools-toggle]').click();
  await expect(page.locator('.sc-tools-drawer')).toHaveClass(/open/);
  await expect(page.locator('[data-import-filter]')).toHaveCount(3);
  await page.locator('[data-tools-close]').click();
  await expect(page.locator('.sc-tools-drawer')).not.toHaveClass(/open/);

  await page.locator('[data-import-back]').click();
  await expect(page.locator('.premium-home')).toBeVisible();

  await page.locator('[data-action="battle"]').click();
  await expect(page.locator('.battle-hud')).toBeVisible();
  await expect(page.locator('.battle-message')).toBeVisible();
  await page.locator('.battle-exit').click();
  await expect(page.locator('.premium-home')).toBeVisible();

  await page.locator('[data-action="options"]').click();
  await expect(page.locator('[data-v5-photo-manager]')).toBeVisible();
});