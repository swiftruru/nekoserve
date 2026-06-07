/**
 * NekoServe RPA bridge.
 *
 * Spawns the external Python RPA scripts (rpa/bot.py + rpa/report.py)
 * as a child process and streams their stdout/stderr back to the
 * renderer via IPC events. The bot itself drives NekoServe's UI from
 * the outside using pyautogui; this bridge is only the launcher.
 *
 * Only meaningful in dev (npm run dev). Packaged builds skip RPA
 * because the rpa/ folder is not bundled into the .app.
 */

import { app, BrowserWindow, ipcMain, screen as electronScreen } from 'electron'
import { spawn, ChildProcess } from 'child_process'
import path from 'path'
import fs from 'fs'

type RpaStatus =
  | 'idle'
  | 'starting'
  | 'running-bot'
  | 'running-report'
  | 'capturing-templates'
  | 'done'
  | 'failed'
  | 'cancelled'

interface StartPayload {
  /** "all" or a single scenario_id (e.g. "cats3_staff2"). */
  scope: 'all' | string
}

interface StatusPayload {
  status: RpaStatus
  /** Exit code (when terminal status). */
  exitCode?: number | null
  /** Human-readable message; localised on the renderer side. */
  message?: string
}

/** Names of the 8 template PNGs the bot needs. Kept in lockstep with
 *  rpa/lib/ui_actions.py's ALL_TEMPLATES. about_tab was added so the
 *  bot can reset to a known page (About) between scenarios -- otherwise
 *  settings_tab is stuck in the orange "active" state by the time the
 *  next scenario tries to click it. */
const TEMPLATE_NAMES = [
  'about_tab',
  'settings_tab',
  'preset_paper_weekday',
  'cat_count_label',
  'staff_count_label',
  'run_button',
  'results_tab_enabled',
  'export_csv_button',
] as const

let currentChild: ChildProcess | null = null
let cancelled = false

function rpaDir(): string {
  // app.getAppPath() is the repo root in dev. Packaged builds drop
  // rpa/ entirely; we'll fail loudly in that case.
  return path.join(app.getAppPath(), 'rpa')
}

function pythonExe(): string {
  // Prefer the venv built next to bot.py so the deps line up.
  const venvPython = path.join(rpaDir(), '.venv', 'bin', 'python')
  if (fs.existsSync(venvPython)) return venvPython
  // macOS / Linux fallback. Windows would need 'python' but the
  // primary demo target is macOS so we don't branch.
  return 'python3'
}

function sendStatus(win: BrowserWindow | null, payload: StatusPayload): void {
  if (!win || win.isDestroyed()) return
  win.webContents.send('rpa:status', payload)
}

function sendLog(win: BrowserWindow | null, stream: 'stdout' | 'stderr', line: string): void {
  if (!win || win.isDestroyed()) return
  win.webContents.send('rpa:log', { stream, line })
}

/** Spawn one Python script and resolve with its exit code. Lines are
 *  forwarded to the renderer as they arrive. */
function runScript(
  win: BrowserWindow | null,
  scriptName: string,
  args: string[],
): Promise<number> {
  return new Promise((resolve) => {
    const child = spawn(pythonExe(), [path.join(rpaDir(), scriptName), ...args], {
      cwd: rpaDir(),
      env: {
        // Strip Electron-internal env that would confuse a plain
        // Python launch.
        ...Object.fromEntries(
          Object.entries(process.env).filter(([k]) => k !== 'ELECTRON_RUN_AS_NODE')
        ),
        // Force line-buffered Python so streamed logs show up live
        // instead of in 4KB chunks.
        PYTHONUNBUFFERED: '1',
      },
      stdio: ['ignore', 'pipe', 'pipe'],
    })
    currentChild = child

    const ship = (stream: 'stdout' | 'stderr') => {
      let buf = ''
      return (chunk: Buffer) => {
        buf += chunk.toString('utf8')
        const parts = buf.split('\n')
        buf = parts.pop() ?? ''
        for (const line of parts) {
          if (line.length > 0) sendLog(win, stream, line)
        }
      }
    }
    child.stdout?.on('data', ship('stdout'))
    child.stderr?.on('data', ship('stderr'))

    child.on('error', (err) => {
      sendLog(win, 'stderr', `[spawn error] ${err.message}`)
    })

    child.on('close', (code) => {
      currentChild = null
      resolve(code ?? -1)
    })
  })
}

async function runRpaPipeline(win: BrowserWindow | null, payload: StartPayload): Promise<void> {
  cancelled = false

  // Pre-flight check: bot.py exists at all?
  const botPath = path.join(rpaDir(), 'bot.py')
  if (!fs.existsSync(botPath)) {
    sendStatus(win, {
      status: 'failed',
      message: `bot.py not found at ${botPath}; rpa folder missing or app is packaged`,
    })
    return
  }

  sendStatus(win, { status: 'starting' })

  const botArgs = ['--no-countdown']
  if (payload.scope !== 'all') botArgs.push('--only', payload.scope)

  sendStatus(win, { status: 'running-bot' })
  const botCode = await runScript(win, 'bot.py', botArgs)

  if (cancelled) {
    sendStatus(win, { status: 'cancelled', exitCode: botCode })
    return
  }
  if (botCode !== 0) {
    sendStatus(win, {
      status: 'failed',
      exitCode: botCode,
      message: `bot.py exited with code ${botCode}`,
    })
    return
  }

  sendStatus(win, { status: 'running-report' })
  const reportCode = await runScript(win, 'report.py', [])

  if (reportCode !== 0) {
    sendStatus(win, {
      status: 'failed',
      exitCode: reportCode,
      message: `report.py exited with code ${reportCode}`,
    })
    return
  }

  sendStatus(win, { status: 'done', exitCode: 0 })
}

async function runCaptureWizard(win: BrowserWindow | null): Promise<void> {
  const script = path.join(rpaDir(), 'capture_templates.py')
  if (!fs.existsSync(script)) {
    sendStatus(win, {
      status: 'failed',
      message: `capture_templates.py not found at ${script}`,
    })
    return
  }
  sendStatus(win, { status: 'capturing-templates' })
  const code = await runScript(win, 'capture_templates.py', [])
  if (code === 0) {
    sendStatus(win, { status: 'idle', message: 'templates captured' })
  } else {
    sendStatus(win, {
      status: 'failed',
      exitCode: code,
      message: `capture wizard exited with code ${code}`,
    })
  }
}

export function registerRpaHandler(): void {
  ipcMain.handle('rpa:start', async (event, payload: StartPayload) => {
    if (currentChild !== null) {
      return { success: false, error: 'RPA already running' }
    }
    const win = BrowserWindow.fromWebContents(event.sender)
    // Fire and forget so the invoke returns immediately; the
    // renderer follows progress via the rpa:status / rpa:log events.
    void runRpaPipeline(win, payload)
    return { success: true }
  })

  ipcMain.handle('rpa:capture-templates', async (event) => {
    if (currentChild !== null) {
      return { success: false, error: 'another RPA task already running' }
    }
    const win = BrowserWindow.fromWebContents(event.sender)
    void runCaptureWizard(win)
    return { success: true }
  })

  ipcMain.handle('rpa:cancel', async () => {
    if (currentChild === null) return { success: false, error: 'nothing to cancel' }
    cancelled = true
    try {
      currentChild.kill('SIGTERM')
    } catch {
      /* ignore */
    }
    return { success: true }
  })

  /**
   * Capture a rectangle of the renderer's content area to a PNG file
   * in rpa/templates/. Used by the "smart capture" flow: renderer
   * queries its own DOM for each known data-testid, gets bounding
   * rects (CSS px relative to content area), and asks main to grab
   * that exact region as the bot's matching template. No human
   * dragging required.
   *
   * rect is in CSS px, relative to the window's content area
   * (matches DOMRect from getBoundingClientRect()). webContents
   * .capturePage takes the same coordinate space.
   */
  ipcMain.handle(
    'rpa:capture-region',
    async (
      event,
      payload: { name: string; rect: { x: number; y: number; width: number; height: number } },
    ) => {
      const win = BrowserWindow.fromWebContents(event.sender)
      if (!win) return { success: false, error: 'no window' }
      const { name, rect } = payload
      try {
        const image = await win.webContents.capturePage({
          x: Math.round(rect.x),
          y: Math.round(rect.y),
          width: Math.max(1, Math.round(rect.width)),
          height: Math.max(1, Math.round(rect.height)),
        })
        // Crucial on Retina: webContents.capturePage's rect is in CSS
        // logical px, but pyautogui's locateOnScreen screenshots the
        // screen at PHYSICAL px on macOS (via the system `screencapture`
        // command which is HiDPI-aware). If we save the PNG at the
        // default scaleFactor=1, it ends up half the size of what's
        // really painted on screen and locateOnScreen never matches.
        // Save at the display's actual scale factor so template px ==
        // screen px on Retina.
        const display = electronScreen.getDisplayNearestPoint({
          x: win.getBounds().x,
          y: win.getBounds().y,
        })
        const dir = path.join(rpaDir(), 'templates')
        fs.mkdirSync(dir, { recursive: true })
        const target = path.join(dir, `${name}.png`)
        const buf = image.toPNG({ scaleFactor: display.scaleFactor })
        fs.writeFileSync(target, buf)
        return {
          success: true,
          bytes: buf.length,
          path: target,
          scaleFactor: display.scaleFactor,
        }
      } catch (e) {
        const msg = e instanceof Error ? e.message : String(e)
        return { success: false, error: msg }
      }
    },
  )

  /** Returns which of the 7 templates are present on disk right now.
   *  Used by the launcher card to show a "5/7 captured" badge and
   *  decide whether the Start button should be enabled. */
  ipcMain.handle('rpa:templates-status', async () => {
    const dir = path.join(rpaDir(), 'templates')
    const present: string[] = []
    const missing: string[] = []
    for (const name of TEMPLATE_NAMES) {
      const p = path.join(dir, `${name}.png`)
      if (fs.existsSync(p) && fs.statSync(p).size > 0) {
        present.push(name)
      } else {
        missing.push(name)
      }
    }
    return {
      total: TEMPLATE_NAMES.length,
      present,
      missing,
      dir,
    }
  })

  // ── Phase 2: DOM-driven sweep helpers ───────────────────────
  //
  // The renderer-side orchestrator (rpaSweepRunner.ts) does all the
  // driving; main just acts as the file system access layer. Three
  // small IPCs cover everything: read scenarios.csv, write
  // results.csv, run report.py.

  /** Read rpa/scenarios.csv and return parsed rows. The file is the
   *  source of truth for which sweep combinations to drive. */
  ipcMain.handle('rpa:read-scenarios', async () => {
    const p = path.join(rpaDir(), 'scenarios.csv')
    if (!fs.existsSync(p)) {
      return { success: false, error: `scenarios.csv not found at ${p}` }
    }
    try {
      const text = fs.readFileSync(p, 'utf8')
      const lines = text.split(/\r?\n/).filter((l) => l.trim() !== '')
      const [header, ...body] = lines
      const cols = header.split(',').map((c) => c.trim())
      const rows = body.map((line) => {
        const parts = line.split(',').map((c) => c.trim())
        const row: Record<string, string> = {}
        cols.forEach((c, i) => { row[c] = parts[i] ?? '' })
        return row
      })
      return { success: true, rows }
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e)
      return { success: false, error: msg }
    }
  })

  /** Persist the sweep results to rpa/output/results.csv, matching the
   *  Phase 1 column contract so report.py reads it unchanged. */
  ipcMain.handle('rpa:write-results-csv', async (_event, rows: Record<string, string | number>[]) => {
    const dir = path.join(rpaDir(), 'output')
    fs.mkdirSync(dir, { recursive: true })
    const target = path.join(dir, 'results.csv')
    const HEADERS = [
      'scenario_id', 'catCount', 'staffCount',
      'avgWaitForSeat', 'avgWaitForOrder', 'avgTotalStayTime',
      'abandonRate', 'totalCustomersServed',
      'seatUtilization', 'staffUtilization', 'catUtilization',
      'customerSatisfactionScore', 'catWelfareScore',
      'run_started_at_iso', 'source_csv_filename', 'status',
    ]
    const escape = (v: unknown) => {
      const s = v === null || v === undefined ? '' : String(v)
      return s.includes(',') || s.includes('"') || s.includes('\n')
        ? `"${s.replace(/"/g, '""')}"` : s
    }
    const out = [HEADERS.join(',')]
    for (const r of rows) {
      out.push(HEADERS.map((h) => escape(r[h])).join(','))
    }
    fs.writeFileSync(target, out.join('\n'), 'utf8')
    return { success: true, path: target, rows: rows.length }
  })

  /** Spawn report.py exactly as before. report.py reads results.csv,
   *  generates the HTML, and opens it in the default browser. */
  ipcMain.handle('rpa:run-report', async (event) => {
    if (currentChild !== null) {
      return { success: false, error: 'another RPA task already running' }
    }
    const win = BrowserWindow.fromWebContents(event.sender)
    const scriptPath = path.join(rpaDir(), 'report.py')
    if (!fs.existsSync(scriptPath)) {
      return { success: false, error: `report.py not found at ${scriptPath}` }
    }
    sendStatus(win, { status: 'running-report' })
    const code = await runScript(win, 'report.py', [])
    if (code === 0) {
      sendStatus(win, { status: 'done', exitCode: 0 })
      return { success: true }
    }
    sendStatus(win, {
      status: 'failed',
      exitCode: code,
      message: `report.py exited with ${code}`,
    })
    return { success: false, error: `report.py exited with ${code}` }
  })
}
