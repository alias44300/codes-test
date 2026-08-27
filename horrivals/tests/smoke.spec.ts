import { expect, test } from '@playwright/test';

test('boots, shows restored menu, opens combat, and returns to menu', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', error => errors.push(error.message));
  page.on('console', message => { if (message.type() === 'error') errors.push(message.text()); });

  await page.goto('/');
  await page.locator('.game-splash').click();

  await expect(page.locator('.premium-home')).toBeVisible();
  await expect(page.getByRole('button', { name: /COMBATTRE/i })).toBeVisible();
  await expect(page.getByRole('button', { name: /PACKS/i })).toBeVisible();
  await expect(page.locator('.premium-team .collection-card')).toHaveCount(5);

  await page.getByRole('button', { name: /COMBATTRE/i }).click();
  await expect(page.locator('.battle-hud')).toBeVisible({ timeout: 10_000 });
  await expect(page.locator('#game-canvas canvas')).toBeVisible();
  await expect(page.locator('.battle-exit')).toBeVisible();

  await page.locator('.battle-exit').click();
  await expect(page.locator('.premium-home')).toBeVisible();
  expect(errors, `Browser errors: ${errors.join(' | ')}`).toEqual([]);
});

test('packs, collection, team, and options are navigable', async ({ page }) => {
  await page.goto('/');
  await page.locator('.game-splash').click();

  await page.getByRole('button', { name: /PACKS/i }).click();
  await expect(page.locator('.packs-screen')).toBeVisible();
  await expect(page.locator('[data-pack]')).toHaveCount(3);
  await page.locator('[data-pack="frisson"]').click();
  await expect(page.locator('.pack-reveal-zone.revealed')).toBeVisible();
  await expect(page.locator('.pack-close')).toBeVisible();
  await page.locator('.pack-close').click();
  await expect(page.locator('.pack-reveal-zone.revealed')).toHaveCount(0);
  await page.locator('[data-back]').click();

  await page.getByRole('button', { name: /ÉQUIPE/i }).click();
  await expect(page.locator('.team-screen')).toBeVisible();
  await expect(page.locator('.team-fan .collection-card')).toHaveCount(5);
  await page.locator('[data-back]').click();

  await page.getByRole('button', { name: /COLLECTION/i }).click();
  await expect(page.locator('.collection-screen')).toBeVisible();
  await expect(page.locator('.collection-grid .collection-card').first()).toBeVisible();
  await page.locator('[data-back]').click();

  await page.getByRole('button', { name: /OPTIONS/i }).click();
  await expect(page.locator('.options-screen')).toBeVisible();
});

test('SuperCard-impact home fits a 1536x709 landscape viewport', async ({ page }) => {
  await page.setViewportSize({ width: 1536, height: 709 });
  await page.goto('/');
  await page.locator('.game-splash').click();

  const home = page.locator('.premium-home');
  await expect(home).toBeVisible();
  await expect(page.locator('.premium-team .collection-card')).toHaveCount(5);

  const important = [
    page.locator('.premium-brand'),
    page.getByRole('button', { name: /COMBATTRE/i }),
    page.locator('.premium-team'),
    page.getByRole('button', { name: /PACKS/i }),
    page.getByRole('button', { name: /COLLECTION/i }),
  ];

  for (const locator of important) {
    const box = await locator.boundingBox();
    expect(box).not.toBeNull();
    expect(box!.x).toBeGreaterThanOrEqual(-2);
    expect(box!.y).toBeGreaterThanOrEqual(-2);
    expect(box!.x + box!.width).toBeLessThanOrEqual(1538);
    expect(box!.y + box!.height).toBeLessThanOrEqual(711);
  }
});
