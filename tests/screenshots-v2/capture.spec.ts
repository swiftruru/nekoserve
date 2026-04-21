import path from 'node:path'
import fs from 'node:fs/promises'
import { test, type Page } from '@playwright/test'
import { launchNekoServeViaCdp } from '../ui/helpers/cdpElectronApp'

const repoRoot = path.resolve(__dirname, '../..')
const outDir = path.join(repoRoot, 'docs', 'screenshots-v2')

async function shot(page: Page, name: string): Promise<void> {
  await page.waitForTimeout(400)
  const file = path.join(outDir, `${name}.png`)
  await page.screenshot({ path: file, fullPage: true })
  console.log(`  saved ${path.relative(repoRoot, file)}`)
}

async function safeClick(page: Page, selector: string): Promise<boolean> {
  const loc = page.locator(selector)
  if (await loc.count() === 0) return false
  await loc.first().scrollIntoViewIfNeeded().catch(() => {})
  await loc.first().click().catch(() => {})
  await page.waitForTimeout(300)
  return true
}

async function scrollToText(page: Page, text: string): Promise<boolean> {
  const loc = page.getByText(text, { exact: false }).first()
  if (await loc.count() === 0) return false
  await loc.scrollIntoViewIfNeeded().catch(() => {})
  await page.waitForTimeout(350)
  return true
}

test.describe.configure({ timeout: 240_000 })

test('capture NekoServe v2 screenshots with real SimPy data', async () => {
  await fs.mkdir(outDir, { recursive: true })
  const launched = await launchNekoServeViaCdp({ simulationMode: 'real' })
  const { page, close } = launched

  try {
    // Force zh-TW
    await page.evaluate(() => {
      try { localStorage.setItem('nekoserve:locale', 'zh-TW') } catch { /* ignore */ }
    })
    await page.reload()
    await page.waitForLoadState('domcontentloaded')
    await page.locator('[data-testid="settings-run-button"]').waitFor({ state: 'visible' })
    await page.evaluate(async () => {
      await window.electronAPI.testEnv.setSimulationMode('real')
    })

    // 01 Settings overview (initial weekday)
    await page.locator('[data-testid="nav-tab-settings"]').click()
    await page.locator('[data-testid="settings-run-button"]').waitFor({ state: 'visible' })
    await shot(page, '01-settings-overview')

    // 02 Switch to holiday-rush
    await page.locator('[data-testid="scenario-button-holiday-rush"]').click()
    await page.waitForTimeout(400)
    await shot(page, '02-settings-scenario-holiday-rush')

    // 03 Run real SimPy simulation, capture playback while animating
    await page.locator('[data-testid="settings-run-button"]').click()
    await page.locator('[data-testid="playback-page"]').waitFor({ state: 'visible', timeout: 60_000 })
    // Let the animation play a bit so the floor plan has activity
    await page.waitForTimeout(1500)
    await shot(page, '03-playback-default')

    // 04 Toggle live learning overlay
    if (await safeClick(page, '[data-testid="playback-learning-toggle"]')) {
      await page.waitForTimeout(800)
      await shot(page, '04-playback-learning-overlay')
      await safeClick(page, '[data-testid="playback-learning-close"]')
    }

    // Skip to results (simulation already completed in real mode by the time playback opened)
    await page.locator('[data-testid="playback-skip-results"]').click()
    await page.locator('[data-testid="results-page"]').waitFor({ state: 'visible' })
    await page.waitForTimeout(800)

    // 05 Results hero (scroll to top)
    await page.evaluate(() => window.scrollTo({ top: 0, behavior: 'instant' as ScrollBehavior }))
    await page.locator('[data-testid="results-page"]').scrollIntoViewIfNeeded()
    await shot(page, '05-results-hero-completed')

    // 06 Results mid: try to find a wait-time related anchor by Chinese text
    const midAnchors = ['等待時間', '等待分析', '平均等待', '等候時間']
    for (const t of midAnchors) {
      if (await scrollToText(page, t)) break
    }
    await shot(page, '06-results-wait-analysis')

    // 07 Results: stay distribution (cat vs no-cat)
    await scrollToText(page, '停留時間分布')
    await shot(page, '07-results-stay-distribution')

    // 08 What-If explorer
    if (await safeClick(page, '[data-testid="results-whatif-toggle"]')) {
      await page.waitForTimeout(700)
    }
    const whatif = page.locator('[data-testid="results-whatif-panel"]')
    if (await whatif.count() > 0) {
      await whatif.scrollIntoViewIfNeeded()
      await page.waitForTimeout(400)
    }
    await shot(page, '08-results-whatif')

    // 09 History panel
    await page.evaluate(() => window.scrollTo({ top: 0, behavior: 'instant' as ScrollBehavior }))
    await page.waitForTimeout(300)
    if (await safeClick(page, '[data-testid="results-history-toggle"]')) {
      await page.waitForTimeout(500)
      const hist = page.locator('[data-testid="results-history-panel"]')
      if (await hist.count() > 0) {
        await hist.scrollIntoViewIfNeeded()
        await page.waitForTimeout(300)
      }
    }
    await shot(page, '09-results-history')

    // 10 Event log
    await page.locator('[data-testid="nav-tab-eventlog"]').click()
    await page.locator('[data-testid="eventlog-page"]').waitFor({ state: 'visible' })
    await page.waitForTimeout(500)
    await shot(page, '10-eventlog')

    // How It Works: capture CI Explorer in BOTH expert and friendly mode for true A/B comparison
    await page.locator('[data-testid="nav-tab-howitworks"]').click()
    await page.locator('[data-testid="howitworks-page"]').waitFor({ state: 'visible' })
    await page.waitForTimeout(500)

    // Make sure we're in expert mode first
    await safeClick(page, '[data-testid="howitworks-level-expert"]')
    await page.waitForTimeout(400)

    // 11 FEL Stepper (the iconic "DES clock" demo, expert)
    await scrollToText(page, '離散事件')
    await shot(page, '11-howitworks-fel-stepper-expert')

    // 12 CI Explorer in expert mode (pair-A for the friendly comparison)
    await scrollToText(page, '量化不確定性')
    await page.waitForTimeout(400)
    await shot(page, '12-howitworks-ci-expert')

    // 13 CI Explorer in friendly mode (pair-B): same demo, switched
    await page.evaluate(() => window.scrollTo({ top: 0, behavior: 'instant' as ScrollBehavior }))
    await safeClick(page, '[data-testid="howitworks-level-friendly"]')
    await page.waitForTimeout(500)
    await scrollToText(page, '量化不確定性')
    await page.waitForTimeout(400)
    await shot(page, '13-howitworks-ci-friendly')

    // 14 About page (use larger viewport for higher-res hero)
    await page.setViewportSize({ width: 1600, height: 1200 })
    await page.locator('[data-testid="nav-tab-about"]').click()
    await page.waitForTimeout(800)
    await shot(page, '14-about')
    await page.setViewportSize({ width: 1440, height: 960 })

    // 15 Settings with batch + sweep enabled
    await page.locator('[data-testid="nav-tab-settings"]').click()
    await page.locator('[data-testid="settings-run-button"]').waitFor({ state: 'visible' })
    await safeClick(page, '[data-testid="settings-mode-batch-toggle"]')
    await safeClick(page, '[data-testid="settings-mode-sweep-toggle"]')
    await page.evaluate(() => window.scrollTo({ top: document.body.scrollHeight, behavior: 'instant' as ScrollBehavior }))
    await page.waitForTimeout(500)
    await shot(page, '15-settings-batch-and-sweep')
  } finally {
    await close()
  }
})
