/**
 * Config store: holds the current SimulationConfig being edited on the
 * Settings page. Pages read from this store instead of passing config
 * down the App.tsx prop chain.
 *
 * v2.0 Sprint 1: initial Zustand migration. Other state (simulation
 * result, history, batch) lives in simulationStore.ts and initially
 * stays inside the useSimulation hook; child components can migrate
 * incrementally over the next sprints.
 */

import { create } from 'zustand'
import type { SimulationConfig } from '../types'
import { DEFAULT_CONFIG } from '../data/scenarios'

interface ConfigState {
  config: SimulationConfig
  setConfig: (config: SimulationConfig) => void
  patchConfig: (patch: Partial<SimulationConfig>) => void
  resetConfig: () => void
}

export const useConfigStore = create<ConfigState>((set) => ({
  config: DEFAULT_CONFIG,
  setConfig: (config) => set({ config }),
  patchConfig: (patch) =>
    set((state) => ({ config: { ...state.config, ...patch } })),
  resetConfig: () => set({ config: DEFAULT_CONFIG }),
}))

/** Plain getter for non-React code (utils, export, bibtex generator). */
export function getCurrentConfig(): SimulationConfig {
  return useConfigStore.getState().config
}
