import { expect, test } from '@playwright/test';

test('V9 cleaned arena has no parasite overlays and round label never collides with score pips', async ({ page }) => {
  await page.setViewportSize({ width: 1536, height: 709 });

  const asset = await page.request.get('/assets/ui/arena-v8.webp');
  expect(asset.ok()).toBeTruthy();
  expect((await asset.body()).length).toBeGreaterThan(45_000);

  await page.goto('/');
  const decoded = await page.evaluate(async () => {
    const img = new Image();
    img.src = '/assets/ui/arena-v8.webp';
    await img.decode();
    return { width: img.naturalWidth, height: img.naturalHeight };
  });
  expect(decoded.width).toBeGreaterThanOrEqual(1200);
  expect(decoded.height).toBeGreaterThanOrEqual(700);

  await page.locator('.scx-splash').click();
  await page.getByRole('button', { name: /JOUER/i }).click();

  await expect(page.locator('html')).toHaveClass(/arena-v9-clean/);
  await expect(page.locator('.scx-battle-hud')).toBeVisible({ timeout: 10_000 });
  await expect(page.locator('#game-canvas canvas')).toBeVisible();
  await expect(page.locator('.battle-message')).toBeHidden();
  await expect(page.locator('.arena-duel-badge')).toBeHidden();

  const round = await page.locator('.hud-round').boundingBox();
  const pips = await page.locator('.score-pips').all();
  expect(round).not.toBeNull();
  expect(pips.length).toBeGreaterThanOrEqual(2);

  for (const pipGroup of pips) {
    const box = await pipGroup.boundingBox();
    if (!box || !round) continue;
    const overlaps = !(
      round.x + round.width <= box.x ||
      box.x + box.width <= round.x ||
      round.y + round.height <= box.y ||
      box.y + box.height <= round.y
    );
    expect(overlaps).toBeFalsy();
  }

  await page.screenshot({ path: 'test-results/arena-v9-clean.png', fullPage: true });
});
