/**
 * NekoServe — Simulator Bridge
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
  return new Promise((resolve, reject) => {
    const target = resolveSpawnTarget()

    const child = spawn(target.cmd, target.args, {
      cwd: target.cwd,
      stdio: ['pipe', 'pipe', 'pipe'],
    })

    let stdout = ''
    let stderr = ''

    child.stdout.on('data', (chunk: Buffer) => {
      stdout += chunk.toString('utf8')
    })

    child.stderr.on('data', (chunk: Buffer) => {
      stderr += chunk.toString('utf8')
    })

    const timer = setTimeout(() => {
      child.kill('SIGKILL')
      const err: SimulatorError = {
        error: '模擬時間過長，請嘗試縮短模擬時長或減少參數',
        type: 'SIMULATION_ERROR',
      }
      reject(err)
    }, SIMULATOR_TIMEOUT_MS)

    child.on('close', (code) => {
      clearTimeout(timer)

      if (code === 0) {
        try {
          const result: SimulationResult = JSON.parse(stdout)
          resolve(result)
        } catch {
          const err: SimulatorError = {
            error: `模擬結果 JSON 解析失敗（stdout: ${stdout.slice(0, 200)}）`,
            type: 'SIMULATION_ERROR',
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
          error: stderr.trim() || `模擬引擎以 exit code ${code} 退出`,
          type: 'UNKNOWN_ERROR',
        } as SimulatorError)
      }
    })

    child.on('error', (err) => {
      clearTimeout(timer)

      let msg = `無法啟動模擬引擎：${err.message}`
      if ((err as NodeJS.ErrnoException).code === 'ENOENT') {
        msg = `找不到模擬引擎可執行檔，請先執行 npm run build:simulator`
      } else if ((err as NodeJS.ErrnoException).code === 'EACCES') {
        msg = `模擬引擎可執行檔無執行權限`
      }

      reject({ error: msg, type: 'UNKNOWN_ERROR' } as SimulatorError)
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

  ipcMain.handle('get-app-version', () => {
    return app.getVersion()
  })
}
