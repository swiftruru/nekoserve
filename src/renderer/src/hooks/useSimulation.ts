import { useState, useCallback, useRef } from 'react'
import i18n from '@i18n/index'
import type { SimulationConfig, SimulationResult, SimulatorError, SimulationStatus } from '../types'

export interface HistoryEntry {
  result: SimulationResult
  label: string
}

interface SimulationState {
  status: SimulationStatus
  result: SimulationResult | null
  error: SimulatorError | null
  elapsed: number
  history: HistoryEntry[]
}

interface UseSimulationReturn extends SimulationState {
  run: (config: SimulationConfig, label?: string) => Promise<void>
  reset: () => void
  clearHistory: () => void
}

const INITIAL_STATE: SimulationState = {
  status: 'idle',
  result: null,
  error: null,
  elapsed: 0,
  history: [],
}

export function useSimulation(): UseSimulationReturn {
  const [state, setState] = useState<SimulationState>(INITIAL_STATE)
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)

  const run = useCallback(async (config: SimulationConfig, label?: string) => {
    if (timerRef.current) clearInterval(timerRef.current)
    const startTime = Date.now()

    setState((prev) => ({
      ...prev,
      status: 'running',
      result: null,
      error: null,
      elapsed: 0,
    }))

    timerRef.current = setInterval(() => {
      setState((prev) => ({ ...prev, elapsed: (Date.now() - startTime) / 1000 }))
    }, 100)

    try {
      const result = await window.electronAPI.runSimulation(config)
      if (timerRef.current) clearInterval(timerRef.current)
      timerRef.current = null
      const finalElapsed = (Date.now() - startTime) / 1000

      setState((prev) => {
        const runLabel =
          label ?? i18n.t('results:runLabelFallback', { index: prev.history.length + 1 })
        const newHistory: HistoryEntry[] = [
          ...prev.history.slice(-2),
          { result, label: runLabel },
        ]
        return {
          ...prev,
          status: 'success',
          result,
          error: null,
          elapsed: finalElapsed,
          history: newHistory,
        }
      })
    } catch (err) {
      if (timerRef.current) clearInterval(timerRef.current)
      timerRef.current = null
      const simulatorError: SimulatorError =
        err && typeof err === 'object' && 'error' in err
          ? (err as SimulatorError)
          : { error: String(err), type: 'UNKNOWN_ERROR' }
      setState((prev) => ({
        ...prev,
        status: 'error',
        result: null,
        error: simulatorError,
        elapsed: 0,
      }))
    }
  }, [])

  const reset = useCallback(() => {
    if (timerRef.current) clearInterval(timerRef.current)
    timerRef.current = null
    setState(INITIAL_STATE)
  }, [])

  const clearHistory = useCallback(() => {
    setState((prev) => ({ ...prev, history: [] }))
  }, [])

  return { ...state, run, reset, clearHistory }
}
