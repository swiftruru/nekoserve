import fs from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'
import { execFile, spawn, type ChildProcess } from 'node:child_process'
import { chromium, type Browser, type Page } from '@playwright/test'

// Playwright transpiles test helpers at runtime; plain require keeps this file compatible.
// eslint-disable-next-line @typescript-eslint/no-require-imports
const electronBinary = require('electron') as string
const repoRoot = path.resolve(__dirname, '../../..')
const defaultFixture = path.join(repoRoot, 'tests', 'ui', 'fixtures', 'simulation-success.json')
const PASSTHROUGH_ENV_KEYS = [
  'HOME',
  'PATH',
  'TMPDIR',
  'LANG',
  'LC_ALL',
  'SHELL',
  'USER',
  'LOGNAME',
  'TERM',
  'COLORTERM',
  '__CF_USER_TEXT_ENCODING',
  'DISPLAY',
  'WAYLAND_DISPLAY',
  'XDG_RUNTIME_DIR',
] as const

interface LaunchCdpNekoServeOptions {
  simulationMode?: 'mock' | 'real'
  simulationFixture?: string
  simulationError?: string
  simulationDelayMs?: number
}

export interface LaunchedCdpNekoServe {
  browser: Browser
  page: Page
  userDataDir: string
  close: () => Promise<void>
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

function chooseRemoteDebuggingPort(): number {
  return 45000 + Math.floor(Math.random() * 10000)
}

function buildLaunchEnv(extra: Record<string, string>): NodeJS.ProcessEnv {
  const env: NodeJS.ProcessEnv = {}

  for (const key of PASSTHROUGH_ENV_KEYS) {
    const value = process.env[key]
    if (value) env[key] = value
  }

  return {
    ...env,
    ...extra,
  }
}

async function waitForPage(browser: Browser, timeoutMs: number): Promise<Page> {
  const deadline = Date.now() + timeoutMs

  while (Date.now() < deadline) {
    const page = browser.contexts()[0]?.pages()[0]
    if (page) return page
    await sleep(100)
  }

  throw new Error(`Timed out waiting for the Electron renderer window after ${timeoutMs}ms`)
}

function killChild(process: ChildProcess): void {
  if (process.killed || process.exitCode !== null) return

  try {
    process.kill('SIGTERM')
  } catch {
    return
  }
}

function curlJson(url: string): Promise<string> {
  return new Promise((resolve, reject) => {
    execFile('curl', ['-s', url], (error, stdout, stderr) => {
      if (error) {
        reject(new Error(stderr || error.message))
        return
      }
      resolve(stdout)
    })
  })
}

async function waitForWsEndpoint(
  child: ChildProcess,
  getStdout: () => string,
  getStderr: () => string,
  port: number,
  timeoutMs: number,
): Promise<string> {
  const deadline = Date.now() + timeoutMs

  while (Date.now() < deadline) {
    if (child.exitCode !== null) break

    try {
      const raw = await curlJson(`http://127.0.0.1:${port}/json/version`)
      const parsed = JSON.parse(raw) as { webSocketDebuggerUrl?: string }
      if (parsed.webSocketDebuggerUrl) return parsed.webSocketDebuggerUrl
    } catch {
      // Electron has not started exposing the CDP endpoint yet.
    }

    await sleep(150)
  }

  throw new Error(
    [
      `Timed out waiting for Electron CDP endpoint on port ${port} after ${timeoutMs}ms.`,
      `stdout: ${getStdout().trim() || '(empty)'}`,
      `stderr: ${getStderr().trim() || '(empty)'}`,
      child.exitCode === null ? 'process: still running' : `process exit code: ${child.exitCode}`,
    ].join('\n'),
  )
}

export async function launchNekoServeViaCdp(
  options: LaunchCdpNekoServeOptions = {},
): Promise<LaunchedCdpNekoServe> {
  const userDataDir = await fs.mkdtemp(path.join(os.tmpdir(), 'nekoserve-e2e-cdp-'))
  const simulationMode = options.simulationMode ?? 'real'
  const remoteDebuggingPort = chooseRemoteDebuggingPort()
  const env = buildLaunchEnv({
    NEKOSERVE_E2E: '1',
    NEKOSERVE_E2E_USER_DATA_DIR: userDataDir,
    NEKOSERVE_E2E_SIMULATION_DELAY_MS: String(options.simulationDelayMs ?? 250),
    NEKOSERVE_E2E_REMOTE_DEBUGGING_PORT: String(remoteDebuggingPort),
  })

  delete env.ELECTRON_RUN_AS_NODE
  delete env.NEKOSERVE_E2E_SIMULATION_MODE
  delete env.NEKOSERVE_E2E_SIMULATION_FIXTURE
  delete env.NEKOSERVE_E2E_SIMULATION_ERROR

  if (!options.simulationError) {
    env.NEKOSERVE_E2E_SIMULATION_FIXTURE = options.simulationFixture ?? defaultFixture
  }
  if (simulationMode === 'mock' && options.simulationError) {
    env.NEKOSERVE_E2E_SIMULATION_ERROR = options.simulationError
  }

  const child = spawn(
    electronBinary,
    [repoRoot],
    {
      cwd: repoRoot,
      env,
      stdio: ['ignore', 'pipe', 'pipe'],
    },
  )

  let stdout = ''
  let stderr = ''
  child.stdout?.on('data', (chunk: Buffer | string) => {
    stdout += chunk.toString()
  })
  child.stderr?.on('data', (chunk: Buffer | string) => {
    stderr += chunk.toString()
  })

  const wsEndpoint = await waitForWsEndpoint(child, () => stdout, () => stderr, remoteDebuggingPort, 15_000).catch(async (error) => {
    killChild(child)
    await fs.rm(userDataDir, { recursive: true, force: true })
    throw error
  })

  const browser = await chromium.connectOverCDP(wsEndpoint, { timeout: 15_000 }).catch(async (error) => {
    killChild(child)
    await fs.rm(userDataDir, { recursive: true, force: true })
    throw new Error(
      [
        'Failed to connect to Electron over CDP.',
        `wsEndpoint: ${wsEndpoint}`,
        `stdout: ${stdout.trim() || '(empty)'}`,
        `stderr: ${stderr.trim() || '(empty)'}`,
        `cause: ${error instanceof Error ? error.message : String(error)}`,
      ].join('\n'),
    )
  })

  const page = await waitForPage(browser, 15_000)
  await page.emulateMedia({ reducedMotion: 'reduce' })
  await page.setViewportSize({ width: 1440, height: 960 })
  await page.waitForLoadState('domcontentloaded')
  await page.locator('[data-testid="settings-run-button"]').waitFor({ state: 'visible' })
  await page.evaluate(async (mode: 'mock' | 'real') => {
    await window.electronAPI.testEnv.setSimulationMode(mode)
  }, simulationMode)

  const close = async () => {
    await browser.close().catch(() => {})
    killChild(child)
    await sleep(250)
    killChild(child)
    await fs.rm(userDataDir, { recursive: true, force: true })
  }

  child.once('exit', async () => {
    await browser.close().catch(() => {})
  })

  return { browser, page, userDataDir, close }
}
