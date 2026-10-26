import { test, expect } from '@playwright/test';

test('recommendation requires explicit grind and adds the selected variant', async ({ page }) => {
  await page.goto('/');
  const panel = page.locator('#gq-mood-panel');
  await panel.getByRole('button', { name: 'Elegir presentación y molienda' }).click();
  const options = page.getByRole('region', { name: 'Configura tu café' });
  const add = options.getByRole('button', { name: /Agregar al carrito/ });
  await expect(add).toBeDisabled();
  await options.getByRole('button', { name: '500 g', exact: true }).click();
  await options.getByRole('button', { name: /Gruesa/ }).click();
  await expect(options.getByRole('status')).toHaveText('Lavado · 500 g · Gruesa');
  await expect(add).toHaveText('Agregar al carrito · $78.000');
  await expect(add).toBeEnabled();
  await expect(page.locator('body')).toHaveJSProperty('scrollWidth', await page.evaluate(() => innerWidth));
  await add.click();
  await expect(options).toHaveCount(0);
  const cart = await page.evaluate(() => JSON.parse(localStorage.getItem('guates.canvas-store.v1')).cart);
  expect(cart).toHaveLength(1);
  expect(cart[0]).toMatchObject({ key: 'lavado', size: 1, grind: 'gruesa', qty: 1 });
});
