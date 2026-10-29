import { test, expect } from '@playwright/test';

test('recommendation only claims a choice after a deliberate selection in that mode', async ({ page }) => {
  await page.goto('/');
  const panel = page.locator('#gq-mood-panel');
  await expect(panel).toContainText('Una taza para empezar');
  await expect(panel).not.toContainText('Elegiste');
  await page.getByRole('tab', { name: /Quiero despertar/ }).click();
  await expect(panel).toContainText('Elegiste «quiero despertar»');
  await page.getByRole('tab', { name: 'Por costumbre', exact: true }).click();
  await expect(panel).toContainText('Una taza para empezar');
  await expect(panel).not.toContainText('Elegiste');
  await page.getByRole('tab', { name: /Con leche/ }).click();
  await expect(panel).toContainText('Elegiste «con leche»');
  await page.getByRole('tab', { name: 'Por ánimo', exact: true }).click();
  await expect(panel).toContainText('Elegiste «quiero despertar»');
  await page.reload();
  await expect(panel).toContainText('Una taza para empezar');
});

test('category and process filters stay independent across reloads', async ({ page }) => {
  await page.goto('/cafes');
  const categories = page.getByRole('group', { name: 'Filtrar por categoría', exact: true });
  const processes = page.getByRole('group', { name: 'Filtrar por proceso', exact: true });
  await categories.getByRole('button', { name: 'Colibrí', exact: true }).click();
  await processes.getByRole('button', { name: 'Natural', exact: true }).click();
  await expect(page.locator('main')).toContainText('1 café');
  await expect(page).toHaveURL(/categoria=colibri/);
  await page.reload();
  await expect(categories.getByRole('button', { name: 'Colibrí', exact: true })).toHaveAttribute('aria-pressed', 'true');
  await expect(processes.getByRole('button', { name: 'Natural', exact: true })).toHaveAttribute('aria-pressed', 'true');
  await processes.getByRole('button', { name: 'Honey', exact: true }).click();
  await expect(page.locator('main')).toContainText('0 cafés');
  await page.getByRole('button', { name: 'Limpiar filtros' }).click();
  await expect(categories.getByRole('button', { name: 'Todas', exact: true })).toHaveAttribute('aria-pressed', 'true');
  await processes.getByRole('button', { name: 'Regional', exact: true }).click();
  await expect(page.locator('main')).toContainText('1 café');
  await expect(page.getByRole('heading', { name: 'Chigüiro', exact: true })).toBeVisible();
});
