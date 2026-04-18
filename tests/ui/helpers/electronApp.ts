import fs from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'
import { _electron as electron, type ElectronApplication, type Page } from '@playwright/test'

const repoRoot = path.resolve(__dirname, '../../..')
const mainEntry = path.join(repoRoot, 'out', 'main', 'index.js')
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

interface LaunchNekoServeOptions {
  simulationMode?: 'mock' | 'real'
  simulationFixture?: string
  simulationError?: string
  simulationDelayMs?: number
  userDataDir?: string
}

export interface LaunchedNekoServe {
  app: ElectronApplication
  page: Page
  userDataDir: string
  close: () => Promise<void>
}

async function sleep(ms: number): Promise<void> {
  await new Promise((resolve) => setTimeout(resolve, ms))
}

function getErrorMessage(error: unknown): string {
  if (typeof error === 'string') return error
  if (error && typeof error === 'object' && 'message' in error && typeof error.message === 'string') {
    return error.message
  }

  return String(error)
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

export async function launchNekoServe(
  options: LaunchNekoServeOptions = {},
): Promise<LaunchedNekoServe> {
  const userDataDir = options.userDataDir ?? await fs.mkdtemp(path.join(os.tmpdir(), 'nekoserve-e2e-'))
  const shouldCleanupUserDataDir = options.userDataDir === undefined
  const simulationMode = options.simulationMode ?? 'mock'
  const env = buildLaunchEnv({
    NEKOSERVE_E2E: '1',
    NEKOSERVE_E2E_USER_DATA_DIR: userDataDir,
    NEKOSERVE_E2E_SIMULATION_DELAY_MS: String(options.simulationDelayMs ?? 250),
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

  let app: ElectronApplication | undefined
  let lastError: unknown

  for (let attempt = 1; attempt <= 3; attempt += 1) {
    try {
      app = await electron.launch({
        args: [mainEntry],
        cwd: repoRoot,
        env,
      })
      break
    } catch (error) {
      lastError = error

      if (!getErrorMessage(error).includes('Process failed to launch!') || attempt === 3) {
        throw error
      }

      await sleep(350 * attempt)
    }
  }

  if (!app) {
    throw lastError instanceof Error ? lastError : new Error('Electron failed to launch')
  }

  const page = await app.firstWindow()
  await page.emulateMedia({ reducedMotion: 'reduce' })
  await page.setViewportSize({ width: 1440, height: 960 })
  await page.waitForLoadState('domcontentloaded')
  await page.locator('[data-testid="settings-run-button"]').waitFor({ state: 'visible' })
  await page.evaluate(async (mode: 'mock' | 'real') => {
    await window.electronAPI.testEnv.setSimulationMode(mode)
  }, simulationMode)

  const close = async () => {
    await app.close().catch(() => {})
    if (shouldCleanupUserDataDir) {
      await fs.rm(userDataDir, { recursive: true, force: true })
    }
  }

  return { app, page, userDataDir, close }
}

export async function runSimulation(page: Page): Promise<void> {
  await page.locator('[data-testid="settings-run-button"]').click()
  await page.locator('[data-testid="playback-page"]').waitFor({ state: 'visible' })
}
