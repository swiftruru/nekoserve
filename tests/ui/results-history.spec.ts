import { expect, test } from '@playwright/test'
import { launchNekoServe, runSimulation } from './helpers/electronApp'

test('compares two history runs and loads an older run from the results history panel', async () => {
  const { page, close } = await launchNekoServe()

  try {
    await runSimulation(page)
    await page.locator('[data-testid="playback-skip-results"]').click()

    await page.locator('[data-testid="nav-tab-settings"]').click()
    await page.locator('[data-testid="scenario-button-paper-holiday-rush"]').click()

    await runSimulation(page)
    await page.locator('[data-testid="playback-skip-results"]').click()

    await page.locator('[data-testid="results-history-toggle"]').click()
    await expect(page.locator('[data-testid="results-history-panel"]')).toBeVisible()

    const entries = page.locator('[data-testid="results-history-entry"]')
    await expect(entries).toHaveCount(2)
    await expect(entries.nth(0)).toHaveAttribute('data-current', 'true')
    await expect(entries.nth(1)).toHaveAttribute('data-current', 'false')

    await entries.nth(0).locator('[data-testid="results-history-select"]').click()
    await entries.nth(1).locator('[data-testid="results-history-select"]').click()

    await expect(page.locator('[data-testid="results-comparison-table"]')).toBeVisible()
    await expect(page.locator('[data-testid="results-comparison-config-diff"]')).toBeVisible()

    await entries.nth(1).locator('[data-testid="results-history-load"]').click()
    await expect(entries.nth(1)).toHaveAttribute('data-current', 'true')
    await expect(entries.nth(0)).toHaveAttribute('data-current', 'false')
  } finally {
    await close()
  }
})

test('deletes one history entry and clears the rest from the results history panel', async () => {
  const { page, close } = await launchNekoServe()

  try {
    await runSimulation(page)
    await page.locator('[data-testid="playback-skip-results"]').click()

    await page.locator('[data-testid="nav-tab-settings"]').click()
    await page.locator('[data-testid="scenario-button-paper-holiday-rush"]').click()
    await runSimulation(page)
    await page.locator('[data-testid="playback-skip-results"]').click()

    await page.locator('[data-testid="nav-tab-settings"]').click()
    await page.locator('[data-testid="scenario-button-paper-cat-nap"]').click()
    await runSimulation(page)
    await page.locator('[data-testid="playback-skip-results"]').click()

    await page.locator('[data-testid="results-history-toggle"]').click()
    await expect(page.locator('[data-testid="results-history-entry"]')).toHaveCount(3)

    await page.locator('[data-testid="results-history-entry"]').nth(2).locator('[data-testid="results-history-delete"]').click()
    await expect(page.locator('[data-testid="results-history-delete-dialog"]')).toBeVisible()
    await page.locator('[data-testid="results-history-delete-confirm"]').click()

    await expect(page.locator('[data-testid="results-history-delete-dialog"]')).toHaveCount(0)
    await expect(page.locator('[data-testid="results-history-entry"]')).toHaveCount(2)
    await expect(page.locator('[data-testid="results-history-clear-all"]')).toBeVisible()

    await page.locator('[data-testid="results-history-clear-all"]').click()
    await expect(page.locator('[data-testid="results-history-clear-dialog"]')).toBeVisible()
    await page.locator('[data-testid="results-history-clear-confirm"]').click()

    await expect(page.locator('[data-testid="results-history-clear-dialog"]')).toHaveCount(0)
    await expect(page.locator('[data-testid="results-page"]')).toBeVisible()
    await expect(page.locator('[data-testid="results-history-toggle"]')).toHaveCount(0)
  } finally {
    await close()
  }
})
