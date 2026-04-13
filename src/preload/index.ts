/**
 * NekoServe — Preload Script
 *
 * Exposes a minimal, explicitly typed API to the renderer via contextBridge.
 * The renderer MUST NOT access ipcRenderer, Node, or any Electron internals directly.
 */

import { contextBridge, ipcRenderer } from 'electron'
import type { SimulationConfig, SimulationResult, SimulatorError } from '../../shared/contracts/types'

// ──────────────────────────────────────────────────────────────
// Type for the IPC response envelope
// ──────────────────────────────────────────────────────────────

interface IpcResponse<T> {
  success: boolean
  data?: T
  error?: SimulatorError
}

// ──────────────────────────────────────────────────────────────
// Public API exposed to renderer
// ──────────────────────────────────────────────────────────────

const electronAPI = {
  /**
   * Run the SimPy simulation with the given config.
   * Resolves with SimulationResult on success.
   * Rejects with SimulatorError on failure.
   */
  runSimulation: async (config: SimulationConfig): Promise<SimulationResult> => {
    const response: IpcResponse<SimulationResult> = await ipcRenderer.invoke(
      'run-simulation',
      config
    )
    if (response.success && response.data) {
      return response.data
    }
    throw response.error ?? { error: '未知錯誤', type: 'UNKNOWN_ERROR' }
  },

  /** Returns the Electron app version string. */
  getAppVersion: (): Promise<string> => ipcRenderer.invoke('get-app-version'),
}

contextBridge.exposeInMainWorld('electronAPI', electronAPI)

// ──────────────────────────────────────────────────────────────
// Type declaration for renderer (consumed by src/renderer/src/electron.d.ts)
// ──────────────────────────────────────────────────────────────

export type ElectronAPI = typeof electronAPI
