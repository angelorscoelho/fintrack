import { expect, test } from '@playwright/test'

const BASE_URL = process.env.PLAYWRIGHT_BASE_URL || 'http://localhost:5173/poc/fintrack/'

test.describe('Dashboard UI bug fixes', () => {
  test('Normal volume filter is inactive by default', async ({ page }) => {
    await page.goto(BASE_URL)
    const normalFilter = page.getByTestId('volume-filter-normal')
    await expect(normalFilter).toBeVisible()
    await expect(normalFilter).toHaveAttribute('aria-pressed', 'false')
  })

  test('AI sidebar is visible on initial page load', async ({ page }) => {
    await page.goto(BASE_URL)
    const sidebar = page.getByTestId('ai-sidebar-container')
    await expect(sidebar).toBeVisible()
    await expect(sidebar).toHaveAttribute('aria-hidden', 'false')
  })

  test('Category tooltip coordinates change on different hover points', async ({ page }) => {
    await page.goto(BASE_URL)
    const chartWrap = page.getByTestId('category-chart-wrap')
    await expect(chartWrap).toBeVisible()

    const box = await chartWrap.boundingBox()
    expect(box).not.toBeNull()
    const cx = (box?.x || 0) + (box?.width || 0) / 2
    const cy = (box?.y || 0) + 100
    const r = 50

    await page.mouse.move(cx + r, cy)
    const tooltip = page.getByTestId('category-tooltip')
    await expect(tooltip).toBeVisible()
    const styleA = (await tooltip.getAttribute('style')) || ''

    await page.mouse.move(cx - r, cy)
    await expect(tooltip).toBeVisible()
    const styleB = (await tooltip.getAttribute('style')) || ''

    expect(styleA).not.toEqual(styleB)
    expect(styleA).toContain('left:')
    expect(styleA).toContain('top:')
    expect(styleB).toContain('left:')
    expect(styleB).toContain('top:')
  })
})
