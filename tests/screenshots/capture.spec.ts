import path from 'node:path'
import fs from 'node:fs/promises'
import { test, type Page } from '@playwright/test'
import { launchNekoServe, runSimulation } from '../ui/helpers/electronApp'

const repoRoot = path.resolve(__dirname, '../..')
const outDir = path.join(repoRoot, 'docs', 'screenshots')

async function shot(page: Page, name: string): Promise<void> {
  await page.waitForTimeout(350)
  const file = path.join(outDir, `${name}.png`)
  await page.screenshot({ path: file, fullPage: true })
  console.log(`  saved ${path.relative(repoRoot, file)}`)
}

async function safeClick(page: Page, selector: string): Promise<boolean> {
  const loc = page.locator(selector)
  if (await loc.count() === 0) return false
  await loc.first().scrollIntoViewIfNeeded().catch(() => {})
  await loc.first().click().catch(() => {})
  await page.waitForTimeout(250)
  return true
}

async function safeScroll(page: Page, selector: string): Promise<boolean> {
  const loc = page.locator(selector)
  if (await loc.count() === 0) return false
  await loc.first().scrollIntoViewIfNeeded().catch(() => {})
  await page.waitForTimeout(250)
  return true
}

test.describe.configure({ timeout: 120_000 })

test('capture NekoServe screenshots for slide deck', async () => {
  await fs.mkdir(outDir, { recursive: true })
  const { page, close } = await launchNekoServe({ simulationDelayMs: 400 })

  try {
    // Force zh-TW locale before capturing anything
    await page.evaluate(() => {
      try { localStorage.setItem('nekoserve:locale', 'zh-TW') } catch { /* ignore */ }
    })
    await page.reload()
    await page.waitForLoadState('domcontentloaded')
    await page.locator('[data-testid="settings-run-button"]').waitFor({ state: 'visible' })
    await page.evaluate(async () => {
      await window.electronAPI.testEnv.setSimulationMode('mock')
    })

    // 1. Settings page (initial view)
    await page.locator('[data-testid="nav-tab-settings"]').click()
    await page.locator('[data-testid="settings-run-button"]').waitFor({ state: 'visible' })
    await shot(page, '01-settings-overview')

    // 2. Pick the holiday-rush scenario for a more dramatic demo (fallback to paper baseline)
    if (!(await safeClick(page, '[data-testid="scenario-button-paper-holiday-rush"]'))) {
      await safeClick(page, '[data-testid="scenario-button-hirsch-paper"]')
    }
    await shot(page, '02-settings-scenario-selected')

    // 3. Run the simulation -> playback page
    await runSimulation(page)
    await page.waitForTimeout(800)
    await shot(page, '03-playback-default')

    // 4. Toggle live learning overlay if available
    if (await safeClick(page, '[data-testid="playback-learning-toggle"]')) {
      await page.waitForTimeout(500)
      await shot(page, '04-playback-learning-overlay')
      await safeClick(page, '[data-testid="playback-learning-close"]')
    }

    // 5. Skip to results
    await page.locator('[data-testid="playback-skip-results"]').click()
    await page.locator('[data-testid="results-page"]').waitFor({ state: 'visible' })
    await page.waitForTimeout(500)
    await shot(page, '05-results-hero')

    // Scroll through results sections
    await page.evaluate(() => window.scrollTo({ top: window.innerHeight * 0.8, behavior: 'instant' as ScrollBehavior }))
    await page.waitForTimeout(300)
    await shot(page, '06-results-mid-charts')

    await page.evaluate(() => window.scrollTo({ top: window.innerHeight * 1.6, behavior: 'instant' as ScrollBehavior }))
    await page.waitForTimeout(300)
    await shot(page, '07-results-lower-charts')

    // What-If explorer (if present)
    if (await safeClick(page, '[data-testid="results-whatif-toggle"]')) {
      await page.waitForTimeout(600)
      await safeScroll(page, '[data-testid="results-whatif-panel"]')
      await shot(page, '08-results-whatif')
    }

    // History panel
    if (await safeClick(page, '[data-testid="results-history-toggle"]')) {
      await page.waitForTimeout(400)
      await safeScroll(page, '[data-testid="results-history-panel"]')
      await shot(page, '09-results-history')
    }

    // 6. Event log page
    await page.locator('[data-testid="nav-tab-eventlog"]').click()
    await page.locator('[data-testid="eventlog-page"]').waitFor({ state: 'visible' })
    await page.waitForTimeout(400)
    await shot(page, '10-eventlog')

    // 7. How It Works page (expert mode by default)
    await page.locator('[data-testid="nav-tab-howitworks"]').click()
    await page.locator('[data-testid="howitworks-page"]').waitFor({ state: 'visible' })
    await page.waitForTimeout(400)
    await shot(page, '11-howitworks-expert')

    // CI demo (scroll to it for a dedicated screenshot)
    if (await safeScroll(page, '[data-testid="howitworks-ci-demo"]')) {
      await shot(page, '12-howitworks-ci-explorer')
    }

    // Switch to friendly mode
    await page.evaluate(() => window.scrollTo({ top: 0, behavior: 'instant' as ScrollBehavior }))
    if (await safeClick(page, '[data-testid="howitworks-level-friendly"]')) {
      await page.waitForTimeout(400)
      await shot(page, '13-howitworks-friendly')
    }

    // 8. About page
    if (await safeClick(page, '[data-testid="nav-tab-about"]')) {
      await page.waitForTimeout(400)
      await shot(page, '14-about')
    }

    // Last: go back to settings, enable batch + sweep toggles for one bonus screenshot
    await page.locator('[data-testid="nav-tab-settings"]').click()
    await page.locator('[data-testid="settings-run-button"]').waitFor({ state: 'visible' })
    await safeClick(page, '[data-testid="settings-mode-batch-toggle"]')
    await safeClick(page, '[data-testid="settings-mode-sweep-toggle"]')
    await page.evaluate(() => window.scrollTo({ top: document.body.scrollHeight, behavior: 'instant' as ScrollBehavior }))
    await page.waitForTimeout(400)
    await shot(page, '15-settings-batch-and-sweep')
  } finally {
    await close()
  }
})
