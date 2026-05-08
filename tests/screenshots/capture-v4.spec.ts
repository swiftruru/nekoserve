/**
 * v2.4 midterm-report screenshot capture: live convergence curves feature.
 * Output: docs/screenshot-v4/<NN>-<slug>.png
 *
 * The mock simulator returns the same fixture every call, which would
 * make every cumulative-mean curve flat and every histogram a single
 * bar. Before kicking off the batch we wrap window.electronAPI.runSimulation
 * to add small Gaussian jitter to every numeric metric so the live charts
 * look the way a real batch run looks.
 */
import path from 'node:path'
import fs from 'node:fs/promises'
import { test, type Page } from '@playwright/test'
import { launchNekoServe } from '../ui/helpers/electronApp'

const repoRoot = path.resolve(__dirname, '../..')
const outDir = path.join(repoRoot, 'docs', 'screenshot-v4')

async function shot(page: Page, name: string): Promise<void> {
  await page.waitForTimeout(450)
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

test.describe.configure({ timeout: 360_000 })

test('capture v4 live-convergence screenshots', async () => {
  await fs.mkdir(outDir, { recursive: true })
  // Turn on the main-process mock jitter so cumulative-mean curves and
  // histograms have visible spread (otherwise the constant fixture
  // gives perfectly flat lines and a single-bar histogram).
  process.env.NEKOSERVE_E2E_SIMULATION_JITTER = '1'
  process.env.NEKOSERVE_E2E_SIMULATION_JITTER_SEED = '20260507'
  // 200 ms per mock run × 50 reps gives the batch ~10 s of wall-clock
  // time, enough for the mid-run polling below to actually catch a
  // partially-completed state for screenshot 04 (instead of finishing
  // before we get there).
  const { page, close } = await launchNekoServe({ simulationDelayMs: 200 })

  try {
    // Force zh-TW locale.
    await page.evaluate(() => {
      try { localStorage.setItem('nekoserve:locale', 'zh-TW') } catch { /* ignore */ }
      // Reset any prior live-mode UI state so screenshots are deterministic.
      try { localStorage.removeItem('nekoserve:live-scene-collapsed') } catch { /* ignore */ }
      try { localStorage.removeItem('nekoserve:live-selected-metrics') } catch { /* ignore */ }
    })
    await page.reload()
    await page.waitForLoadState('domcontentloaded')
    await page.locator('[data-testid="settings-run-button"]').waitFor({ state: 'visible' })
    await page.evaluate(async () => {
      await window.electronAPI.testEnv.setSimulationMode('mock')
    })

    // Surface page errors during development of this spec.
    page.on('pageerror', (err) => console.log('[pageerror]', err.message))
    page.on('console', (msg) => {
      if (msg.type() === 'error') console.log('[console.error]', msg.text())
    })

    // ─────────────────────────────────────────────────────────────
    // 01 — Empty state on the Live page (no batch yet).
    // ─────────────────────────────────────────────────────────────
    await page.locator('[data-testid="nav-tab-liveMode"]').click()
    await page.waitForTimeout(600)
    await page.locator('[data-testid="live-batch-empty"]').waitFor({ state: 'visible' })
    await shot(page, '01-live-empty-state')

    // ─────────────────────────────────────────────────────────────
    // 02 — Settings page with batch mode enabled, replications = 120.
    // ─────────────────────────────────────────────────────────────
    await page.locator('[data-testid="nav-tab-settings"]').click()
    await page.waitForTimeout(500)
    await safeClick(page, '[data-testid="settings-mode-batch-toggle"]')
    await page.waitForTimeout(300)
    // Set replications = 120 so we have enough samples to trigger the
    // convergence detector (window size = 100). The control is a
    // <input type="range">, so we have to drive React's onChange via
    // the native HTMLInputElement value setter — direct .value =
    // assignment doesn't fire a synthetic change event.
    await page.evaluate(() => {
      const el = document.querySelector('[data-testid="settings-batch-replications"]') as HTMLInputElement | null
      if (!el) return
      const proto = Object.getPrototypeOf(el)
      const setter = Object.getOwnPropertyDescriptor(proto, 'value')?.set
      setter?.call(el, '120')
      el.dispatchEvent(new Event('input', { bubbles: true }))
      el.dispatchEvent(new Event('change', { bubbles: true }))
    })
    await page.waitForTimeout(300)
    await page.locator('[data-testid="settings-batch-replications"]').scrollIntoViewIfNeeded()
    await shot(page, '02-settings-batch-mode-enabled')

    // ─────────────────────────────────────────────────────────────
    // 03 — Bootstrap: Live page on first run.
    // ─────────────────────────────────────────────────────────────
    await page.locator('[data-testid="settings-run-button"]').click()
    // The app auto-navigates to Live mode when a batch starts. Wait for
    // the live page to render, then capture before the first run completes.
    await page.locator('[data-testid="live-batch-page"]').waitFor({ state: 'visible' })
    await shot(page, '03-live-bootstrap-first-run')

    // ─────────────────────────────────────────────────────────────
    // Wait until ~40-60% complete then capture small-multiples mid-run.
    // We poll the progress label text and stop the moment completed is
    // strictly between 40 and 60% of the planned total (so we get a
    // visibly partial set of curves and an in-progress progress bar).
    // ─────────────────────────────────────────────────────────────
    await page.waitForFunction(() => {
      const el = Array.from(document.querySelectorAll('span'))
        .find((n) => /已完成\s*\d+\s*\/\s*\d+/.test(n.textContent ?? ''))
      if (!el) return false
      const m = (el.textContent ?? '').match(/已完成\s*(\d+)\s*\/\s*(\d+)/)
      if (!m) return false
      const completed = Number(m[1])
      const total = Number(m[2])
      return total > 0 && completed >= Math.ceil(total * 0.4) && completed <= Math.floor(total * 0.6)
    }, null, { timeout: 30_000 }).catch(() => {})
    await shot(page, '04-live-grid-mid-run')

    // ─────────────────────────────────────────────────────────────
    // 05 — Wait until done (status badge reads 完成), grid view.
    // ─────────────────────────────────────────────────────────────
    await page.waitForFunction(() => {
      const txt = Array.from(document.querySelectorAll('span'))
        .map((n) => n.textContent ?? '')
        .join(' ')
      return /完成/.test(txt) && !/進行中/.test(txt)
    }, null, { timeout: 60_000 }).catch(() => {})
    await page.waitForTimeout(800)
    await shot(page, '05-live-grid-completed')

    // ─────────────────────────────────────────────────────────────
    // 06 — Detail view of one metric (cumulative mean + readouts).
    // Pick abandonRate — fixture-backed, non-zero, and our jitter
    // gives it visible spread so the convergence curve and histogram
    // both look alive. (The two welfare/satisfaction tiles are NOT in
    // the fixture so they'd show "waiting for first data".)
    // ─────────────────────────────────────────────────────────────
    const tile = page.locator('[data-testid="live-mini-abandonRate"]').first()
    await tile.scrollIntoViewIfNeeded()
    await tile.click()
    await page.waitForTimeout(700)
    await page.evaluate(() => window.scrollTo({ top: 0, behavior: 'instant' as ScrollBehavior }))
    await shot(page, '06-live-detail-mean-curve')

    // ─────────────────────────────────────────────────────────────
    // 07 — Same detail view scrolled to the histogram & shape label.
    // ─────────────────────────────────────────────────────────────
    await page.evaluate(() => window.scrollTo({ top: document.body.scrollHeight, behavior: 'instant' as ScrollBehavior }))
    await page.waitForTimeout(400)
    await shot(page, '07-live-detail-histogram')

    // ─────────────────────────────────────────────────────────────
    // 08 — Converged green banner (or waiting banner if not stable).
    // Scroll up so banner + readouts + chart are all visible.
    // ─────────────────────────────────────────────────────────────
    await page.evaluate(() => window.scrollTo({ top: 200, behavior: 'instant' as ScrollBehavior }))
    await page.waitForTimeout(300)
    await shot(page, '08-live-detail-converged-banner')

    // ─────────────────────────────────────────────────────────────
    // 09 — Metric picker open (back to grid first).
    // ─────────────────────────────────────────────────────────────
    await safeClick(page, '[data-testid="live-back-to-grid"]')
    await page.waitForTimeout(400)
    await page.evaluate(() => window.scrollTo({ top: 0, behavior: 'instant' as ScrollBehavior }))
    await safeClick(page, '[data-testid="live-metric-picker-toggle"]')
    await page.waitForTimeout(500)
    await shot(page, '09-live-metric-picker-open')

    // ─────────────────────────────────────────────────────────────
    // 10 — Scene panel collapsed: charts span full width.
    // ─────────────────────────────────────────────────────────────
    await safeClick(page, '[data-testid="live-metric-picker-toggle"]') // close picker
    await page.waitForTimeout(200)
    await safeClick(page, '[data-testid="live-scene-collapse"]')
    await page.waitForTimeout(500)
    await page.evaluate(() => window.scrollTo({ top: 0, behavior: 'instant' as ScrollBehavior }))
    await shot(page, '10-live-scene-collapsed-full-charts')
  } finally {
    await close()
  }
})
