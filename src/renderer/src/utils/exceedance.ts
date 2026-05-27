/**
 * Threshold exceedance probability.
 *
 * Given a set of per-run sample values for one metric and a pass/fail
 * threshold, count how many runs cleared the bar. The whole point is to
 * answer the "if X >= 3.5 counts as passing, how many simulations
 * passed?" question that a mean alone can't.
 *
 * Pure function, no React or Zustand deps -- easy to unit-test and easy
 * to call from useMemo in any consumer.
 */

export type ThresholdDirection = 'gte' | 'lte'

/** A single metric's pass/fail rule. */
export interface ThresholdConfig {
  /** The bar value on the metric's natural scale. */
  value: number
  /** 'gte' = higher is better (X >= value passes).
   *  'lte' = lower is better (X <= value passes, e.g. wait time, abandon rate). */
  direction: ThresholdDirection
}

/** Outcome of evaluating one threshold against one sample set. */
export interface ExceedanceResult {
  /** Pass fraction, 0..1. */
  probability: number
  /** Number of runs that passed. */
  count: number
  /** Number of finite-valued runs considered (NaN/Inf are skipped). */
  total: number
}

export function calcExceedProb(
  values: number[],
  threshold: number,
  direction: ThresholdDirection,
): ExceedanceResult {
  if (values.length === 0) return { probability: 0, count: 0, total: 0 }
  let count = 0
  let total = 0
  for (const v of values) {
    if (!Number.isFinite(v)) continue
    total++
    if (direction === 'gte' ? v >= threshold : v <= threshold) count++
  }
  if (total === 0) return { probability: 0, count: 0, total: 0 }
  return { probability: count / total, count, total }
}

/** Convenience predicate for "is this single value passing the bar?". */
export function passesThreshold(
  value: number,
  threshold: ThresholdConfig,
): boolean {
  if (!Number.isFinite(value)) return false
  return threshold.direction === 'gte'
    ? value >= threshold.value
    : value <= threshold.value
}
