import { expect, test } from '@playwright/test'
import { launchNekoServe, runSimulation } from './helpers/electronApp'

test('expands the What-If Explorer, runs a what-if comparison, and collapses back to the teaser card', async () => {
  const { page, close } = await launchNekoServe()

  try {
    await runSimulation(page)
    await page.locator('[data-testid="playback-skip-results"]').click()

    const whatIfToggle = page.locator('[data-testid="results-whatif-toggle"]')
    await whatIfToggle.scrollIntoViewIfNeeded()
    await expect(whatIfToggle).toBeVisible()

    await whatIfToggle.click()
    await expect(page.locator('[data-testid="results-whatif-panel"]')).toBeVisible()

    const seatSlider = page.locator('[data-testid="results-whatif-slider-seatCount"]')
    await seatSlider.focus()
    await seatSlider.press('ArrowRight')

    await expect(page.locator('[data-testid="results-whatif-comparison"]')).toBeVisible({ timeout: 5000 })

    await page.locator('[data-testid="results-whatif-collapse"]').click()
    await expect(page.locator('[data-testid="results-whatif-panel"]')).toHaveCount(0)
    await expect(page.locator('[data-testid="results-whatif-toggle"]')).toBeVisible()
  } finally {
    await close()
  }
})
