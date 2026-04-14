/**
 * Identify 3-5 "key moments" in a simulation run that are worth
 * highlighting on the Results page timeline. Each moment is a single
 * sim-time pointing at either a specific event in the log or a peak
 * in a derived snapshot series.
 *
 * The output is meant to drive a small clickable timeline in Section 1
 * (Flow): each moment becomes a bubble on the axis. Clicking a bubble
 * jumps to the Playback page with simTime seeked to that moment, so
 * students can see what the café looked like at that instant instead
 * of just reading a summary statistic.
 */

import type { EventLogItem } from '../types'
import type { SnapshotSeries } from './snapshotSeries'

export type KeyMomentKind =
  | 'firstArrive'
  | 'peakQueue'
  | 'firstAbandon'
  | 'peakBusy'
  | 'lastServed'

export interface KeyMoment {
  kind: KeyMomentKind
  simTime: number
  /**
   * Optional context displayed in the bubble tooltip — e.g. the peak
   * queue length for `peakQueue`, or the busy staff count for
   * `peakBusy`. Consumers format into text via i18n.
   */
  value?: number
}

export function extractKeyMoments(
  eventLog: readonly EventLogItem[],
  series: SnapshotSeries,
): KeyMoment[] {
  const out: KeyMoment[] = []

  // First arrival — the moment the café first saw a customer.
  const firstArrive = eventLog.find(
    (e) => e.eventType === 'CUSTOMER_ARRIVE',
  )
  if (firstArrive) {
    out.push({ kind: 'firstArrive', simTime: firstArrive.timestamp })
  }

  // Peak queue length — only worth highlighting when the queue really
  // backed up. One person briefly waiting is not a "peak"; skipping
  // sub-2 peaks keeps the timeline uncluttered on calm runs.
  if (series.length > 0) {
    let peakQ = series[0]
    for (const s of series) {
      if (s.queueLen > peakQ.queueLen) peakQ = s
    }
    if (peakQ.queueLen >= 2) {
      out.push({
        kind: 'peakQueue',
        simTime: peakQ.simTime,
        value: peakQ.queueLen,
      })
    }
  }

  // First abandon — only renders if at least one customer gave up.
  const firstAbandon = eventLog.find(
    (e) => e.eventType === 'CUSTOMER_ABANDON',
  )
  if (firstAbandon) {
    out.push({ kind: 'firstAbandon', simTime: firstAbandon.timestamp })
  }

  // Peak staff-busy — when the kitchen was maxed out. Only interesting
  // when at least two staff were simultaneously busy; a single staffer
  // being busy is just "normal operation", not a peak.
  if (series.length > 0) {
    let peakBusy = series[0]
    for (const s of series) {
      if (s.staffBusy > peakBusy.staffBusy) peakBusy = s
    }
    if (peakBusy.staffBusy >= 2) {
      out.push({
        kind: 'peakBusy',
        simTime: peakBusy.simTime,
        value: peakBusy.staffBusy,
      })
    }
  }

  // Last happy departure — the moment the café emptied out. Using a
  // trailing scan rather than reverse iteration to stay consistent.
  let lastServed: EventLogItem | undefined
  for (const e of eventLog) {
    if (e.eventType === 'CUSTOMER_LEAVE') lastServed = e
  }
  if (lastServed) {
    out.push({ kind: 'lastServed', simTime: lastServed.timestamp })
  }

  // Sort chronologically so the timeline reads left-to-right.
  return out.sort((a, b) => a.simTime - b.simTime)
}
