/**
 * useLiveRunner: drives a sequential batch of simulations and streams each
 * completed run into liveBatchStore. Lives alongside useSimulation; does
 * not replace the legacy runBatch (which still works for the
 * "run-then-show" workflow).
 *
 * Concurrency model:
 *  - One async loop per `start()` call. Re-entrant calls while running
 *    are rejected (callers should `stop()` first).
 *  - Pause is cooperative: the loop awaits a pauseGate promise between
 *    iterations. resume() resolves the gate; stop() resolves it AND sets
 *    abort, so a paused loop terminates cleanly.
 *  - Seed schedule: seed_i = baseSeed + i, identical to legacy runBatch,
 *    so two runs with the same baseSeed produce identical curves. Pause
 *    does not perturb the schedule.
 */

import { useCallback, useEffect, useRef } from 'react'
import type { SimulationConfig, SimulationResult } from '../types'
import { useLiveBatchStore } from '../store/liveBatchStore'

interface StartOptions {
  config: SimulationConfig
  total: number
  label: string
  /** Called once after the loop ends (natural completion, stop, or error)
   *  with the runs accumulated so far. App uses this to commit results to
   *  history and the global simulationStore. */
  onComplete?: (runs: SimulationResult[], outcome: 'done' | 'stopped' | 'error') => void
  /** Called exactly once when the first run completes successfully. App
   *  uses this to hydrate `result` so PlaybackPage's CafeScene can start
   *  playing while runs 2..N continue in the background. */
  onFirstRun?: (result: SimulationResult) => void
  /** Called after every successful run completes, including the first.
   *  App uses this to cycle the displayed CafeScene replay to the latest
   *  finished run (waiting for the current playback to end before
   *  swapping, so the user sees gradual variation rather than mid-replay
   *  jumps). */
  onAfterRun?: (result: SimulationResult, runIndex: number) => void
}

export interface LiveRunnerControls {
  start: (opts: StartOptions) => Promise<void>
  pause: () => void
  resume: () => void
  stop: () => void
  isActive: () => boolean
}

export function useLiveRunner(): LiveRunnerControls {
  const abortRef = useRef(false)
  const pauseGateRef = useRef<Promise<void> | null>(null)
  const pauseResolveRef = useRef<(() => void) | null>(null)
  const activeRef = useRef(false)

  // Cancel any in-flight loop on unmount so the store doesn't keep
  // receiving updates after the page tears down.
  useEffect(() => {
    return () => {
      abortRef.current = true
      pauseResolveRef.current?.()
    }
  }, [])

  const pause = useCallback(() => {
    const store = useLiveBatchStore.getState()
    if (store.status !== 'running') return
    // Open the gate so the loop will block on the next iteration. Note
    // we open it *before* the status flip so a racing recordRun-then-pause
    // can't slip through.
    pauseGateRef.current = new Promise<void>((resolve) => {
      pauseResolveRef.current = resolve
    })
    store.pause()
  }, [])

  const resume = useCallback(() => {
    const store = useLiveBatchStore.getState()
    if (store.status !== 'paused') return
    store.resume()
    pauseResolveRef.current?.()
    pauseResolveRef.current = null
    pauseGateRef.current = null
  }, [])

  const stop = useCallback(() => {
    abortRef.current = true
    // If currently paused, release the gate so the loop can observe abort
    // and exit.
    pauseResolveRef.current?.()
    pauseResolveRef.current = null
    pauseGateRef.current = null
  }, [])

  const start = useCallback(async ({ config, total, label, onComplete, onFirstRun, onAfterRun }: StartOptions) => {
    if (activeRef.current) {
      // Refuse re-entry; caller must stop() first.
      return
    }
    activeRef.current = true
    abortRef.current = false
    pauseGateRef.current = null
    pauseResolveRef.current = null

    const store = useLiveBatchStore.getState()
    store.start(config, total, label)

    const runs: SimulationResult[] = []
    let outcome: 'done' | 'stopped' | 'error' = 'done'
    const baseSeed = config.randomSeed

    try {
      for (let i = 0; i < total; i++) {
        if (abortRef.current) {
          outcome = 'stopped'
          break
        }
        // Block while paused.
        if (pauseGateRef.current) {
          await pauseGateRef.current
          if (abortRef.current) {
            outcome = 'stopped'
            break
          }
        }

        const seedConfig: SimulationConfig = { ...config, randomSeed: baseSeed + i }
        try {
          const result = await window.electronAPI.runSimulation(seedConfig)
          runs.push(result)
          // Fire onFirstRun before recordRun so the host (App) can
          // hydrate the global result *and* the convergence sidebar
          // sees its first point in the same React commit cycle.
          if (runs.length === 1) {
            onFirstRun?.(result)
          }
          // Pump the store. recordRun handles cumulative-mean update.
          useLiveBatchStore.getState().recordRun(result)
          // Fire onAfterRun for every run (including first). App uses
          // this to schedule a CafeScene swap to the latest run.
          onAfterRun?.(result, runs.length - 1)
        } catch (err) {
          // Per-run failure: log and continue. If every run fails, we
          // mark the whole batch as errored at the end.
          // eslint-disable-next-line no-console
          console.error('[useLiveRunner] run', i, 'failed:', err)
        }
      }

      if (outcome === 'done' && runs.length === 0) {
        outcome = 'error'
        useLiveBatchStore.getState().fail('All replications failed')
      } else if (outcome === 'done') {
        useLiveBatchStore.getState().finish()
      } else if (outcome === 'stopped') {
        useLiveBatchStore.getState().stop()
      }
    } catch (err) {
      outcome = 'error'
      const msg = err instanceof Error ? err.message : String(err)
      useLiveBatchStore.getState().fail(msg)
    } finally {
      activeRef.current = false
      onComplete?.(runs, outcome)
    }
  }, [])

  const isActive = useCallback(() => activeRef.current, [])

  return { start, pause, resume, stop, isActive }
}
