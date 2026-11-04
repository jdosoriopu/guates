import { test, expect } from '@playwright/test';

test('recommendation requires explicit grind and adds the selected variant', async ({ page }) => {
  await page.goto('/');
  const panel = page.locator('#gq-mood-panel');
  await panel.getByRole('button', { name: 'Elegir presentación y molienda' }).click();
  const options = page.getByRole('region', { name: 'Configura tu café' });
  const add = options.getByRole('button', { name: /Agregar al carrito/ });
  await expect(add).toBeDisabled();
  await options.getByRole('button', { name: '250 g', exact: true }).click();
  await options.getByRole('button', { name: /Gruesa/ }).click();
  await expect(options.getByRole('status')).toHaveText('Nutria · Caturra Lavado · 250 g · Gruesa');
  await expect(add).toHaveText('Agregar al carrito · $30.000');
  await expect(add).toBeEnabled();
  await expect(page.locator('body')).toHaveJSProperty('scrollWidth', await page.evaluate(() => innerWidth));
  await add.click();
  await expect(options).toHaveCount(0);
  const cart = await page.evaluate(() => JSON.parse(localStorage.getItem('guates.canvas-store.v1')).cart);
  expect(cart).toHaveLength(1);
  expect(cart[0]).toMatchObject({ key: 'lavado', variantId: 'a2f190a6-7b8d-46c7-9c75-107889a6d3b7', size: 0, grind: 'gruesa', qty: 1 });
});
