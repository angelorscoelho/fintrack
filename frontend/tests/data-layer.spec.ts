import { expect, test } from '@playwright/test'

const BASE_URL = process.env.PLAYWRIGHT_BASE_URL || 'http://localhost:5173/poc/fintrack/'

async function waitForDashboard(page) {
  const loading = page.getByText(/Loading page/i)
  if (await loading.isVisible().catch(() => false)) {
    await expect(loading).not.toBeVisible({ timeout: 30000 })
  }
}

test.describe('Data layer coherence', () => {
  test('Transactions Last 24H KPI shows value > 0', async ({ page }) => {
    await page.goto(BASE_URL)
    await waitForDashboard(page)

    const title = page.getByText(/Transactions Last 24H|Transações Últimas 24H/i).first()
    await expect(title).toBeVisible({ timeout: 15000 })
    const cardText = await title.locator('xpath=ancestor::div[1]').innerText()
    const valueMatch = cardText.match(/(\d[\d.,]*)/)
    expect(valueMatch).not.toBeNull()

    const numericValue = Number((valueMatch?.[1] || '0').replace(/[.,](?=\d{3}\b)/g, '').replace(',', '.'))
    expect(numericValue).toBeGreaterThan(0)
  })

  test('Demo banner dismiss persists across navigation', async ({ page }) => {
    await page.goto(BASE_URL)
    await waitForDashboard(page)

    const bannerText = page.getByText(/Demo mode|Modo demo|sample data|dados de exemplo/i).first()
    const banner = bannerText.locator('xpath=ancestor::div[1]')
    if (await banner.isVisible().catch(() => false)) {
      await banner.getByRole('button').first().click()
      await expect(banner).not.toBeVisible()
    }

    await page.goto(`${BASE_URL}transactions`)
    await page.goto(BASE_URL)

    const bannerAfterNav = page.getByText(/Demo mode|sample data|dados de exemplo/i).first()
    await expect(bannerAfterNav).not.toBeVisible()
  })

  test('High Risk counter is <= loaded items', async ({ page }) => {
    await page.goto(BASE_URL)
    await waitForDashboard(page)

    const highRiskTitle = page.getByText(/High Risk Transactions|Transações de Alto Risco/i).first()
    const highRiskCard = highRiskTitle.locator('xpath=ancestor::div[2]')
    await expect(highRiskCard).toBeVisible()

    const cardText = await highRiskCard.innerText()
    const countMatch =
      cardText.match(/High Risk Transactions[\s\S]*?(\d+)/i) ||
      cardText.match(/Transações de Alto Risco[\s\S]*?(\d+)/i)
    expect(countMatch).not.toBeNull()
    const counter = Number(countMatch?.[1] || 0)

    const listedItems = (cardText.match(/MOCK-/g) || []).length
    expect(counter).toBeLessThanOrEqual(listedItems)
  })
})
