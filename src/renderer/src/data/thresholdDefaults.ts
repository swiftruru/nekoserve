/**
 * Per-metric pass-bar defaults for the exceedance probability feature.
 *
 * These five are the ones the mid-term report committee actually asks
 * about ("cat welfare >= 3.5", "abandon rate <= 15%"). Metrics not
 * listed here have no preset; the UI falls back to letting the user
 * type a number in, with no line drawn until they do.
 *
 * The values reflect the *current* metric scales:
 *   - catWelfareScore is 0-5 (so 3.5 is the natural "decent" cutoff)
 *   - customerSatisfactionScore is 0-1, NOT 0-5 -- the spec doc's 3.5
 *     would be off-scale, so we use 0.7 ("70% satisfied") instead
 *   - avgWaitForSeat is in minutes
 *   - abandonRate is a fraction (15% = 0.15)
 *   - seatUtilization is a fraction
 */

import type { LiveMetricKey } from '../store/liveBatchStore'
import type { ThresholdConfig } from '../utils/exceedance'

export const THRESHOLD_DEFAULTS: Partial<Record<LiveMetricKey, ThresholdConfig>> = {
  catWelfareScore:           { value: 3.5,  direction: 'gte' },
  customerSatisfactionScore: { value: 0.7,  direction: 'gte' },
  avgWaitForSeat:            { value: 15,   direction: 'lte' },
  abandonRate:               { value: 0.15, direction: 'lte' },
  seatUtilization:           { value: 0.7,  direction: 'gte' },
}

/** Input step per metric. Wait time steps by whole minutes; the rest by
 *  0.1 or 0.01 depending on scale. Metrics not listed fall back to 0.01. */
export const THRESHOLD_STEPS: Partial<Record<LiveMetricKey, number>> = {
  catWelfareScore: 0.1,
  customerSatisfactionScore: 0.01,
  avgWaitForSeat: 1,
  abandonRate: 0.01,
  seatUtilization: 0.01,
}

/** Optional hard bounds for the input. catWelfareScore is 0-5,
 *  ratios are 0-1, time/count metrics are >=0 with no upper bound. */
export interface ThresholdBounds {
  min?: number
  max?: number
}

export const THRESHOLD_BOUNDS: Partial<Record<LiveMetricKey, ThresholdBounds>> = {
  catWelfareScore:           { min: 0, max: 5 },
  customerSatisfactionScore: { min: 0, max: 1 },
  seatUtilization:           { min: 0, max: 1 },
  staffUtilization:          { min: 0, max: 1 },
  catUtilization:            { min: 0, max: 1 },
  abandonRate:               { min: 0, max: 1 },
  catInteractionRate:        { min: 0, max: 1 },
  noCatVisitRate:            { min: 0, max: 1 },
  avgWaitForSeat:            { min: 0 },
  avgWaitForOrder:           { min: 0 },
  avgTotalStayTime:          { min: 0 },
  avgCatVisitsPerCustomer:   { min: 0 },
  totalCustomersServed:      { min: 0 },
  totalCustomersArrived:     { min: 0 },
  waitForSeatP50:            { min: 0 },
  waitForSeatP95:            { min: 0 },
  waitForSeatP99:            { min: 0 },
  waitForOrderP50:           { min: 0 },
  waitForOrderP95:           { min: 0 },
  waitForOrderP99:           { min: 0 },
}

export function getThresholdStep(metric: LiveMetricKey): number {
  return THRESHOLD_STEPS[metric] ?? 0.01
}

export function getThresholdBounds(metric: LiveMetricKey): ThresholdBounds {
  return THRESHOLD_BOUNDS[metric] ?? {}
}
