import { expect, test } from '@playwright/test'
import { launchNekoServe } from './helpers/electronApp'

test('runs mocked sweep mode and lands on results with sweep output', async () => {
  const { page, close } = await launchNekoServe({ simulationDelayMs: 150 })

  try {
    await page.locator('[data-testid="settings-mode-sweep-toggle"]').click()
    await expect(page.locator('[data-testid="settings-mode-sweep-toggle"]')).toHaveAttribute('aria-pressed', 'true')

    await page.locator('[data-testid="settings-sweep-param"]').click()
    await page.locator('[data-testid="settings-sweep-param-option-seatCount"]').click()

    await page.locator('[data-testid="settings-sweep-from"]').fill('2')
    await page.locator('[data-testid="settings-sweep-to"]').fill('4')
    await page.locator('[data-testid="settings-sweep-step"]').fill('1')
    await page.locator('[data-testid="settings-sweep-replications"]').fill('2')

    await page.locator('[data-testid="settings-run-button"]').click()

    await expect(page.locator('[data-testid="settings-progressbar"]')).toBeVisible()
    await expect(page.locator('[data-testid="results-page"]')).toBeVisible()
    await expect(page.locator('[data-testid="results-sweep-section"]')).toBeVisible()
    await expect(page.locator('[data-testid="results-sweep-export"]')).toBeVisible()
    await expect(page.locator('[data-testid="results-batch-banner"]')).toHaveCount(0)
  } finally {
    await close()
  }
})
