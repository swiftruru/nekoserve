import type { SimulationConfig, SimulationResult } from '../../shared/contracts/types'

interface UpdateInfo {
  hasUpdate: boolean
  currentVersion: string
  latestVersion: string
  releaseUrl: string
  releaseNotes: string
}

interface UpdateCheckOutcome {
  success: boolean
  data?: UpdateInfo
  error?: string
}

declare global {
  interface Window {
    electronAPI: {
      runSimulation: (config: SimulationConfig) => Promise<SimulationResult>
      getAppVersion: () => Promise<string>
      initialLocale: string
      notifyLocaleChanged: (locale: string) => void

      // Update APIs
      checkForUpdate: () => Promise<UpdateCheckOutcome>
      skipUpdateVersion: (version: string) => Promise<void>
      openReleasesPage: () => Promise<void>
      onUpdateAvailable: (callback: (info: UpdateInfo) => void) => void
      onMenuCheckForUpdate: (callback: () => void) => void

      // Screenshot
      captureScreenshot: (rect: { x: number; y: number; width: number; height: number }) => Promise<boolean>
      testEnv: {
        isE2E: boolean
        setSimulationMode: (mode: 'mock' | 'real') => Promise<void>
      }
    }
  }
}

export {}
