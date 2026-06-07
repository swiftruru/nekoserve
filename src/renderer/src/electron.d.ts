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

      // Live simulation progress (returns unsubscribe)
      onSimulationProgress: (
        callback: (progress: {
          stage: 'warmup' | 'main'
          elapsedMin: number
          totalMin: number
        }) => void,
      ) => () => void

      // Screenshot
      captureScreenshot: (rect: { x: number; y: number; width: number; height: number }) => Promise<boolean>
      // Research report PDF export
      exportReportPDF: (html: string) => Promise<boolean>
      testEnv: {
        isE2E: boolean
        setSimulationMode: (mode: 'mock' | 'real') => Promise<void>
      }

      // RPA bridge (dev-only, drives rpa/bot.py + rpa/report.py)
      startRpa: (scope: 'all' | string) => Promise<{ success: boolean; error?: string }>
      cancelRpa: () => Promise<{ success: boolean; error?: string }>
      captureRpaTemplates: () => Promise<{ success: boolean; error?: string }>
      getRpaTemplatesStatus: () => Promise<{
        total: number
        present: string[]
        missing: string[]
        dir: string
      }>
      captureRpaRegion: (
        name: string,
        rect: { x: number; y: number; width: number; height: number },
      ) => Promise<{ success: boolean; bytes?: number; path?: string; error?: string }>

      // Phase 2: DOM-driven sweep helpers.
      readRpaScenarios: () => Promise<{
        success: boolean
        rows?: Record<string, string>[]
        error?: string
      }>
      writeRpaResults: (
        rows: Record<string, string | number>[],
      ) => Promise<{ success: boolean; path?: string; rows?: number; error?: string }>
      runRpaReport: () => Promise<{ success: boolean; error?: string }>
      onRpaStatus: (
        callback: (payload: {
          status:
            | 'idle'
            | 'starting'
            | 'running-bot'
            | 'running-report'
            | 'capturing-templates'
            | 'done'
            | 'failed'
            | 'cancelled'
          exitCode?: number | null
          message?: string
        }) => void,
      ) => () => void
      onRpaLog: (
        callback: (payload: { stream: 'stdout' | 'stderr'; line: string }) => void,
      ) => () => void
    }
  }
}

export {}
