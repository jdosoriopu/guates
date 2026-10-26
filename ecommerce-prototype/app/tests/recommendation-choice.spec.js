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
