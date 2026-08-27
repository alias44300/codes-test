import { expect, test } from '@playwright/test';

test('boots into card-first home, opens illustrated V8 combat, and returns cleanly', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', error => errors.push(error.message));
  page.on('console', message => { if (message.type() === 'error') errors.push(message.text()); });

  await page.setViewportSize({ width: 1536, height: 709 });
  await page.goto('/');
  await page.locator('.scx-splash').click();

  await expect(page.locator('.scx-home')).toBeVisible();
  await expect(page.locator('.scx-home-team .scx-card')).toHaveCount(5);
  await expect(page.locator('.scx-dock button')).toHaveCount(5);
  await expect(page.getByRole('button', { name: /JOUER/i })).toBeVisible();
  await expect(page.locator('.browser-tools')).toHaveCount(0);

  await page.getByRole('button', { name: /JOUER/i }).click();
  await expect(page.locator('html')).toHaveClass(/arena-image-v8-enabled/);
  await expect(page.locator('.v8-battle-hud')).toBeVisible({ timeout: 10_000 });
  await expect(page.locator('#game-canvas canvas')).toBeVisible();
  await expect(page.locator('.v8-round')).toContainText('MANCHE');
  await expect(page.locator('.v8-fear-player')).toBeVisible();
  await expect(page.locator('.v8-fear-ai')).toBeVisible();
  await expect(page.locator('.battle-top,.scx-battle-score')).toHaveCount(0);

  const hudParts = [page.locator('.v8-round'), page.locator('.v8-fear-player'), page.locator('.v8-fear-ai'), page.locator('.v8-exit')];
  for (const locator of hudParts) {
    const box = await locator.boundingBox();
    expect(box).not.toBeNull();
    expect(box!.x).toBeGreaterThanOrEqual(-2);
    expect(box!.y).toBeGreaterThanOrEqual(-2);
    expect(box!.x + box!.width).toBeLessThanOrEqual(1538);
    expect(box!.y + box!.height).toBeLessThanOrEqual(711);
  }

  await page.locator('.battle-exit').click();
  await expect(page.locator('.scx-home')).toBeVisible();
  expect(errors, `Browser errors: ${errors.join(' | ')}`).toEqual([]);
});

test('packs are booster objects with a full-screen card reveal', async ({ page }) => {
  await page.goto('/');
  await page.locator('.scx-splash').click();
  await page.getByRole('button', { name: /PACKS/i }).click();

  await expect(page.locator('.scx-packs')).toBeVisible();
  await expect(page.locator('.scx-booster')).toHaveCount(3);
  await page.locator('[data-pack="frisson"]').click();
  await expect(page.locator('.pack-reveal-zone.revealed')).toBeVisible();
  await expect(page.locator('.scx-reveal-card')).toBeVisible();
  await expect(page.locator('.pack-close')).toBeVisible();
  await page.locator('.pack-close').click();
  await expect(page.locator('.pack-reveal-zone.revealed')).toHaveCount(0);
});

test('collection and team use horizontal card rails instead of admin grids', async ({ page }) => {
  await page.goto('/');
  await page.locator('.scx-splash').click();

  await page.getByRole('button', { name: /CARTES/i }).click();
  await expect(page.locator('.scx-collection')).toBeVisible();
  await expect(page.locator('.scx-collection-hero')).toBeVisible();
  await expect(page.locator('.scx-collection .scx-card-rail')).toBeVisible();
  await expect(page.locator('.scx-collection-thumb').first()).toBeVisible();
  await expect(page.locator('.search-box,.browser-tools')).toHaveCount(0);
  await page.locator('[data-back]').click();

  await page.getByRole('button', { name: /ÉQUIPE/i }).click();
  await expect(page.locator('.scx-team')).toBeVisible();
  await expect(page.locator('.team-fan .scx-card')).toHaveCount(5);
  await expect(page.locator('.scx-team-roster .scx-card-rail')).toBeVisible();
  await expect(page.locator('.search-box,.browser-tools')).toHaveCount(0);
});

test('illustration manager is a large-card carousel and never asks for a filename', async ({ page }) => {
  await page.setViewportSize({ width: 1536, height: 709 });
  await page.goto('/');
  await page.locator('.scx-splash').click();
  await page.getByRole('button', { name: /PHOTO/i }).click();

  await expect(page.locator('.sc-card-roster')).toBeVisible();
  await expect(page.locator('.sc-focus-card')).toBeVisible();
  await expect(page.locator('.sc-roster-thumb')).toHaveCount(120);
  await expect(page.getByText('CHOISIS LA CARTE')).toHaveCount(0);
  await expect(page.getByText(/HOR-001, SCI-001/i)).toHaveCount(0);
  await expect(page.locator('.scx-drawer')).not.toHaveClass(/open/);

  const focusBox = await page.locator('.sc-focus-card').boundingBox();
  const ctaBox = await page.locator('[data-change-art]').boundingBox();
  for (const box of [focusBox, ctaBox]) {
    expect(box).not.toBeNull();
    expect(box!.x).toBeGreaterThanOrEqual(-2);
    expect(box!.y).toBeGreaterThanOrEqual(-2);
    expect(box!.x + box!.width).toBeLessThanOrEqual(1538);
    expect(box!.y + box!.height).toBeLessThanOrEqual(711);
  }

  const before = await page.locator('[data-focus-id]').textContent();
  await page.locator('.sc-roster-thumb').nth(1).click();
  await expect(page.locator('[data-focus-id]')).not.toHaveText(before || '');
  await page.locator('[data-tools-toggle]').click();
  await expect(page.locator('.scx-drawer')).toHaveClass(/open/);
});

test('1536x709 phone layout keeps the showpiece and dock inside the viewport', async ({ page }) => {
  await page.setViewportSize({ width: 1536, height: 709 });
  await page.goto('/');
  await page.locator('.scx-splash').click();

  const important = [
    page.locator('.scx-profile'),
    page.locator('.scx-home-team'),
    page.getByRole('button', { name: /JOUER/i }),
    page.locator('.scx-dock'),
  ];

  for (const locator of important) {
    const box = await locator.boundingBox();
    expect(box).not.toBeNull();
    expect(box!.x).toBeGreaterThanOrEqual(-2);
    expect(box!.y).toBeGreaterThanOrEqual(-2);
    expect(box!.x + box!.width).toBeLessThanOrEqual(1538);
    expect(box!.y + box!.height).toBeLessThanOrEqual(711);
  }

  await expect(page.locator('.scx-home-team .scx-card')).toHaveCount(5);
});
