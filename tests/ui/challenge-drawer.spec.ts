import fs from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'
import { expect, test } from '@playwright/test'
import { launchNekoServe, runSimulation } from './helpers/electronApp'

const challengePassFixture = path.join(__dirname, 'fixtures', 'simulation-challenge-pass.json')

test('opens the challenge drawer and shows a no-results hint before any run', async () => {
  const { page, close } = await launchNekoServe()

  try {
    await page.locator('[data-testid="challenge-drawer-toggle"]').click()
    await expect(page.locator('[data-testid="challenge-drawer"]')).toBeVisible()
    await expect(page.locator('[data-testid="challenge-progress-count"]')).toHaveText('0/8')

    await page.locator('[data-testid="challenge-toggle-low_abandon"]').click()
    await expect(page.locator('[data-testid="challenge-no-results-low_abandon"]')).toBeVisible()

    await page.locator('[data-testid="challenge-drawer-close"]').click()
    await expect(page.locator('[data-testid="challenge-drawer"]')).toHaveCount(0)
  } finally {
    await close()
  }
})

test('persists completed challenges across an app restart', async () => {
  const userDataDir = await fs.mkdtemp(path.join(os.tmpdir(), 'nekoserve-challenge-'))

  try {
    const firstLaunch = await launchNekoServe({
      simulationFixture: challengePassFixture,
      userDataDir,
    })

    try {
      await runSimulation(firstLaunch.page)
      await firstLaunch.page.locator('[data-testid="challenge-drawer-toggle"]').click()
      await firstLaunch.page.locator('[data-testid="challenge-toggle-low_abandon"]').click()
      await firstLaunch.page.locator('[data-testid="challenge-verify-low_abandon"]').click()

      await expect(firstLaunch.page.locator('[data-testid="challenge-progress-count"]')).toHaveText('1/8')
      await expect(firstLaunch.page.locator('[data-testid="challenge-item-low_abandon"]')).toHaveAttribute('data-completed', 'true')
    } finally {
      await firstLaunch.close()
    }

    const secondLaunch = await launchNekoServe({ userDataDir })

    try {
      await secondLaunch.page.locator('[data-testid="challenge-drawer-toggle"]').click()
      await expect(secondLaunch.page.locator('[data-testid="challenge-progress-count"]')).toHaveText('1/8')

      await secondLaunch.page.locator('[data-testid="challenge-toggle-low_abandon"]').click()
      await expect(secondLaunch.page.locator('[data-testid="challenge-item-low_abandon"]')).toHaveAttribute('data-completed', 'true')
      await expect(secondLaunch.page.locator('[data-testid="challenge-explanation-low_abandon"]')).toBeVisible()
      await expect(secondLaunch.page.locator('[data-testid="challenge-verify-low_abandon"]')).toHaveCount(0)
    } finally {
      await secondLaunch.close()
    }
  } finally {
    await fs.rm(userDataDir, { recursive: true, force: true })
  }
})
