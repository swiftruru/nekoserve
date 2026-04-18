import { expect, test } from '@playwright/test'
import { launchNekoServe } from './helpers/electronApp'

test('shows the settings error panel when the simulator fails', async () => {
  const { page, close } = await launchNekoServe({
    simulationError: 'BINARY_NOT_FOUND',
    simulationDelayMs: 150,
  })

  try {
    await page.locator('[data-testid="settings-run-button"]').click()

    await expect(page.locator('[data-testid="settings-error-panel"]')).toBeVisible()
    await expect(page.locator('[data-testid="nav-tab-playback"]')).toHaveAttribute('aria-disabled', 'true')
    await expect(page.locator('[data-testid="nav-tab-results"]')).toHaveAttribute('aria-disabled', 'true')
  } finally {
    await close()
  }
})
