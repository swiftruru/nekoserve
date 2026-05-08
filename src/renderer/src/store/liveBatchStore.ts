/**
 * liveBatchStore: streaming Zustand store for the "live convergence" mode.
 *
 * The classic batch loop in useSimulation publishes only progress counters
 * mid-flight and a final BatchSummary at the end. The live mode needs
 * something stronger: per-metric cumulative-mean curves and CI bands that
 * grow one point per completed replication, plus a coarse pause/resume
 * protocol the runner can react to between iterations.
 *
 * This store owns the streaming state. It does NOT execute the simulator
 * (useLiveRunner does that and calls recordRun on each completed run).
 *
 * Statistics are accumulated with Welford's online algorithm so the
 * O(N) stored series reflects exact means and unbiased sample variances
 * without re-summing the run array on every step.
 */

import { create } from 'zustand'
import type { SimulationConfig, SimulationResult, MetricSummary } from '../types'

/** All numeric metric keys we track curves for. Mirrors the METRIC_KEYS
 *  list in useSimulation.ts; kept duplicated rather than shared because
 *  the live store deliberately ignores Record-valued metrics
 *  (catBehaviorShare, catVerticalLevelShare, catAreaShare). */
export const LIVE_METRIC_KEYS: ReadonlyArray<keyof MetricSummary> = [
  'avgWaitForSeat', 'avgWaitForOrder', 'avgTotalStayTime',
  'catInteractionRate', 'avgCatVisitsPerCustomer', 'noCatVisitRate',
  'seatUtilization', 'staffUtilization', 'catUtilization',
  'totalCustomersServed', 'totalCustomersArrived', 'abandonRate',
  'waitForSeatP50', 'waitForSeatP95', 'waitForSeatP99',
  'waitForOrderP50', 'waitForOrderP95', 'waitForOrderP99',
  'catWelfareScore', 'customerSatisfactionScore',
] as const

export type LiveMetricKey = typeof LIVE_METRIC_KEYS[number]

/** A single sample along a metric's convergence curve. */
export interface ConvergencePoint {
  /** 1-indexed run count when this point was recorded. */
  n: number
  /** Cumulative mean after `n` runs. */
  mean: number
  /** Sample standard deviation after `n` runs. 0 when n < 2. */
  sd: number
  /** 95% CI half-width: `t_{n-1} * sd / sqrt(n)`. 0 when n < 2. */
  halfWidth: number
}

/** Welford running aggregator. m2 is the sum of squared deviations from
 *  the running mean; sample variance = m2 / (n - 1). */
interface RunningStat {
  n: number
  mean: number
  m2: number
}

export type LiveStatus = 'idle' | 'running' | 'paused' | 'done' | 'stopped' | 'error'

interface LiveBatchState {
  status: LiveStatus
  total: number
  /** Number of completed runs == runs.length. */
  currentIndex: number
  runs: SimulationResult[]
  /** Per-metric Welford aggregators, kept O(1) per update. */
  stats: Record<string, RunningStat>
  /** Per-metric convergence curves (one ConvergencePoint per completed run). */
  series: Record<string, ConvergencePoint[]>
  selectedMetric: LiveMetricKey
  config: SimulationConfig | null
  baseSeed: number
  label: string
  startedAt: number | null
  finishedAt: number | null
  errorMessage: string | null

  // ── actions ──
  start: (config: SimulationConfig, total: number, label: string) => void
  recordRun: (run: SimulationResult) => void
  pause: () => void
  resume: () => void
  stop: () => void
  finish: () => void
  fail: (msg: string) => void
  reset: () => void
  setSelectedMetric: (key: LiveMetricKey) => void
}

const T_TABLE: Record<number, number> = {
  1: 12.706, 2: 4.303, 3: 3.182, 4: 2.776, 5: 2.571,
  6: 2.447, 7: 2.365, 8: 2.306, 9: 2.262, 10: 2.228,
  11: 2.201, 12: 2.179, 13: 2.160, 14: 2.145, 15: 2.131,
  16: 2.120, 17: 2.110, 18: 2.101, 19: 2.093, 20: 2.086,
  25: 2.060, 30: 2.042, 35: 2.030, 40: 2.021,
}

function tCritical(df: number): number {
  if (df <= 0) return 0
  if (df in T_TABLE) return T_TABLE[df]
  const keys = Object.keys(T_TABLE).map(Number).sort((a, b) => a - b)
  for (let i = keys.length - 1; i >= 0; i--) {
    if (keys[i] <= df) return T_TABLE[keys[i]]
  }
  return 1.96
}

function emptyStats(): Record<string, RunningStat> {
  const out: Record<string, RunningStat> = {}
  for (const k of LIVE_METRIC_KEYS) out[k] = { n: 0, mean: 0, m2: 0 }
  return out
}

function emptySeries(): Record<string, ConvergencePoint[]> {
  const out: Record<string, ConvergencePoint[]> = {}
  for (const k of LIVE_METRIC_KEYS) out[k] = []
  return out
}

const INITIAL: Pick<LiveBatchState,
  'status' | 'total' | 'currentIndex' | 'runs' | 'stats' | 'series' |
  'selectedMetric' | 'config' | 'baseSeed' | 'label' |
  'startedAt' | 'finishedAt' | 'errorMessage'
> = {
  status: 'idle',
  total: 0,
  currentIndex: 0,
  runs: [],
  stats: emptyStats(),
  series: emptySeries(),
  selectedMetric: 'customerSatisfactionScore',
  config: null,
  baseSeed: 0,
  label: '',
  startedAt: null,
  finishedAt: null,
  errorMessage: null,
}

export const useLiveBatchStore = create<LiveBatchState>((set) => ({
  ...INITIAL,

  start: (config, total, label) => set({
    status: 'running',
    total,
    currentIndex: 0,
    runs: [],
    stats: emptyStats(),
    series: emptySeries(),
    config,
    baseSeed: config.randomSeed,
    label,
    startedAt: Date.now(),
    finishedAt: null,
    errorMessage: null,
  }),

  recordRun: (run) => set((prev) => {
    const nextRuns = [...prev.runs, run]
    const nextStats: Record<string, RunningStat> = { ...prev.stats }
    const nextSeries: Record<string, ConvergencePoint[]> = { ...prev.series }
    for (const key of LIVE_METRIC_KEYS) {
      const x = run.metrics[key] as unknown as number
      if (typeof x !== 'number' || !Number.isFinite(x)) continue
      const prevStat = prev.stats[key] ?? { n: 0, mean: 0, m2: 0 }
      const n = prevStat.n + 1
      const delta = x - prevStat.mean
      const mean = prevStat.mean + delta / n
      const delta2 = x - mean
      const m2 = prevStat.m2 + delta * delta2
      nextStats[key] = { n, mean, m2 }
      const sd = n > 1 ? Math.sqrt(m2 / (n - 1)) : 0
      const halfWidth = n > 1 ? tCritical(n - 1) * sd / Math.sqrt(n) : 0
      nextSeries[key] = [...(prev.series[key] ?? []), { n, mean, sd, halfWidth }]
    }
    return {
      runs: nextRuns,
      stats: nextStats,
      series: nextSeries,
      currentIndex: nextRuns.length,
    }
  }),

  pause: () => set((prev) => prev.status === 'running' ? { status: 'paused' } : prev),
  resume: () => set((prev) => prev.status === 'paused' ? { status: 'running' } : prev),
  stop: () => set({ status: 'stopped', finishedAt: Date.now() }),
  finish: () => set({ status: 'done', finishedAt: Date.now() }),
  fail: (msg) => set({ status: 'error', errorMessage: msg, finishedAt: Date.now() }),
  reset: () => set({ ...INITIAL, stats: emptyStats(), series: emptySeries() }),
  setSelectedMetric: (key) => set({ selectedMetric: key }),
}))

/** True while a run is mid-flight (running OR paused), false otherwise.
 *  SettingsPage watches this to lock parameter inputs. */
export function selectIsLiveActive(s: LiveBatchState): boolean {
  return s.status === 'running' || s.status === 'paused'
}
