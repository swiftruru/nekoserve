/**
 * v2.3.0 weekly-report screenshot capture: literature-integration focal areas.
 * Output: docs/screenshot-v3/<NN>-<slug>.png
 */
import path from 'node:path'
import fs from 'node:fs/promises'
import { test, type Page } from '@playwright/test'
import { launchNekoServe, runSimulation } from '../ui/helpers/electronApp'

const repoRoot = path.resolve(__dirname, '../..')
const outDir = path.join(repoRoot, 'docs', 'screenshot-v3')

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

async function safeScroll(page: Page, selector: string): Promise<boolean> {
  const loc = page.locator(selector)
  if (await loc.count() === 0) return false
  await loc.first().scrollIntoViewIfNeeded().catch(() => {})
  await page.waitForTimeout(300)
  return true
}

async function scrollToText(page: Page, text: string): Promise<boolean> {
  const loc = page.getByText(text, { exact: false }).first()
  if (await loc.count() === 0) return false
  await loc.scrollIntoViewIfNeeded().catch(() => {})
  await page.waitForTimeout(250)
  return true
}

test.describe.configure({ timeout: 240_000 })

test('capture v3 literature-integration screenshots', async () => {
  await fs.mkdir(outDir, { recursive: true })
  const { page, close } = await launchNekoServe({ simulationDelayMs: 400 })

  try {
    // Force zh-TW locale
    await page.evaluate(() => {
      try { localStorage.setItem('nekoserve:locale', 'zh-TW') } catch { /* ignore */ }
    })
    await page.reload()
    await page.waitForLoadState('domcontentloaded')
    await page.locator('[data-testid="settings-run-button"]').waitFor({ state: 'visible' })
    await page.evaluate(async () => {
      await window.electronAPI.testEnv.setSimulationMode('mock')
    })

    // Pick the canonical Hirsch paper scenario so the validation page has real numbers
    await safeClick(page, '[data-testid="scenario-button-hirsch-paper"]')
    await page.waitForTimeout(400)

    // Run sim once so the validation page has metrics to compare against
    await runSimulation(page)
    await page.waitForTimeout(800)

    // ───── 文獻依據頁（Citations）4 個 tab ─────
    await page.locator('[data-testid="nav-tab-citations"]').click()
    await page.waitForTimeout(800)
    await page.evaluate(() => window.scrollTo({ top: 0, behavior: 'instant' as ScrollBehavior }))
    await shot(page, '01-citations-hero-story-tab')

    await safeClick(page, '#landscape-tab-methodology')
    await page.waitForTimeout(500)
    await shot(page, '02-citations-methodology-tab')

    await safeClick(page, '#landscape-tab-params')
    await page.waitForTimeout(500)
    await shot(page, '03-citations-parameter-radial')

    await safeClick(page, '#landscape-tab-benchmark')
    await page.waitForTimeout(500)
    await shot(page, '04-citations-benchmark-bars')

    // Click the RESTING bar to open StateDetailCard
    const restingBar = page.locator('button:has-text("RESTING"), [data-state="RESTING"]').first()
    if (await restingBar.count() > 0) {
      await restingBar.scrollIntoViewIfNeeded().catch(() => {})
      await restingBar.click().catch(() => {})
      await page.waitForTimeout(700)
      await shot(page, '05-citations-state-detail-card')
    } else {
      // Fallback: click any bar via aria-style markup
      await safeClick(page, '[data-testid="benchmark-bar"]')
      await page.waitForTimeout(500)
      await shot(page, '05-citations-state-detail-card')
    }

    // ───── 流程圖：CitationPipelineFlow ─────
    if (await scrollToText(page, 'pipeline × 文獻對應')) {
      await page.waitForTimeout(400)
      await shot(page, '06-citations-pipeline-flow')
    }

    // ───── 文獻附錄區（13 篇引用清單） ─────
    await page.locator('[data-testid="citations-chapter-appendix"]').scrollIntoViewIfNeeded().catch(() => {})
    await page.waitForTimeout(400)
    await shot(page, '07-citations-appendix-cards')

    // ───── 驗證模式頁（Validation） ─────
    await page.locator('[data-testid="nav-tab-validation"]').click()
    await page.waitForTimeout(1200)
    await page.evaluate(() => window.scrollTo({ top: 0, behavior: 'instant' as ScrollBehavior }))
    await page.waitForTimeout(400)

    // Click "執行驗證" to actually compute the validation report (otherwise page is mostly empty)
    const runValidationBtn = page.getByRole('button', { name: /執行驗證/ }).first()
    if (await runValidationBtn.count() > 0) {
      await runValidationBtn.click().catch(() => {})
      await page.waitForTimeout(1500)
    }
    await page.evaluate(() => window.scrollTo({ top: 0, behavior: 'instant' as ScrollBehavior }))
    await page.waitForTimeout(300)
    await shot(page, '08-validation-overview')

    // Expand both Methodology + Provenance cards by clicking each button
    // that contains the title text. Multiple passes in case clicking
    // changes the DOM and re-renders.
    for (let pass = 0; pass < 2; pass++) {
      const allButtons = await page.locator('button').all()
      for (const btn of allButtons) {
        const txt = await btn.textContent().catch(() => '')
        const cleaned = (txt ?? '').replace(/\s+/g, ' ').trim()
        const isCollapsed = (await btn.getAttribute('aria-expanded').catch(() => '')) === 'false'
        if (isCollapsed && /驗證方法學|實證資料提取紀錄/.test(cleaned)) {
          await btn.scrollIntoViewIfNeeded().catch(() => {})
          await btn.click({ force: true }).catch(() => {})
          await page.waitForTimeout(500)
        }
      }
    }
    await page.waitForTimeout(900)

    // Three long scroll-position screenshots cover the whole validation
    // page. Each is a full-page screenshot so they overlap; pick whichever
    // one shows the section you need for slides.
    await page.evaluate(() => window.scrollTo({ top: 0, behavior: 'instant' as ScrollBehavior }))
    await page.waitForTimeout(400)
    await shot(page, '09-validation-methodology-expanded')

    if (await scrollToText(page, '哪些閾值不是來自 Hirsch')) {
      await page.waitForTimeout(400)
      await shot(page, '10-validation-non-hirsch-thresholds')
    }

    // Provenance card (📜 實證資料提取紀錄) — its 9-state benchmark table
    if (await scrollToText(page, '實證資料提取紀錄')) {
      await page.waitForTimeout(400)
      await shot(page, '11-validation-provenance-9-state')
    }

    // Three-area benchmark table inside Provenance
    if (await scrollToText(page, '三區停留分布')) {
      await page.waitForTimeout(400)
      await shot(page, '12-validation-area-table')
    }

    // Vertical level + attention 4-mode tables
    if (await scrollToText(page, '人貓注意力四模態')) {
      await page.waitForTimeout(400)
      await shot(page, '13-validation-attention-4mode')
    }

    // Paper-questions disclosure card
    if (await scrollToText(page, '論文中可疑或未解釋之處')) {
      await page.waitForTimeout(400)
      await shot(page, '14-validation-paper-questions')
    }

    // Bottom of page (paper-native statistical tests)
    await page.evaluate(() => window.scrollTo({ top: document.body.scrollHeight, behavior: 'instant' as ScrollBehavior }))
    await page.waitForTimeout(500)
    await shot(page, '14b-validation-page-bottom')

    // ───── 事件紀錄頁 ─────
    await page.locator('[data-testid="nav-tab-eventlog"]').click()
    await page.waitForTimeout(700)
    await shot(page, '15-eventlog-with-new-event-types')

    // ───── 關於頁（架構說明） ─────
    if (await safeClick(page, '[data-testid="nav-tab-about"]')) {
      await page.waitForTimeout(500)
      await shot(page, '16-about-architecture')
    }
  } finally {
    await close()
  }
})
