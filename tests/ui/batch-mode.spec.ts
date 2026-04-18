import { expect, test } from '@playwright/test'
import { launchNekoServe } from './helpers/electronApp'

test('runs mocked batch mode and shows the batch results banner', async () => {
  const { page, close } = await launchNekoServe({ simulationDelayMs: 300 })

  try {
    await page.locator('[data-testid="settings-mode-batch-toggle"]').click()
    await expect(page.locator('[data-testid="settings-mode-batch-toggle"]')).toHaveAttribute('aria-pressed', 'true')

    const replications = page.locator('[data-testid="settings-batch-replications"]')
    await replications.focus()
    for (let i = 0; i < 7; i += 1) {
      await replications.press('ArrowLeft')
    }

    await expect(replications).toHaveValue('3')

    await page.locator('[data-testid="settings-run-button"]').click()

    await expect(page.locator('[data-testid="settings-progressbar"]')).toBeVisible()
    await expect(page.locator('[data-testid="playback-page"]')).toBeVisible()

    await page.locator('[data-testid="playback-skip-results"]').click()

    await expect(page.locator('[data-testid="results-page"]')).toBeVisible()
    await expect(page.locator('[data-testid="results-batch-banner"]')).toBeVisible()
    await expect(page.locator('[data-testid="results-sweep-section"]')).toHaveCount(0)

    await page.locator('[data-testid="results-history-toggle"]').click()
    await expect(page.locator('[data-testid="results-history-entry"]')).toHaveCount(1)
  } finally {
    await close()
  }
})
