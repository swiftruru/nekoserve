import type { MetricSummary } from '../types'

export type VerdictSituation = 'healthy' | 'strained' | 'overloaded'

export type ResourceKey = 'seat' | 'staff' | 'cat'

export interface BottleneckInfo {
  resource: ResourceKey
  /** Utilization ratio 0..1 of the busiest resource. */
  ratio: number
}

export interface VerdictPayload {
  situation: VerdictSituation
  bottleneck: BottleneckInfo
  arrivedCount: number
  servedCount: number
  abandonedCount: number
  inFlightCount: number
  servedPct: number
  abandonedPct: number
}

/**
 * Thresholds used across Hero Verdict, BottleneckCallout, and the
 * headline KPI highlights. Centralized here so the three places agree.
 *
 * - A run is "healthy" only when NOBODY is seriously waiting and the
 *   busiest resource is comfortably under the Kingman breakdown point.
 * - A run is "overloaded" when a third of customers gave up or any
 *   resource is pinned within 5 % of maxed out.
 */
export const BOTTLENECK_THRESHOLD = 0.85
export const OVERLOAD_RHO = 0.95
export const STRAIN_ABANDON_PCT = 10
export const OVERLOAD_ABANDON_PCT = 30

/**
 * Identify the busiest resource across seat / staff / cat, regardless
 * of whether any of them crosses the threshold. Consumers can decide
 * whether to act on the result based on `ratio`.
 */
export function detectBottleneck(metrics: MetricSummary): BottleneckInfo {
  const rows: BottleneckInfo[] = [
    { resource: 'seat', ratio: metrics.seatUtilization },
    { resource: 'staff', ratio: metrics.staffUtilization },
    { resource: 'cat', ratio: metrics.catUtilization },
  ]
  let best = rows[0]
  for (const r of rows) {
    if (r.ratio > best.ratio) best = r
  }
  return best
}

/**
 * Boil the whole run down to a situation + headline numbers. Designed
 * to produce deterministic, verbal, i18n-friendly output that the Hero
 * Verdict component and BottleneckCallout both consume.
 */
export function generateVerdict(metrics: MetricSummary): VerdictPayload {
  const arrived = metrics.totalCustomersArrived
  const served = metrics.totalCustomersServed
  const abandoned = Math.round(arrived * metrics.abandonRate)
  // Anything arrived but neither served nor abandoned was still in the
  // pipeline at env.run(until=...) truncation time.
  const inFlight = Math.max(0, arrived - served - abandoned)
  const servedPct = arrived > 0 ? (served / arrived) * 100 : 0
  const abandonedPct = arrived > 0 ? metrics.abandonRate * 100 : 0
  const bottleneck = detectBottleneck(metrics)

  let situation: VerdictSituation
  if (
    abandonedPct >= OVERLOAD_ABANDON_PCT ||
    bottleneck.ratio >= OVERLOAD_RHO
  ) {
    situation = 'overloaded'
  } else if (
    abandonedPct >= STRAIN_ABANDON_PCT ||
    bottleneck.ratio >= BOTTLENECK_THRESHOLD
  ) {
    situation = 'strained'
  } else {
    situation = 'healthy'
  }

  return {
    situation,
    bottleneck,
    arrivedCount: arrived,
    servedCount: served,
    abandonedCount: abandoned,
    inFlightCount: inFlight,
    servedPct,
    abandonedPct,
  }
}
