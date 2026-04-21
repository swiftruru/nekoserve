/**
 * NekoServe simulator bridge
 *
 * Manages the lifecycle of the Python simulator process:
 *   - Resolves the correct executable path (dev vs packaged, per platform)
 *   - Spawns the process with stdin/stdout JSON transport
 *   - Enforces a 30-second timeout
 *   - Returns a typed SimulationResult or throws SimulatorError
 */

import { app, ipcMain } from 'electron'
import { spawn } from 'child_process'
import path from 'path'
import fs from 'fs'

import type { SimulationConfig, SimulationResult, SimulatorError } from '../../shared/contracts/types'

const SIMULATOR_TIMEOUT_MS = 30_000
const IS_E2E = process.env.NEKOSERVE_E2E === '1'
const E2E_SIMULATION_MODE = process.env.NEKOSERVE_E2E_SIMULATION_MODE ?? 'mock'
let e2eSimulationMode: 'mock' | 'real' = E2E_SIMULATION_MODE === 'real' ? 'real' : 'mock'

function readDelay(): number {
  const raw = Number(process.env.NEKOSERVE_E2E_SIMULATION_DELAY_MS ?? '0')
  return Number.isFinite(raw) && raw > 0 ? raw : 0
}

function delay(ms: number): Promise<void> {
  return ms > 0 ? new Promise((resolve) => setTimeout(resolve, ms)) : Promise.resolve()
}

async function runMockSimulator(config: SimulationConfig): Promise<SimulationResult> {
  const delayMs = readDelay()
  const mockError = process.env.NEKOSERVE_E2E_SIMULATION_ERROR as SimulatorError['type'] | undefined
  if (mockError) {
    await delay(delayMs)
    throw {
      error: `Mocked simulator failure: ${mockError}`,
      type: mockError,
    } satisfies SimulatorError
  }

  const fixturePath = process.env.NEKOSERVE_E2E_SIMULATION_FIXTURE
  if (!fixturePath) {
    throw {
      error: 'NEKOSERVE_E2E_SIMULATION_FIXTURE is not set',
      type: 'BINARY_NOT_FOUND',
    } satisfies SimulatorError
  }

  await delay(delayMs)

  try {
    const result = JSON.parse(fs.readFileSync(fixturePath, 'utf8')) as SimulationResult
    return {
      ...result,
      config: {
        ...result.config,
        ...config,
      },
    }
  } catch (err) {
    throw {
      error: err instanceof Error ? err.message : 'Failed to load E2E fixture',
      type: 'PARSE_ERROR',
    } satisfies SimulatorError
  }
}

// ──────────────────────────────────────────────────────────────
// Path resolution
// ──────────────────────────────────────────────────────────────

function getSimulatorBinaryPath(): string {
  const execName = process.platform === 'win32' ? 'simulator.exe' : 'simulator'

  if (app.isPackaged) {
    // Production: extraResources puts the binary at resources/simulator/simulator[.exe]
    return path.join(process.resourcesPath, 'simulator', execName)
  }

  // Development: point at PyInstaller one-folder output
  return path.join(app.getAppPath(), 'simulator-python', 'dist', 'simulator', execName)
}

interface SpawnTarget {
  cmd: string
  args: string[]
  cwd?: string
}

/** Find a Python executable that has simpy available. */
function findPython(): string {
  if (process.platform === 'win32') return 'python'
  // Prefer conda/mamba environments which typically have simpy installed
  const candidates = [
    '/opt/miniconda3/bin/python3',
    '/opt/homebrew/Caskroom/miniconda/base/bin/python3',
    `${process.env.HOME}/.conda/envs/base/bin/python3`,
    '/usr/local/miniconda3/bin/python3',
    'python3',
  ]
  for (const p of candidates) {
    if (p.startsWith('/') && !fs.existsSync(p)) continue
    return p
  }
  return 'python3'
}

function resolveSpawnTarget(): SpawnTarget {
  const binaryPath = getSimulatorBinaryPath()

  if (!app.isPackaged && !fs.existsSync(binaryPath)) {
    // Dev fallback: call python -m simulator directly (no PyInstaller build needed)
    return {
      cmd: findPython(),
      args: ['-u', '-m', 'simulator'],
      cwd: path.join(app.getAppPath(), 'simulator-python'),
    }
  }

  return { cmd: binaryPath, args: [] }
}

// ──────────────────────────────────────────────────────────────
// Simulation runner
// ──────────────────────────────────────────────────────────────

export function runSimulator(config: SimulationConfig): Promise<SimulationResult> {
  if (IS_E2E && e2eSimulationMode !== 'real') {
    return runMockSimulator(config)
  }
  return new Promise((resolve, reject) => {
    const target = resolveSpawnTarget()

    const child = spawn(target.cmd, target.args, {
      cwd: target.cwd,
      stdio: ['pipe', 'pipe', 'pipe'],
    })

    // Accumulate as Buffers and decode once at the end. Decoding each chunk
    // individually corrupts multi-byte UTF-8 characters (e.g. Chinese) when a
    // character straddles a chunk boundary — this is how Windows pipes fail
    // while macOS, with its larger default pipe buffer, often does not.
    const stdoutChunks: Buffer[] = []
    const stderrChunks: Buffer[] = []

    child.stdout.on('data', (chunk: Buffer) => {
      stdoutChunks.push(chunk)
    })

    child.stderr.on('data', (chunk: Buffer) => {
      stderrChunks.push(chunk)
    })

    const timer = setTimeout(() => {
      child.kill('SIGKILL')
      const err: SimulatorError = {
        error: `Simulator process exceeded ${SIMULATOR_TIMEOUT_MS} ms timeout`,
        type: 'TIMEOUT',
      }
      reject(err)
    }, SIMULATOR_TIMEOUT_MS)

    child.on('close', (code) => {
      clearTimeout(timer)

      const stdout = Buffer.concat(stdoutChunks).toString('utf8')
      const stderr = Buffer.concat(stderrChunks).toString('utf8')

      if (code === 0) {
        try {
          const result: SimulationResult = JSON.parse(stdout)
          resolve(result)
        } catch {
          const err: SimulatorError = {
            error: `Failed to parse simulator stdout JSON (stdout: ${stdout.slice(0, 200)})`,
            type: 'PARSE_ERROR',
          }
          reject(err)
        }
        return
      }

      // Non-zero exit: parse stderr JSON error
      try {
        const errObj: SimulatorError = JSON.parse(stderr)
        reject(errObj)
      } catch {
        reject({
          error: stderr.trim() || `Simulator exited with code ${code}`,
          type: 'UNKNOWN_ERROR',
        } as SimulatorError)
      }
    })

    child.on('error', (err) => {
      clearTimeout(timer)

      const errno = (err as NodeJS.ErrnoException).code
      let type: SimulatorError['type'] = 'UNKNOWN_ERROR'
      let msg = `Failed to spawn simulator: ${err.message}`
      if (errno === 'ENOENT') {
        type = 'BINARY_NOT_FOUND'
        msg = 'Simulator binary not found. Run `npm run build:simulator` first.'
      } else if (errno === 'EACCES') {
        type = 'NO_EXEC_PERMISSION'
        msg = 'Simulator binary is not executable (permission denied).'
      }

      reject({ error: msg, type } as SimulatorError)
    })

    // Send config via stdin then close to signal EOF
    child.stdin.write(JSON.stringify(config), 'utf8')
    child.stdin.end()
  })
}

// ──────────────────────────────────────────────────────────────
// IPC handler registration
// ──────────────────────────────────────────────────────────────

export function registerSimulationHandler(): void {
  ipcMain.handle('run-simulation', async (_event, config: SimulationConfig) => {
    try {
      const result = await runSimulator(config)
      return { success: true, data: result }
    } catch (err) {
      return { success: false, error: err }
    }
  })

  ipcMain.handle('set-e2e-simulation-mode', async (_event, mode: 'mock' | 'real') => {
    if (!IS_E2E || (mode !== 'mock' && mode !== 'real')) {
      return { success: false }
    }
    e2eSimulationMode = mode
    return { success: true }
  })

  ipcMain.handle('get-app-version', () => {
    return app.getVersion()
  })
}
