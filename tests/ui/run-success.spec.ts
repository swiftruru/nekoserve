import { expect, test } from '@playwright/test'
import { launchNekoServe } from './helpers/electronApp'

test('runs a mocked simulation and auto-navigates to playback', async () => {
  const { page, close } = await launchNekoServe({ simulationDelayMs: 900 })

  try {
    await page.locator('[data-testid="scenario-button-weekday"]').click()
    await page.locator('[data-testid="settings-run-button"]').click()

    await expect(page.locator('[data-testid="settings-progressbar"]')).toBeVisible()
    await expect(page.locator('[data-testid="playback-page"]')).toBeVisible()
    await expect(page.locator('[data-testid="nav-tab-playback"]')).toHaveAttribute('aria-selected', 'true')
    await expect(page.locator('[data-testid="playback-current-event"]')).not.toHaveText('')
  } finally {
    await close()
  }
})
