import { expect, test } from '@playwright/test'
import { launchNekoServe } from './helpers/electronApp'

test('opens the learning panel, switches sections, resets to the new page context, and closes cleanly', async () => {
  const { page, close } = await launchNekoServe()

  try {
    await page.locator('[data-testid="learning-panel-toggle"]').click()

    await expect(page.locator('[data-testid="learning-panel"]')).toBeVisible()
    await expect(page.locator('[data-testid="learning-panel"]')).toHaveAttribute('data-page', 'settings')
    await expect(page.locator('[data-testid="learning-panel-context"]')).toHaveAttribute('data-page', 'settings')
    await expect(page.locator('[data-testid="learning-panel-section-des-intro"]')).toHaveAttribute('data-open', 'true')
    await expect(page.locator('[data-testid="learning-panel-body-des-intro"]')).toBeVisible()

    await page.locator('[data-testid="learning-panel-section-poisson"]').click()
    await expect(page.locator('[data-testid="learning-panel-section-poisson"]')).toHaveAttribute('data-open', 'true')
    await expect(page.locator('[data-testid="learning-panel-section-des-intro"]')).toHaveAttribute('data-open', 'false')
    await expect(page.locator('[data-testid="learning-panel-body-poisson"]')).toBeVisible()

    await page.locator('[data-testid="nav-tab-about"]').click()
    await expect(page.locator('[data-testid="learning-panel"]')).toHaveAttribute('data-page', 'about')
    await expect(page.locator('[data-testid="learning-panel-context"]')).toHaveAttribute('data-page', 'about')
    await expect(page.locator('[data-testid="learning-panel-section-queueing-theory"]')).toHaveAttribute('data-open', 'true')
    await expect(page.locator('[data-testid="learning-panel-body-queueing-theory"]')).toBeVisible()

    await page.locator('[data-testid="learning-panel-close"]').click()
    await expect(page.locator('[data-testid="learning-panel"]')).toHaveCount(0)
  } finally {
    await close()
  }
})
