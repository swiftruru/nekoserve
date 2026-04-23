/**
 * NekoServe preload script
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
      /* ignore: main process may not yet be ready */
    }
  },

  // ── Update APIs ──────────────────────────────────────────────

  /** Manually trigger an update check. Returns the full outcome. */
  checkForUpdate: (): Promise<{
    success: boolean
    data?: {
      hasUpdate: boolean
      currentVersion: string
      latestVersion: string
      releaseUrl: string
      releaseNotes: string
    }
    error?: string
  }> => ipcRenderer.invoke('check-for-update'),

  /** Persist "skip this version" so it won't be prompted again. */
  skipUpdateVersion: (version: string): Promise<void> =>
    ipcRenderer.invoke('skip-update-version', version),

  /** Open the GitHub Releases page in the system browser. */
  openReleasesPage: (): Promise<void> => ipcRenderer.invoke('open-releases-page'),

  /**
   * Listen for the auto-check result pushed from main process on startup.
   * The callback receives the UpdateInfo payload when an update is available.
   */
  onUpdateAvailable: (
    callback: (info: {
      hasUpdate: boolean
      currentVersion: string
      latestVersion: string
      releaseUrl: string
      releaseNotes: string
    }) => void
  ): void => {
    ipcRenderer.on('update-available', (_event, info) => callback(info))
  },

  /**
   * Listen for "Check for Updates..." triggered from the application menu.
   * The renderer should perform a manual check when this fires.
   */
  onMenuCheckForUpdate: (callback: () => void): void => {
    ipcRenderer.on('menu-check-for-update', () => callback())
  },

  /**
   * Subscribe to live progress events emitted by the Python simulator
   * during a run. Returns an unsubscribe function so React effects can
   * clean up when the component unmounts or the run finishes.
   */
  onSimulationProgress: (
    callback: (progress: {
      stage: 'warmup' | 'main'
      elapsedMin: number
      totalMin: number
    }) => void,
  ): (() => void) => {
    const handler = (
      _event: unknown,
      progress: { stage: 'warmup' | 'main'; elapsedMin: number; totalMin: number },
    ) => callback(progress)
    ipcRenderer.on('simulation-progress', handler)
    return () => {
      ipcRenderer.removeListener('simulation-progress', handler)
    }
  },

  // ── Screenshot API ──────────────────────────────────────────

  /** Capture a region of the page as PNG and save via dialog. */
  captureScreenshot: (rect: { x: number; y: number; width: number; height: number }): Promise<boolean> =>
    ipcRenderer.invoke('capture-screenshot', rect),

  /** Read-only test environment flags for stable E2E execution. */
  testEnv: {
    isE2E: process.env.NEKOSERVE_E2E === '1',
    setSimulationMode: (mode: 'mock' | 'real'): Promise<void> =>
      ipcRenderer.invoke('set-e2e-simulation-mode', mode).then(() => {}),
  },
}

contextBridge.exposeInMainWorld('electronAPI', electronAPI)

// ──────────────────────────────────────────────────────────────
// Type declaration for renderer (consumed by src/renderer/src/electron.d.ts)
// ──────────────────────────────────────────────────────────────

export type ElectronAPI = typeof electronAPI
