import { expect, test } from '@playwright/test'
import { launchNekoServe } from './helpers/electronApp'

test('renders the settings page and keeps result-only tabs disabled before a run', async () => {
  const { page, close } = await launchNekoServe()

  try {
    await expect(page.locator('[data-testid="settings-run-button"]')).toBeVisible()
    await expect(page.locator('[data-testid="nav-tab-settings"]')).toHaveAttribute('aria-selected', 'true')
    await expect(page.locator('[data-testid="nav-tab-results"]')).toHaveAttribute('aria-disabled', 'true')
    await expect(page.locator('[data-testid="nav-tab-playback"]')).toHaveAttribute('aria-disabled', 'true')
    await expect(page.locator('[data-testid="nav-tab-eventlog"]')).toHaveAttribute('aria-disabled', 'true')
  } finally {
    await close()
  }
})
