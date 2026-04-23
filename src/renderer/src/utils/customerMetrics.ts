/**
 * Derive per-customer timing and outcome from the raw event log.
 *
 * The event log carries each event as its own row. To ask questions
 * like "how long did each customer wait for a seat?" we need to pair
 * CUSTOMER_ARRIVE with CUSTOMER_SEATED for the same customerId. This
 * utility walks the log once, building a row per customer, and
 * returns a flat array that histogram / distribution components can
 * consume without touching events again.
 *
 * Notes:
 *   - `null` for a timing field means the customer never reached the
 *     required event pair (e.g. abandoned before being seated).
 *   - `catVisits` counts every CAT_VISIT_SEAT event for that customer
 *     so we can group them into "met a cat" vs "no cat" buckets.
 *   - Outcome is derived from whether the customer ever got a LEAVE
 *     or ABANDON event; if neither, they were in-flight at sim end.
 */

import type { EventLogItem } from '../types'

export type CustomerOutcome = 'served' | 'abandoned' | 'inFlight'

export interface CustomerMetrics {
  id: number
  /** CUSTOMER_ARRIVE → CUSTOMER_SEATED, or null if abandoned before seating. */
  waitForSeat: number | null
  /** CUSTOMER_ORDER → CUSTOMER_START_DINING, or null if never got there. */
  waitForOrder: number | null
  /** CUSTOMER_ARRIVE → CUSTOMER_LEAVE, or null if abandoned / in-flight. */
  totalStay: number | null
  /** Count of CAT_VISIT_SEAT events targeting this customer. */
  catVisits: number
  /** v2.2: Sum of CAT_VISIT_SEAT → CAT_LEAVE_SEAT durations for this
   *  customer. The "active contact" channel measured in minutes. */
  activeContactMin: number
  /** v2.2: weighted passive-exposure minutes (ambient cat-visibility
   *  channel). 0 if the map wasn't supplied or the customer didn't
   *  accumulate any exposure. */
  passiveExposureMin: number
  outcome: CustomerOutcome
}

interface PartialRow {
  arriveAt?: number
  seatedAt?: number
  orderAt?: number
  dineStartAt?: number
  leftAt?: number
  abandonedAt?: number
  catVisits: number
  activeContactMin: number
  /** Open visits keyed by catId: ts of CAT_VISIT_SEAT, awaiting LEAVE. */
  openVisits: Map<string, number>
}

export function extractCustomerMetrics(
  eventLog: readonly EventLogItem[],
  passiveExposureByCustomer?: Readonly<Record<number, number>>,
): CustomerMetrics[] {
  const byId = new Map<number, PartialRow>()

  for (const e of eventLog) {
    if (e.customerId <= 0) continue
    let row = byId.get(e.customerId)
    if (row === undefined) {
      row = { catVisits: 0, activeContactMin: 0, openVisits: new Map() }
      byId.set(e.customerId, row)
    }
    switch (e.eventType) {
      case 'CUSTOMER_ARRIVE':
        row.arriveAt = e.timestamp
        break
      case 'CUSTOMER_SEATED':
        row.seatedAt = e.timestamp
        break
      case 'CUSTOMER_ORDER':
        row.orderAt = e.timestamp
        break
      case 'CUSTOMER_START_DINING':
        row.dineStartAt = e.timestamp
        break
      case 'CUSTOMER_LEAVE':
        row.leftAt = e.timestamp
        break
      case 'CUSTOMER_ABANDON':
        row.abandonedAt = e.timestamp
        break
      case 'CAT_VISIT_SEAT': {
        row.catVisits += 1
        // Key open-visit by resource so concurrent visits by different
        // cats pair correctly with their own LEAVE events.
        const key = e.resourceId ?? 'anon'
        row.openVisits.set(key, e.timestamp)
        break
      }
      case 'CAT_LEAVE_SEAT': {
        const key = e.resourceId ?? 'anon'
        const start = row.openVisits.get(key)
        if (start !== undefined) {
          row.activeContactMin += Math.max(0, e.timestamp - start)
          row.openVisits.delete(key)
        }
        break
      }
    }
  }

  const out: CustomerMetrics[] = []
  for (const [id, r] of byId) {
    out.push({
      id,
      waitForSeat:
        r.arriveAt !== undefined && r.seatedAt !== undefined
          ? Math.max(0, r.seatedAt - r.arriveAt)
          : null,
      waitForOrder:
        r.orderAt !== undefined && r.dineStartAt !== undefined
          ? Math.max(0, r.dineStartAt - r.orderAt)
          : null,
      totalStay:
        r.arriveAt !== undefined && r.leftAt !== undefined
          ? Math.max(0, r.leftAt - r.arriveAt)
          : null,
      catVisits: r.catVisits,
      activeContactMin: r.activeContactMin,
      passiveExposureMin: passiveExposureByCustomer?.[id] ?? 0,
      outcome:
        r.abandonedAt !== undefined
          ? 'abandoned'
          : r.leftAt !== undefined
          ? 'served'
          : 'inFlight',
    })
  }
  return out.sort((a, b) => a.id - b.id)
}

/**
 * Bin a list of numeric values into `binCount` equal-width buckets.
 * Returns the bin edges and counts. Used by WaitHistogram.
 */
export interface Histogram {
  binCount: number
  binWidth: number
  /** Inclusive start of each bin. `edges[binCount]` is the upper bound. */
  edges: number[]
  /** Count of samples in each bin. `counts.length === binCount`. */
  counts: number[]
  /** Smallest value seen (or 0 if empty). */
  min: number
  /** Largest value seen (or 0 if empty). */
  max: number
  /** Arithmetic mean across all non-null samples. */
  mean: number
  /** Number of samples that went into the histogram. */
  total: number
}

export function binValues(
  values: readonly (number | null)[],
  binCount: number = 10,
): Histogram {
  const nums = values.filter((v): v is number => v !== null && Number.isFinite(v))
  if (nums.length === 0) {
    return {
      binCount,
      binWidth: 0,
      edges: Array.from({ length: binCount + 1 }, () => 0),
      counts: Array.from({ length: binCount }, () => 0),
      min: 0,
      max: 0,
      mean: 0,
      total: 0,
    }
  }
  const min = Math.min(...nums)
  const max = Math.max(...nums)
  const range = max - min
  // Guard against zero-width: if every sample is identical, widen by 1.
  const effectiveRange = range > 0 ? range : 1
  const binWidth = effectiveRange / binCount
  const edges: number[] = []
  for (let i = 0; i <= binCount; i++) {
    edges.push(min + binWidth * i)
  }
  const counts = new Array<number>(binCount).fill(0)
  for (const v of nums) {
    // Place into bin; last bin is inclusive of max.
    let idx = Math.floor((v - min) / binWidth)
    if (idx >= binCount) idx = binCount - 1
    if (idx < 0) idx = 0
    counts[idx] += 1
  }
  const sum = nums.reduce((acc, x) => acc + x, 0)
  return {
    binCount,
    binWidth,
    edges,
    counts,
    min,
    max,
    mean: sum / nums.length,
    total: nums.length,
  }
}
