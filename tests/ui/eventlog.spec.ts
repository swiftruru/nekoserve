import { expect, test } from '@playwright/test'
import { launchNekoServe, runSimulation } from './helpers/electronApp'

test('filters the event log and jumps back to playback from a log row', async () => {
  const { page, close } = await launchNekoServe()

  try {
    await runSimulation(page)
    await page.locator('[data-testid="nav-tab-eventlog"]').click()

    const rows = page.locator('[data-testid^="eventlog-row-"]')

    await expect(page.locator('[data-testid="eventlog-page"]')).toBeVisible()
    expect(await rows.count()).toBe(25)

    await page.locator('[data-testid="eventlog-search"]').fill('cat-1')
    await expect(rows).toHaveCount(4)

    await page.locator('[data-testid="eventlog-search"]').fill('')
    await page.locator('[data-testid="eventlog-filter-customer_abandon"]').click()
    await expect(rows).toHaveCount(1)

    await page.locator('[data-testid="eventlog-row-0"]').click()
    await expect(page.locator('[data-testid="playback-page"]')).toBeVisible()
  } finally {
    await close()
  }
})
