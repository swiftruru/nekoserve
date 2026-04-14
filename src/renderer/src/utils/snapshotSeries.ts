/**
 * Pre-computed metric snapshots for the Learning Mode overlay.
 *
 * The Playback reducer is pure and deterministic, so we can sample the
 * whole simulation once at a fixed time step and then let every concept
 * card pull the metrics it needs at the current sim-time with an O(log N)
 * binary search. This avoids having each card re-run `replayUpTo`
 * every frame.
 *
 * Naive O(N²) approach: for each sample t in [0, duration, step], call
 * `replayUpTo(ctx, t)` which internally replays from 0 to t. For a
 * 480 min run with step=1 and ~500 events, this is ~240k reducer
 * applications — well under a second on modern JS engines. If this
 * ever becomes a bottleneck, switch to an incremental reducer that
 * carries a running CafeState forward.
 */

import type { CafeState, ReplayContext } from './replay'
import { replayUpTo } from './replay'

export interface Snapshot {
  /** Sim-minutes at which this snapshot was taken. */
  simTime: number
  /** People currently waiting for a seat. */
  queueLen: number
  /** Seats with a customer in them. */
  seatsOccupied: number
  /** Staff currently preparing an order. */
  staffBusy: number
  /** Cats currently next to a customer. */
  catsVisiting: number
  /** Cumulative arrivals up to this sim-time. */
  arrived: number
  /** Cumulative served (happy departures) up to this sim-time. */
  served: number
  /** Cumulative abandoned up to this sim-time. */
  abandoned: number
}

export type SnapshotSeries = readonly Snapshot[]

function snapshotFromState(state: CafeState, simTime: number): Snapshot {
  let seatsOccupied = 0
  for (const slot of state.seats) {
    if (slot.customerId !== null) seatsOccupied += 1
  }
  let catsVisiting = 0
  for (const cat of state.cats) {
    if (cat.state === 'visiting') catsVisiting += 1
  }
  return {
    simTime,
    queueLen: state.queueSeat.length,
    seatsOccupied,
    staffBusy: state.staffBusyCount,
    catsVisiting,
    arrived: state.counters.arrived,
    served: state.counters.served,
    abandoned: state.counters.abandoned,
  }
}

/**
 * Precompute metric snapshots at `stepMin` resolution from 0 to
 * `duration`, inclusive. Called once when a simulation result loads.
 */
export function buildSnapshotSeries(
  ctx: ReplayContext,
  duration: number,
  stepMin: number = 1,
): SnapshotSeries {
  const out: Snapshot[] = []
  const step = Math.max(0.1, stepMin)
  for (let t = 0; t <= duration + 1e-9; t += step) {
    const clamped = Math.min(t, duration)
    const state = replayUpTo(ctx, clamped)
    out.push(snapshotFromState(state, clamped))
  }
  return out
}

/** Snapshot at or just before the given simTime (floor). */
export function snapshotAt(
  series: SnapshotSeries,
  simTime: number,
): Snapshot {
  if (series.length === 0) {
    return {
      simTime,
      queueLen: 0,
      seatsOccupied: 0,
      staffBusy: 0,
      catsVisiting: 0,
      arrived: 0,
      served: 0,
      abandoned: 0,
    }
  }
  if (simTime <= series[0].simTime) return series[0]
  const last = series[series.length - 1]
  if (simTime >= last.simTime) return last
  let lo = 0
  let hi = series.length - 1
  while (lo < hi) {
    const mid = (lo + hi + 1) >> 1
    if (series[mid].simTime <= simTime) lo = mid
    else hi = mid - 1
  }
  return series[lo]
}

/**
 * Time-average of a snapshot field over a sim-time window
 * `[fromMin, toMin]`. Uses arithmetic mean over the samples in the
 * window (OK because samples are evenly spaced).
 */
export function avgOverWindow(
  series: SnapshotSeries,
  field: Exclude<keyof Snapshot, 'simTime'>,
  fromMin: number,
  toMin: number,
): number {
  if (series.length === 0) return 0
  let sum = 0
  let count = 0
  for (const snap of series) {
    if (snap.simTime < fromMin) continue
    if (snap.simTime > toMin) break
    sum += snap[field]
    count += 1
  }
  if (count === 0) {
    // Window fell between samples; fall back to the nearest single snapshot.
    return snapshotAt(series, toMin)[field]
  }
  return sum / count
}

/**
 * Delta of a cumulative counter field across a sim-time window. Used
 * for arrival/service rate computations (λ, throughput).
 */
export function deltaOverWindow(
  series: SnapshotSeries,
  field: 'arrived' | 'served' | 'abandoned',
  fromMin: number,
  toMin: number,
): number {
  const clampedFrom = Math.max(0, fromMin)
  const from = snapshotAt(series, clampedFrom)[field]
  const to = snapshotAt(series, toMin)[field]
  return Math.max(0, to - from)
}
