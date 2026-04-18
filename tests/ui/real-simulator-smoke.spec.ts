import { expect, test } from '@playwright/test'
import { launchNekoServeViaCdp } from './helpers/cdpElectronApp'

test.describe.configure({ timeout: 60_000 })

test('@real runs the real simulator once and reaches results', async () => {
  const { page, close } = await launchNekoServeViaCdp({ simulationMode: 'real' })

  try {
    await page.locator('[data-testid="scenario-button-weekday"]').click()
    await page.locator('[data-testid="settings-run-button"]').click()

    await Promise.race([
      page.locator('[data-testid="playback-page"]').waitFor({ state: 'visible', timeout: 35_000 }),
      page.locator('[data-testid="settings-error-panel"]').waitFor({ state: 'visible', timeout: 35_000 }).then(() => {
        throw new Error('Real simulator smoke reached the settings error panel')
      }),
    ])

    await page.locator('[data-testid="playback-skip-results"]').click()
    await expect(page.locator('[data-testid="results-page"]')).toBeVisible()
    await expect(page.locator('[data-testid="results-kpi-total-served"]')).toBeVisible()
  } finally {
    await close()
  }
})
