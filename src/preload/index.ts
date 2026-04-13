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

/**
 * Fetch the initial system locale synchronously so the renderer can
 * initialize i18n before React mounts (avoids first-frame language flash).
 * Main process registers a `get-initial-locale` sync IPC handler in app.whenReady.
 */
function readInitialLocale(): string {
  try {
    const value = ipcRenderer.sendSync('get-initial-locale')
    return typeof value === 'string' ? value : 'en'
  } catch {
    return 'en'
  }
}

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
    throw (
      response.error ?? {
        error: 'Unknown simulator failure',
        type: 'UNKNOWN_ERROR' as const,
      }
    )
  },

  /** Returns the Electron app version string. */
  getAppVersion: (): Promise<string> => ipcRenderer.invoke('get-app-version'),

  /**
   * System locale captured at preload time (BCP-47, e.g. "zh-TW", "en-US").
   * Read synchronously via IPC so it's available before React renders.
   */
  initialLocale: readInitialLocale(),

  /**
   * Notify the main process when the user toggles the UI language so the
   * application menu and About dialog can be rebuilt in sync.
   */
  notifyLocaleChanged: (locale: string): void => {
    try {
      ipcRenderer.send('locale-changed', locale)
    } catch {
      /* ignore — main process may not yet be ready */
    }
  },
}

contextBridge.exposeInMainWorld('electronAPI', electronAPI)

// ──────────────────────────────────────────────────────────────
// Type declaration for renderer (consumed by src/renderer/src/electron.d.ts)
// ──────────────────────────────────────────────────────────────

export type ElectronAPI = typeof electronAPI
