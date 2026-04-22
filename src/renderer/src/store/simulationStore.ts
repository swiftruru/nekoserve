/**
 * Simulation store: mirrors the current simulation run's status / result
 * / error so any component can read them without threading through
 * props. The useSimulation hook writes here after each IPC round-trip.
 *
 * v2.0 Sprint 1 scope: only publish the three most-read fields. Batch
 * and sweep state stay inside useSimulation for now; they'll migrate
 * when Epic B / C / D consumers need them.
 */

import { create } from 'zustand'
import type {
  SimulationResult,
  SimulatorError,
  SimulationStatus,
} from '../types'

interface SimulationState {
  status: SimulationStatus
  result: SimulationResult | null
  error: SimulatorError | null
  setStatus: (status: SimulationStatus) => void
  setResult: (result: SimulationResult | null) => void
  setError: (error: SimulatorError | null) => void
  reset: () => void
}

const INITIAL: Pick<SimulationState, 'status' | 'result' | 'error'> = {
  status: 'idle',
  result: null,
  error: null,
}

export const useSimulationStore = create<SimulationState>((set) => ({
  ...INITIAL,
  setStatus: (status) => set({ status }),
  setResult: (result) => set({ result }),
  setError: (error) => set({ error }),
  reset: () => set(INITIAL),
}))
