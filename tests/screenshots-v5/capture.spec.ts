/**
 * v2.5 screenshot capture: Threshold Exceedance Probability feature.
 * Output: docs/screenshots-v5/<NN>-<slug>.png
 *
 * Story we want each shot to tell:
 *   - Mid-batch grid already shows pass/fail chips on every tile
 *   - The global pass-bar overview lets the user set five bars at once
 *   - Drilling into catWelfareScore reveals the 4-cell readout including
 *     P(X >= 3.5), the editor, and both threshold lines (vertical on
 *     the histogram, horizontal on the cumulative-mean chart)
 *   - Edits update everything live without re-running the simulation
 *   - Direction toggle (>= vs <=) flips the shaded pass region
 *
 * Like v4 we run against the mock simulator with Gaussian jitter so the
 * fixture's flat numbers turn into a real-looking distribution. The
 * fixture's catWelfareScore = 3.4 sits right next to the default 3.5
 * bar, which is exactly the borderline case the demo needs (some pass,
 * some fail; not a trivial 100% / 0% picture).
 */
import path from 'node:path'
import fs from 'node:fs/promises'
import { test, type Page } from '@playwright/test'
import { launchNekoServe } from '../ui/helpers/electronApp'

const repoRoot = path.resolve(__dirname, '../..')
const outDir = path.join(repoRoot, 'docs', 'screenshots-v5')

async function shot(page: Page, name: string): Promise<void> {
  await page.waitForTimeout(500)
  const file = path.join(outDir, `${name}.png`)
  // Use viewport screenshot (not fullPage) because Playwright's
  // fullPage doesn't reliably capture beyond viewport in Electron.
  // Each shot is preceded by an explicit scrollTo so the area we
  // care about is in frame.
  await page.screenshot({ path: file, fullPage: false })
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

async function setNumberInputValue(page: Page, selector: string, value: string): Promise<void> {
  // React-controlled <input type="number"> -- direct .value assignment
  // doesn't fire React's synthetic onChange. We have to call the native
  // value setter through the prototype descriptor and dispatch input +
  // change events the way React expects.
  await page.evaluate(({ sel, val }) => {
    const el = document.querySelector(sel) as HTMLInputElement | null
    if (!el) return
    const proto = Object.getPrototypeOf(el)
    const setter = Object.getOwnPropertyDescriptor(proto, 'value')?.set
    setter?.call(el, val)
    el.dispatchEvent(new Event('input', { bubbles: true }))
    el.dispatchEvent(new Event('change', { bubbles: true }))
  }, { sel: selector, val: value })
  await page.waitForTimeout(400)
}

test.describe.configure({ timeout: 360_000 })

test('capture v5 threshold-exceedance screenshots', async () => {
  await fs.mkdir(outDir, { recursive: true })
  // Mock-simulator jitter so the histogram and cumulative-mean curves
  // have visible spread. Without it every replication returns the
  // identical fixture and the charts collapse to flat lines.
  process.env.NEKOSERVE_E2E_SIMULATION_JITTER = '1'
  process.env.NEKOSERVE_E2E_SIMULATION_JITTER_SEED = '20260517'
  // 150 ms per mock run x 60 reps gives ~9 s wall-clock -- enough to
  // see partial progress but short enough that the spec finishes in
  // under two minutes total.
  const { page, close } = await launchNekoServe({ simulationDelayMs: 150 })

  try {
    // Force zh-TW; clear any prior live-mode UI state so screenshots
    // are deterministic across re-runs.
    await page.evaluate(() => {
      try { localStorage.setItem('nekoserve:locale', 'zh-TW') } catch { /* ok */ }
      try { localStorage.removeItem('nekoserve:live-scene-collapsed') } catch { /* ok */ }
      try { localStorage.removeItem('nekoserve:live-selected-metrics') } catch { /* ok */ }
      try { localStorage.removeItem('nekoserve:global-threshold-bar-open') } catch { /* ok */ }
    })
    await page.reload()
    await page.waitForLoadState('domcontentloaded')
    await page.locator('[data-testid="settings-run-button"]').waitFor({ state: 'visible' })
    await page.evaluate(async () => {
      await window.electronAPI.testEnv.setSimulationMode('mock')
    })

    page.on('pageerror', (err) => console.log('[pageerror]', err.message))
    page.on('console', (msg) => {
      if (msg.type() === 'error') console.log('[console.error]', msg.text())
    })

    // ─────────────────────────────────────────────────────────────
    // Set up: batch mode, 60 replications (enough samples to make
    // P(X >= bar) statistically interesting, well below the
    // convergence-window of 100 so the banner stays "waiting" -- we
    // want the eye on the threshold features, not the convergence
    // chip).
    // ─────────────────────────────────────────────────────────────
    await page.locator('[data-testid="nav-tab-settings"]').click()
    await page.waitForTimeout(400)
    await safeClick(page, '[data-testid="settings-mode-batch-toggle"]')
    await setNumberInputValue(page, '[data-testid="settings-batch-replications"]', '60')
    await page.waitForTimeout(300)
    await page.locator('[data-testid="settings-run-button"]').click()
    await page.locator('[data-testid="live-batch-page"]').waitFor({ state: 'visible' })

    // Wait for batch completion so the histogram is full and the
    // pass/fail chips reflect the final cumulative means.
    await page.waitForFunction(() => {
      const txt = Array.from(document.querySelectorAll('span'))
        .map((n) => n.textContent ?? '').join(' ')
      return /完成/.test(txt) && !/進行中/.test(txt)
    }, null, { timeout: 90_000 }).catch(() => {})
    await page.waitForTimeout(800)

    // Keep the scene panel EXPANDED. With the 2-column layout the
    // right column compacts the cumulative-mean chart + histogram so
    // both fit in the viewport -- if we collapse the scene panel the
    // page goes single-column wide and the histogram falls below
    // viewport height. Playwright's fullPage on Electron only
    // captures the viewport, so we can't rely on scroll-to-bottom.
    await page.evaluate(() => window.scrollTo({ top: 0, behavior: 'instant' as ScrollBehavior }))

    // ─────────────────────────────────────────────────────────────
    // 01 — Live grid with pass/fail chips (default thresholds).
    // The chips at the bottom-right of each mini chart are the
    // headline new affordance: ✓ (green) for metrics whose
    // cumulative mean cleared the bar, ✗ (gray) for those that
    // didn't. The horizontal orange dashed line on every chart is
    // the pass bar itself.
    // ─────────────────────────────────────────────────────────────
    await shot(page, '01-live-grid-with-pass-chips')

    // ─────────────────────────────────────────────────────────────
    // 02 — Global pass-bar overview, COLLAPSED.
    // The bar lives between the header card and the main grid. The
    // summary text "已設 5 / 6" tells the user how many metrics have
    // a bar configured without taking up vertical real estate.
    // ─────────────────────────────────────────────────────────────
    await page.locator('[data-testid="global-threshold-toggle"]').scrollIntoViewIfNeeded()
    await shot(page, '02-global-threshold-bar-collapsed')

    // ─────────────────────────────────────────────────────────────
    // 03 — Global pass-bar overview, EXPANDED.
    // Six rows, one per selected metric. Each row: label + >=/<=
    // toggle + number input + clear cross. Shows that the user
    // can configure every visible metric's bar from one place.
    // ─────────────────────────────────────────────────────────────
    await safeClick(page, '[data-testid="global-threshold-toggle"]')
    await page.waitForTimeout(500)
    await page.locator('[data-testid="global-threshold-toggle"]').scrollIntoViewIfNeeded()
    await shot(page, '03-global-threshold-bar-expanded')

    // Close it again so subsequent detail-view shots aren't cluttered.
    await safeClick(page, '[data-testid="global-threshold-toggle"]')
    await page.waitForTimeout(300)

    // ─────────────────────────────────────────────────────────────
    // 04 — Detail view: catWelfareScore with default bar (>= 3.5).
    // The 4th readout cell ("P(X >= 3.5)") is the headline number
    // for the whole feature. Fixture catWelfareScore = 3.4 with
    // jitter spread means we land in a meaningful 30-60% range,
    // not a trivial 0% or 100%.
    // ─────────────────────────────────────────────────────────────
    const welfareTile = page.locator('[data-testid="live-mini-catWelfareScore"]').first()
    await welfareTile.scrollIntoViewIfNeeded()
    await welfareTile.click()
    await page.waitForTimeout(700)
    await page.evaluate(() => window.scrollTo({ top: 0, behavior: 'instant' as ScrollBehavior }))
    await page.waitForTimeout(300)
    await shot(page, '04-detail-catwelfare-default-3-5')

    // ─────────────────────────────────────────────────────────────
    // 05 — Same view, scrolled so the histogram (LiveHistogram) is
    // in frame. Vertical orange dashed line at x = 3.5; the
    // passing side (right of the line, direction = gte) is shaded
    // faint teal. The label at the top of the line reads
    // ">= 3.50: XX%".
    // ─────────────────────────────────────────────────────────────
    await page.evaluate(() => {
      // Both CumulativeMeanChart and LiveHistogram render a
      // role="figure" with the same aria-label. The histogram comes
      // after the cumulative chart in the DOM, so pick the LAST
      // match and bring it into view.
      const figures = Array.from(document.querySelectorAll('[role="figure"]'))
        .filter((el) => (el.getAttribute('aria-label') ?? '').includes('貓咪福祉'))
      const hist = figures[figures.length - 1]
      hist?.scrollIntoView({ block: 'center', behavior: 'instant' as ScrollBehavior })
    })
    await page.waitForTimeout(500)
    await shot(page, '05-detail-histogram-with-threshold-line')

    // ─────────────────────────────────────────────────────────────
    // 06 — Threshold edited live: 3.5 -> 4.0.
    // Same view, but we bump the bar up. The readout, the
    // histogram's vertical line + shading, and the cumulative
    // chart's horizontal line all update in the same frame.
    // No re-run of the simulation.
    // ─────────────────────────────────────────────────────────────
    await page.evaluate(() => window.scrollTo({ top: 0, behavior: 'instant' as ScrollBehavior }))
    await page.waitForTimeout(200)
    await setNumberInputValue(page, '[data-testid="live-threshold-input"]', '4.0')
    await page.waitForTimeout(400)
    await shot(page, '06-detail-threshold-edited-4-0')

    // ─────────────────────────────────────────────────────────────
    // 07 — Direction flipped to "lower is better" (<= 4.0).
    // Demonstrates that the same pass/fail framework works for
    // metrics where smaller is better. The shaded region jumps
    // to the left side of the line; the readout label flips
    // from "P(X >=" to "P(X <=".
    // ─────────────────────────────────────────────────────────────
    const lteToggle = page.locator('button', { hasText: '越低越好' }).first()
    if (await lteToggle.count() > 0) {
      await lteToggle.click()
      await page.waitForTimeout(400)
    }
    await shot(page, '07-detail-direction-toggled-lte')

    // ─────────────────────────────────────────────────────────────
    // 08 — Switch focus to abandonRate (genuinely-lte metric).
    // Reset the welfare bar back to its default so going back to
    // the grid doesn't leave a misleading "all fail" state, then
    // pop into abandonRate where the default <= 0.15 case is the
    // intended UX.
    // ─────────────────────────────────────────────────────────────
    // Restore welfare direction so the grid chip below is sensible.
    const gteToggle = page.locator('button', { hasText: '越高越好' }).first()
    if (await gteToggle.count() > 0) {
      await gteToggle.click()
      await page.waitForTimeout(300)
    }
    await setNumberInputValue(page, '[data-testid="live-threshold-input"]', '3.5')
    await page.waitForTimeout(300)

    await safeClick(page, '[data-testid="live-back-to-grid"]')
    await page.waitForTimeout(500)
    const abandonTile = page.locator('[data-testid="live-mini-abandonRate"]').first()
    await abandonTile.scrollIntoViewIfNeeded()
    await abandonTile.click()
    await page.waitForTimeout(700)
    // Scroll the abandonRate histogram into the centre of the
    // viewport so the lte shading is the focal point.
    await page.evaluate(() => {
      const figures = Array.from(document.querySelectorAll('[role="figure"]'))
        .filter((el) => (el.getAttribute('aria-label') ?? '').includes('放棄等待'))
      const hist = figures[figures.length - 1]
      hist?.scrollIntoView({ block: 'center', behavior: 'instant' as ScrollBehavior })
    })
    await page.waitForTimeout(500)
    await shot(page, '08-detail-abandon-rate-lte-default')

    // ─────────────────────────────────────────────────────────────
    // 09 — Back to grid: the pass/fail chips reflect *current*
    // bars, not stale defaults. Useful because the user often
    // edits a bar then wants to see all metrics again at a glance.
    // ─────────────────────────────────────────────────────────────
    await safeClick(page, '[data-testid="live-back-to-grid"]')
    await page.waitForTimeout(500)
    await page.evaluate(() => window.scrollTo({ top: 0, behavior: 'instant' as ScrollBehavior }))
    await page.waitForTimeout(300)
    await shot(page, '09-grid-after-threshold-edits')

    // ─────────────────────────────────────────────────────────────
    // 10 — Global bar expanded with the "reset all" affordance.
    // Final shot demonstrates that any number of edits can be
    // undone with one click back to the spec-approved defaults
    // (the five from the mid-term report rubric).
    // ─────────────────────────────────────────────────────────────
    await safeClick(page, '[data-testid="global-threshold-toggle"]')
    await page.waitForTimeout(400)
    await page.locator('[data-testid="global-threshold-reset-all"]').scrollIntoViewIfNeeded()
    await page.waitForTimeout(200)
    await shot(page, '10-global-bar-reset-all')
  } finally {
    await close()
  }
})
