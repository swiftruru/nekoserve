import type { SimulationConfig, SimulationResult } from '../../shared/contracts/types'

declare global {
  interface Window {
    electronAPI: {
      runSimulation: (config: SimulationConfig) => Promise<SimulationResult>
      getAppVersion: () => Promise<string>
      initialLocale: string
      notifyLocaleChanged: (locale: string) => void
    }
  }
}

export {}
