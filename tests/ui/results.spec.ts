import { expect, test } from '@playwright/test'
import { launchNekoServe, runSimulation } from './helpers/electronApp'

test('shows results KPIs and persists the finished run into history', async () => {
  const { page, close } = await launchNekoServe()

  try {
    await runSimulation(page)
    await page.locator('[data-testid="playback-skip-results"]').click()

    await expect(page.locator('[data-testid="results-page"]')).toBeVisible()
    await expect(page.locator('[data-testid="results-kpi-total-served"]')).toBeVisible()
    await expect(page.locator('[data-testid="results-history-toggle"]')).toBeVisible()

    await page.locator('[data-testid="results-history-toggle"]').click()
    await expect(page.locator('[data-testid="results-history-entry"]')).toHaveCount(1)
  } finally {
    await close()
  }
})
