import { useState, useCallback, useRef, useEffect } from 'react'
import i18n from '@i18n/index'
import type {
  SimulationConfig,
  SimulationResult,
  SimulatorError,
  SimulationStatus,
  MetricSummary,
  BatchResult,
  BatchSummary,
  MetricCI,
  SweepResult,
  SweepPoint,
} from '../types'
import { computeCI95 } from '../utils/statistics'
import {
  saveRun as dbSave,
  loadAll as dbLoadAll,
  deleteRun as dbDelete,
  clearAll as dbClearAll,
  updateLabel as dbUpdateLabel,
  togglePin as dbTogglePin,
} from '../utils/historyStore'
import type { PersistedHistoryEntry } from '../utils/historyStore'

export interface HistoryEntry {
  id: number
  timestamp: number
  result: SimulationResult
  label: string
  pinned: boolean
}

interface SimulationState {
  status: SimulationStatus
  result: SimulationResult | null
  error: SimulatorError | null
  elapsed: number
  history: HistoryEntry[]
  /** Batch mode state */
  batchResult: BatchResult | null
  batchProgress: { completed: number; total: number } | null
  /** Live progress streamed from the Python simulator during a single run.
   *  `rendering` is a synthetic stage we add after the IPC returns, while
   *  React commits the heavy result cascade — without it the indicator
   *  vanishes the moment status flips to 'success' and the user sees the
   *  long post-result freeze with no feedback. */
  simProgress: {
    stage: 'warmup' | 'main' | 'rendering'
    elapsedMin: number
    totalMin: number
  } | null
  /** Sweep state */
  sweepResult: SweepResult | null
}

interface UseSimulationReturn extends SimulationState {
  run: (config: SimulationConfig, label?: string) => Promise<boolean>
  runBatch: (config: SimulationConfig, replicationCount: number, label?: string) => Promise<boolean>
  runSweep: (config: SimulationConfig, paramKey: keyof SimulationConfig, from: number, to: number, step: number, replications: number) => Promise<boolean>
  cancel: () => void
  reset: () => void
  /** Dismiss the global run indicator. Call this after the destination
   *  page has finished mounting so the indicator stays visible through
   *  the post-result render cascade. */
  clearSimProgress: () => void
  clearHistory: () => void
  deleteHistoryEntry: (id: number) => void
  renameHistoryEntry: (id: number, label: string) => void
  togglePinHistoryEntry: (id: number) => void
  loadHistoryResult: (entry: HistoryEntry) => void
}

const INITIAL_STATE: SimulationState = {
  status: 'idle',
  result: null,
  error: null,
  elapsed: 0,
  history: [],
  batchResult: null,
  batchProgress: null,
  simProgress: null,
  sweepResult: null,
}

function toHistoryEntry(p: PersistedHistoryEntry): HistoryEntry {
  return {
    id: p.id,
    timestamp: p.timestamp,
    result: p.result,
    label: p.label,
    pinned: p.pinned ?? false,
  }
}

const METRIC_KEYS: (keyof MetricSummary)[] = [
  'avgWaitForSeat', 'avgWaitForOrder', 'avgTotalStayTime',
  'catInteractionRate', 'avgCatVisitsPerCustomer', 'noCatVisitRate',
  'seatUtilization', 'staffUtilization', 'catUtilization',
  'totalCustomersServed', 'totalCustomersArrived', 'abandonRate',
  'waitForSeatP50', 'waitForSeatP95', 'waitForSeatP99',
  'waitForOrderP50', 'waitForOrderP95', 'waitForOrderP99',
]

function buildBatchSummary(runs: SimulationResult[]): BatchSummary {
  const summary = {} as BatchSummary
  for (const key of METRIC_KEYS) {
    // v2.0: MetricSummary now has a couple of Record-valued fields
    // (catBehaviorShare, catVerticalLevelShare). METRIC_KEYS only lists
    // numeric metrics, so the cast is safe.
    const values = runs.map((r) => r.metrics[key] as unknown as number)
    ;(summary as Record<string, MetricCI>)[key] = computeCI95(values)
  }
  return summary
}

export function useSimulation(): UseSimulationReturn {
  const [state, setState] = useState<SimulationState>(INITIAL_STATE)
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const abortRef = useRef(false)

  // Load persisted history on mount
  useEffect(() => {
    dbLoadAll()
      .then((entries) => {
        const sorted = entries.sort((a, b) => a.timestamp - b.timestamp)
        setState((prev) => ({ ...prev, history: sorted.map(toHistoryEntry) }))
      })
      .catch(() => { /* IndexedDB unavailable, proceed with empty history */ })
  }, [])

  const run = useCallback(async (config: SimulationConfig, label?: string) => {
    if (timerRef.current) clearInterval(timerRef.current)
    const startTime = Date.now()

    setState((prev) => ({
      ...prev,
      status: 'running',
      result: null,
      error: null,
      elapsed: 0,
      batchResult: null,
      batchProgress: null,
      simProgress: null,
    }))

    timerRef.current = setInterval(() => {
      setState((prev) => ({ ...prev, elapsed: (Date.now() - startTime) / 1000 }))
    }, 100)

    // Live progress: subscribe before invoking, so the first
    // simulator emit isn't lost to a race with handler registration.
    const unsubProgress = window.electronAPI.onSimulationProgress?.((p) => {
      setState((prev) => ({ ...prev, simProgress: p }))
    })

    try {
      const result = await window.electronAPI.runSimulation(config)
      if (timerRef.current) clearInterval(timerRef.current)
      timerRef.current = null
      const finalElapsed = (Date.now() - startTime) / 1000

      const runLabel =
        label ?? i18n.t('results:runLabelFallback', { index: '?' })

      // ── Three-phase post-result commit ────────────────────────
      // The eventLog can hold thousands of entries. Setting `result`
      // synchronously triggers a heavy React cascade (PlaybackPage
      // mount, CafeScene cat keyframe build, EventLog filter pass)
      // that freezes the renderer for several seconds. The indicator
      // must survive that freeze, otherwise the user sees a frozen
      // page with no feedback.
      //
      // We deliberately KEEP simProgress non-null across the status
      // flip — GlobalRunIndicator's mount condition is
      // `isRunning || simProgress`, so the panel stays pinned even
      // after status moves to 'success'.

      // Phase A: replace the live progress with a "rendering" message
      // so the indicator's text reflects what's actually happening.
      setState((prev) => ({
        ...prev,
        simProgress: {
          stage: 'rendering',
          elapsedMin: prev.simProgress?.totalMin ?? 0,
          totalMin: prev.simProgress?.totalMin ?? 0,
        },
      }))
      // Two rAFs guarantee the rendering message paints to screen
      // before the heavy commit kicks off (single rAF only schedules
      // the next frame; the second confirms the paint happened).
      await new Promise<void>((r) =>
        requestAnimationFrame(() => requestAnimationFrame(() => r())),
      )

      const saveResult = await dbSave(result, runLabel).catch(() => null)
      const persisted = saveResult?.entry ?? null
      const evictedIds = saveResult?.evictedIds ?? []

      // Phase B: apply the heavy result. status flips to 'success'
      // but simProgress stays set, so the indicator stays mounted
      // throughout the cascade.
      setState((prev) => {
        const actualLabel =
          label ?? i18n.t('results:runLabelFallback', { index: prev.history.length + 1 })
        const newEntry: HistoryEntry = persisted
          ? toHistoryEntry({ ...persisted, label: actualLabel })
          : { id: Date.now(), timestamp: Date.now(), result, label: actualLabel, pinned: false }

        if (persisted && actualLabel !== runLabel) {
          dbUpdateLabel(persisted.id, actualLabel).catch(() => {})
        }

        const survivingHistory = evictedIds.length > 0
          ? prev.history.filter((e) => !evictedIds.includes(e.id))
          : prev.history

        return {
          ...prev,
          status: 'success',
          result,
          error: null,
          elapsed: finalElapsed,
          history: [...survivingHistory, newEntry],
        }
      })

      // Phase C is intentionally deferred: the heavy cascade actually
      // fires when the *caller* navigates to PlaybackPage (in the
      // .then() of this run()). If we cleared simProgress here, the
      // indicator would unmount before PlaybackPage mounted and the
      // user would see a frozen blank page during the cascade. The
      // caller is expected to invoke `clearSimProgress()` after the
      // navigation has settled.
      return true
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
        simProgress: null,
      }))
      return false
    } finally {
      unsubProgress?.()
    }
  }, [])

  const runBatch = useCallback(async (
    config: SimulationConfig,
    replicationCount: number,
    label?: string,
  ) => {
    if (timerRef.current) clearInterval(timerRef.current)
    const startTime = Date.now()
    const baseSeed = config.randomSeed

    abortRef.current = false

    setState((prev) => ({
      ...prev,
      status: 'running',
      result: null,
      error: null,
      elapsed: 0,
      batchResult: null,
      batchProgress: { completed: 0, total: replicationCount },
    }))

    timerRef.current = setInterval(() => {
      setState((prev) => ({ ...prev, elapsed: (Date.now() - startTime) / 1000 }))
    }, 100)

    const runs: SimulationResult[] = []
    let lastError: SimulatorError | null = null

    for (let i = 0; i < replicationCount; i++) {
      if (abortRef.current) break
      try {
        const seedConfig = { ...config, randomSeed: baseSeed + i }
        const result = await window.electronAPI.runSimulation(seedConfig)
        runs.push(result)
      } catch (err) {
        lastError = err && typeof err === 'object' && 'error' in err
          ? (err as SimulatorError)
          : { error: String(err), type: 'UNKNOWN_ERROR' }
      }
      setState((prev) => ({
        ...prev,
        batchProgress: { completed: i + 1, total: replicationCount },
      }))
    }

    if (timerRef.current) clearInterval(timerRef.current)
    timerRef.current = null
    const finalElapsed = (Date.now() - startTime) / 1000

    if (runs.length === 0) {
      setState((prev) => ({
        ...prev,
        status: 'error',
        result: null,
        error: lastError ?? { error: 'All replications failed', type: 'UNKNOWN_ERROR' },
        elapsed: 0,
        batchProgress: null,
      }))
      return false
    }

    const summary = buildBatchSummary(runs)
    const batchResult: BatchResult = {
      config,
      runs,
      summary,
      replicationCount: runs.length,
    }

    // Use the first (representative) run as the "result" for playback
    const representativeResult = runs[0]

    // Persist to history
    const runLabel =
      label ?? i18n.t('results:runLabelFallback', { index: '?' })
    const saveResult = await dbSave(representativeResult, runLabel).catch(() => null)
    const persisted = saveResult?.entry ?? null
    const evictedIds = saveResult?.evictedIds ?? []

    setState((prev) => {
      const actualLabel =
        label ?? i18n.t('results:runLabelFallback', { index: prev.history.length + 1 })
      const newEntry: HistoryEntry = persisted
        ? toHistoryEntry({ ...persisted, label: actualLabel })
        : { id: Date.now(), timestamp: Date.now(), result: representativeResult, label: actualLabel, pinned: false }

      if (persisted && actualLabel !== runLabel) {
        dbUpdateLabel(persisted.id, actualLabel).catch(() => {})
      }

      const survivingHistory = evictedIds.length > 0
        ? prev.history.filter((e) => !evictedIds.includes(e.id))
        : prev.history

      return {
        ...prev,
        status: 'success',
        result: representativeResult,
        error: null,
        elapsed: finalElapsed,
        history: [...survivingHistory, newEntry],
        batchResult,
        batchProgress: null,
      }
    })
    return true
  }, [])

  const runSweep = useCallback(async (
    config: SimulationConfig,
    paramKey: keyof SimulationConfig,
    from: number,
    to: number,
    step: number,
    replications: number,
  ) => {
    if (timerRef.current) clearInterval(timerRef.current)
    abortRef.current = false
    const startTime = Date.now()

    // Generate parameter values
    const paramValues: number[] = []
    for (let v = from; v <= to + step * 0.01; v += step) {
      paramValues.push(Math.round(v * 1000) / 1000)
    }

    const totalRuns = paramValues.length * replications

    setState((prev) => ({
      ...prev,
      status: 'running',
      result: null,
      error: null,
      elapsed: 0,
      batchResult: null,
      sweepResult: null,
      batchProgress: { completed: 0, total: totalRuns },
    }))

    timerRef.current = setInterval(() => {
      setState((prev) => ({ ...prev, elapsed: (Date.now() - startTime) / 1000 }))
    }, 100)

    const points: SweepPoint[] = []
    let completedCount = 0
    let firstResult: SimulationResult | null = null

    for (const paramValue of paramValues) {
      if (abortRef.current) break
      const runs: SimulationResult[] = []
      for (let r = 0; r < replications; r++) {
        if (abortRef.current) break
        try {
          const sweepConfig = {
            ...config,
            [paramKey]: paramValue,
            randomSeed: config.randomSeed + r,
          }
          const result = await window.electronAPI.runSimulation(sweepConfig)
          runs.push(result)
          if (!firstResult) firstResult = result
        } catch {
          // Skip failed runs
        }
        completedCount++
        setState((prev) => ({
          ...prev,
          batchProgress: { completed: completedCount, total: totalRuns },
        }))
      }

      if (runs.length > 0) {
        const metricsCI: Record<string, MetricCI> = {}
        for (const key of METRIC_KEYS) {
          const values = runs.map((r) => r.metrics[key] as unknown as number)
          metricsCI[key] = computeCI95(values)
        }
        points.push({ paramValue, metrics: metricsCI })
      }
    }

    if (timerRef.current) clearInterval(timerRef.current)
    timerRef.current = null
    const finalElapsed = (Date.now() - startTime) / 1000

    if (points.length === 0 || !firstResult) {
      setState((prev) => ({
        ...prev,
        status: 'error',
        error: { error: 'All sweep runs failed', type: 'UNKNOWN_ERROR' },
        elapsed: 0,
        batchProgress: null,
      }))
      return false
    }

    const sweepResult: SweepResult = { config, paramKey, points }

    setState((prev) => ({
      ...prev,
      status: 'success',
      result: firstResult,
      error: null,
      elapsed: finalElapsed,
      batchResult: null,
      sweepResult,
      batchProgress: null,
    }))
    return true
  }, [])

  const cancel = useCallback(() => {
    abortRef.current = true
    if (timerRef.current) clearInterval(timerRef.current)
    timerRef.current = null
    setState((prev) => ({
      ...prev,
      status: prev.result ? 'success' : 'idle',
      batchProgress: null,
    }))
  }, [])

  const reset = useCallback(() => {
    if (timerRef.current) clearInterval(timerRef.current)
    timerRef.current = null
    setState((prev) => ({
      ...INITIAL_STATE,
      history: prev.history,
    }))
  }, [])

  const clearHistory = useCallback(() => {
    dbClearAll().catch(() => {})
    setState((prev) => ({ ...prev, history: [] }))
  }, [])

  const deleteHistoryEntry = useCallback((id: number) => {
    dbDelete(id).catch(() => {})
    setState((prev) => ({
      ...prev,
      history: prev.history.filter((e) => e.id !== id),
    }))
  }, [])

  const renameHistoryEntry = useCallback((id: number, label: string) => {
    dbUpdateLabel(id, label).catch(() => {})
    setState((prev) => ({
      ...prev,
      history: prev.history.map((e) => (e.id === id ? { ...e, label } : e)),
    }))
  }, [])

  const togglePinHistoryEntry = useCallback((id: number) => {
    setState((prev) => {
      const current = prev.history.find((e) => e.id === id)
      if (!current) return prev
      const nextPinned = !current.pinned
      dbTogglePin(id, nextPinned).catch(() => {})
      return {
        ...prev,
        history: prev.history.map((e) => (e.id === id ? { ...e, pinned: nextPinned } : e)),
      }
    })
  }, [])

  const loadHistoryResult = useCallback((entry: HistoryEntry) => {
    setState((prev) => ({
      ...prev,
      status: 'success',
      result: entry.result,
      error: null,
      batchResult: null,
      sweepResult: null,
    }))
  }, [])

  const clearSimProgress = useCallback(() => {
    setState((prev) => (prev.simProgress ? { ...prev, simProgress: null } : prev))
  }, [])

  return {
    ...state,
    run,
    runBatch,
    runSweep,
    cancel,
    reset,
    clearSimProgress,
    clearHistory,
    deleteHistoryEntry,
    renameHistoryEntry,
    togglePinHistoryEntry,
    loadHistoryResult,
  }
}
