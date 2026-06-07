/**
 * Phase 2 RPA sweep orchestrator.
 *
 * Runs entirely inside the renderer. Drives NekoServe by:
 *   1. Animating a fake cursor between targets (visual show)
 *   2. Programmatically scrolling target elements into view (visual show)
 *   3. Setting the config via useConfigStore (real action, instant)
 *   4. Running each simulation via the existing electronAPI.runSimulation
 *      IPC (real action)
 *   5. Recording per-scenario metrics in memory, writing results.csv via
 *      IPC at the end, then spawning report.py
 *
 * This replaces the Phase 1 pyautogui pipeline. No screen capture, no
 * template matching, no terminal interaction.
 */

import { useConfigStore } from '../store/configStore'
import { useRpaCursorStore } from '../store/rpaCursorStore'
import { DEFAULT_CONFIG } from '../data/scenarios'

export type RpaSweepPhase =
  | 'idle'
  | 'starting'
  | 'navigating'
  | 'scrolling'
  | 'clicking-preset'
  | 'typing-cat'
  | 'typing-staff'
  | 'scrolling-run'
  | 'simulating'
  | 'recording'
  | 'writing-csv'
  | 'opening-report'
  | 'done'
  | 'failed'
  | 'cancelled'

export interface SweepProgress {
  phase: RpaSweepPhase
  scenarioIndex: number
  scenarioTotal: number
  currentScenarioId: string
  okCount: number
  failCount: number
  /** Free-form message for the floating status chip. */
  message: string
}

export interface SweepOptions {
  scope: 'all' | string
  /** Called on every status transition for UI updates. */
  onProgress?: (p: SweepProgress) => void
  /** Called when a single log line should be appended (visible after
   *  the sweep finishes and the modal re-opens). */
  onLog?: (line: string) => void
  /** Polled between steps; if it returns true the sweep aborts ASAP. */
  shouldCancel?: () => boolean
}

interface Scenario {
  scenario_id: string
  catCount: number
  staffCount: number
}

/** Output row shape, matches the Phase 1 results.csv contract so
 *  report.py stays unchanged. */
interface ResultRow {
  scenario_id: string
  catCount: number
  staffCount: number
  avgWaitForSeat: number | ''
  avgWaitForOrder: number | ''
  avgTotalStayTime: number | ''
  abandonRate: number | ''
  totalCustomersServed: number | ''
  seatUtilization: number | ''
  staffUtilization: number | ''
  catUtilization: number | ''
  customerSatisfactionScore: number | ''
  catWelfareScore: number | ''
  run_started_at_iso: string
  source_csv_filename: string
  status: 'ok' | 'failed'
}

// ── Small utilities ──────────────────────────────────────────

const wait = (ms: number) => new Promise<void>((r) => setTimeout(r, ms))

/** Fire React's onChange on a controlled input by routing through the
 *  prototype's native setter. Standard react-testing-library trick. */
function setReactInputValue(el: HTMLInputElement, value: string): void {
  const desc = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value')
  const setter = desc?.set
  if (!setter) {
    // Fallback: direct assign. Won't notify React but at least leaves
    // the value visible.
    el.value = value
    return
  }
  setter.call(el, value)
  el.dispatchEvent(new Event('input', { bubbles: true }))
}

/** Query for a stable element by data-testid. Polls until present or
 *  timeout, because pages navigate asynchronously and the orchestrator
 *  might run faster than React's first paint of the new page. */
async function waitForTestId(
  testId: string,
  { timeoutMs = 3000, pollMs = 60 }: { timeoutMs?: number; pollMs?: number } = {},
): Promise<HTMLElement | null> {
  const deadline = performance.now() + timeoutMs
  while (performance.now() < deadline) {
    const el = document.querySelector(`[data-testid="${testId}"]`)
    if (el instanceof HTMLElement) return el
    await wait(pollMs)
  }
  return null
}

/** Find a Settings <label> by Chinese text content. ParamInput labels
 *  don't carry data-testid; their text is the stable anchor. We then
 *  walk to the input next to the label by traversing the shared
 *  parent ParamInput wrapper. */
function findLabelByText(text: string): HTMLElement | null {
  const labels = Array.from(document.querySelectorAll('label'))
  return labels.find((l) => (l.textContent ?? '').trim().includes(text)) as HTMLElement | null
}

/** Centre-of-bounding-rect, in viewport coords (which match the cursor
 *  store's fixed-position coords). */
function centerOf(el: HTMLElement): { x: number; y: number } {
  const r = el.getBoundingClientRect()
  return { x: r.x + r.width / 2, y: r.y + r.height / 2 }
}

// ── Public API ────────────────────────────────────────────────

export async function runSweep(opts: SweepOptions): Promise<{
  rows: ResultRow[]
  okCount: number
  failCount: number
  cancelled: boolean
}> {
  const log = (line: string) => opts.onLog?.(line)
  const cursor = useRpaCursorStore.getState()
  const config = useConfigStore

  // Pre-flight: pull scenarios from disk via main IPC. If user picked
  // a single smoke-test scope, filter to that row.
  const scenariosRes = await window.electronAPI.readRpaScenarios()
  if (!scenariosRes.success || !scenariosRes.rows) {
    throw new Error(scenariosRes.error ?? 'failed to read scenarios.csv')
  }
  let scenarios: Scenario[] = scenariosRes.rows.map((r) => ({
    scenario_id: r.scenario_id,
    catCount: Number(r.catCount),
    staffCount: Number(r.staffCount),
  }))
  if (opts.scope !== 'all') {
    scenarios = scenarios.filter((s) => s.scenario_id === opts.scope)
  }
  if (scenarios.length === 0) {
    throw new Error(`No scenarios match scope "${opts.scope}"`)
  }

  const rows: ResultRow[] = []
  let okCount = 0
  let failCount = 0

  const emit = (phase: RpaSweepPhase, i: number, message: string) => {
    opts.onProgress?.({
      phase,
      scenarioIndex: i,
      scenarioTotal: scenarios.length,
      currentScenarioId: scenarios[i]?.scenario_id ?? '',
      okCount,
      failCount,
      message,
    })
  }

  cursor.show()
  // Park the cursor somewhere visible to ease the user into seeing it.
  cursor.moveTo(window.innerWidth / 2, window.innerHeight / 2, '🤖 RPA 開始')
  await wait(600)

  for (let i = 0; i < scenarios.length; i++) {
    if (opts.shouldCancel?.()) {
      log(`cancelled before scenario ${i + 1}`)
      return { rows, okCount, failCount, cancelled: true }
    }

    const s = scenarios[i]
    log(`\n=== ${i + 1}/${scenarios.length}: ${s.scenario_id} (cats=${s.catCount}, staff=${s.staffCount}) ===`)
    const startedAt = new Date().toISOString()

    try {
      // 1. Navigate to Settings if not already there.
      emit('navigating', i, `切到「⚙️ 模擬設定」`)
      const settingsTab = await waitForTestId('nav-tab-settings')
      if (settingsTab) {
        const p = centerOf(settingsTab)
        cursor.moveTo(p.x, p.y, '⚙️ 模擬設定')
        await wait(700)
        settingsTab.click()
        await wait(450) // page transition + scroll-reset useEffect
      }

      // 2. Click the Paper Weekday preset so all 13 unchanging params
      //    snap back to baseline. (Without this, edits leak across
      //    scenarios.)
      emit('clicking-preset', i, '套用「論文樣本・平日白天」')
      const preset = await waitForTestId('scenario-button-paper-weekday')
      if (preset) {
        preset.scrollIntoView({ behavior: 'smooth', block: 'center' })
        await wait(400)
        const p = centerOf(preset)
        cursor.moveTo(p.x, p.y, '論文樣本・平日白天')
        await wait(600)
        preset.click()
        await wait(300)
      } else {
        log('  ! preset button not found; using DEFAULT_CONFIG fallback')
        config.getState().setConfig({ ...DEFAULT_CONFIG })
      }

      // 3. Set catCount via the input's onChange path.
      emit('typing-cat', i, `輸入貓咪數量 = ${s.catCount}`)
      const catInput = (await waitForTestId('param-input-catCount')) as HTMLInputElement | null
      if (catInput) {
        catInput.scrollIntoView({ behavior: 'smooth', block: 'center' })
        await wait(400)
        const p = centerOf(catInput)
        cursor.moveTo(p.x, p.y, `輸入貓咪數量 = ${s.catCount}`)
        await wait(600)
        await typeIntoInput(catInput, String(s.catCount))
      }

      // 4. Set staffCount.
      emit('typing-staff', i, `輸入店員數量 = ${s.staffCount}`)
      const staffInput = (await waitForTestId('param-input-staffCount')) as HTMLInputElement | null
      if (staffInput) {
        staffInput.scrollIntoView({ behavior: 'smooth', block: 'center' })
        await wait(350)
        const p = centerOf(staffInput)
        cursor.moveTo(p.x, p.y, `輸入店員數量 = ${s.staffCount}`)
        await wait(550)
        await typeIntoInput(staffInput, String(s.staffCount))
      }

      // Belt-and-braces: also push the final config directly. typeInto
      // dispatches input events which React flushes asynchronously; the
      // direct setConfig call guarantees the snapshot we pass to
      // runSimulation matches the displayed values.
      config.getState().patchConfig({
        catCount: s.catCount,
        staffCount: s.staffCount,
      })

      // 5. Bring the Run button into view, fly the cursor there for
      //    the visual click... but call runSimulation directly to
      //    avoid the existing handleRun side-effects (page transition,
      //    history save, etc.).
      emit('scrolling-run', i, '到開始按鈕')
      const runBtn = await waitForTestId('settings-run-button')
      if (runBtn) {
        runBtn.scrollIntoView({ behavior: 'smooth', block: 'center' })
        await wait(450)
        const p = centerOf(runBtn)
        cursor.moveTo(p.x, p.y, '▶️ 開始模擬')
        await wait(700)
      }

      // 6. Actually run.
      emit('simulating', i, '模擬執行中⋯')
      const runConfig = config.getState().config
      const result = await window.electronAPI.runSimulation(runConfig)

      // 7. Record the metrics into a result row.
      emit('recording', i, '記錄 KPI')
      const m = result.metrics
      rows.push({
        scenario_id: s.scenario_id,
        catCount: s.catCount,
        staffCount: s.staffCount,
        avgWaitForSeat: m.avgWaitForSeat,
        avgWaitForOrder: m.avgWaitForOrder,
        avgTotalStayTime: m.avgTotalStayTime,
        abandonRate: m.abandonRate,
        totalCustomersServed: m.totalCustomersServed,
        seatUtilization: m.seatUtilization,
        staffUtilization: m.staffUtilization,
        catUtilization: m.catUtilization,
        customerSatisfactionScore: m.customerSatisfactionScore,
        catWelfareScore: m.catWelfareScore,
        run_started_at_iso: startedAt,
        source_csv_filename: '',
        status: 'ok',
      })
      okCount++
      log(`  ✓ ${s.scenario_id}: avgWaitForSeat=${m.avgWaitForSeat.toFixed(2)}, ` +
          `abandonRate=${m.abandonRate.toFixed(3)}`)
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e)
      log(`  ✗ ${s.scenario_id}: ${msg}`)
      failCount++
      rows.push({
        scenario_id: s.scenario_id,
        catCount: s.catCount,
        staffCount: s.staffCount,
        avgWaitForSeat: '', avgWaitForOrder: '', avgTotalStayTime: '',
        abandonRate: '', totalCustomersServed: '',
        seatUtilization: '', staffUtilization: '', catUtilization: '',
        customerSatisfactionScore: '', catWelfareScore: '',
        run_started_at_iso: startedAt,
        source_csv_filename: '',
        status: 'failed',
      })
    }
  }

  // 8. Persist results.
  emit('writing-csv', scenarios.length - 1, '寫入 results.csv')
  const writeRes = await window.electronAPI.writeRpaResults(rows as unknown as Record<string, string | number>[])
  if (!writeRes.success) {
    log(`! failed to write results.csv: ${writeRes.error ?? 'unknown'}`)
  } else {
    log(`results.csv written to ${writeRes.path}`)
  }

  // 9. Spawn report.py.
  emit('opening-report', scenarios.length - 1, '產生 HTML 報表')
  const reportRes = await window.electronAPI.runRpaReport()
  if (!reportRes.success) {
    log(`! report.py: ${reportRes.error ?? 'unknown failure'}`)
  } else {
    log('report.py launched; HTML report opens automatically')
  }

  cursor.hide()
  emit('done', scenarios.length - 1, `完成 ${okCount} ok / ${failCount} failed`)

  return { rows, okCount, failCount, cancelled: false }
}

// ── Typing helper ────────────────────────────────────────────

async function typeIntoInput(el: HTMLInputElement, value: string): Promise<void> {
  el.focus()
  await wait(80)
  setReactInputValue(el, '')
  await wait(120)
  let acc = ''
  for (const ch of value) {
    acc += ch
    setReactInputValue(el, acc)
    await wait(90)
  }
  await wait(120)
  // blur commits the draft via ParamInput.handleBlur
  el.dispatchEvent(new Event('blur'))
  await wait(80)
}
