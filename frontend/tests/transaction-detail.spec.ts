import { expect, test } from '@playwright/test'

const BASE_URL = process.env.PLAYWRIGHT_BASE_URL || 'http://localhost:5173/poc/fintrack/'

test('transaction detail opens as page and includes required fields', async ({ page }) => {
  await page.goto(`${BASE_URL}transactions`)

  const firstRow = page.locator('tbody tr').first()
  await expect(firstRow).toBeVisible()
  await firstRow.click()

  await expect(page).toHaveURL(/\/poc\/fintrack\/transactions\/[^/?#]+$/)
  await expect(page.getByText('Conta de Origem')).toBeVisible()
  await expect(page.getByText('Conta de Destino')).toBeVisible()
  await expect(page.getByText('Analise AI')).toBeVisible()
})
