/**
 * Passive Exposure — second-channel cat satisfaction model.
 *
 * Hirsch 2025 only measured the CONTACT channel (cat physically on a
 * customer). In practice cat-café patrons also derive happiness from
 * just *seeing* a cat nearby — sitting on a shelf, walking past the
 * next table, lounging on the couch they're not on. This module
 * accumulates that "visible but not visiting" time per customer so the
 * results page can report it as a separate KPI without touching the
 * existing customerSatisfactionScore formula (which we don't want to
 * perturb: it's the baseline our validation mode scores against).
 *
 * Definition — hybrid: same-AREA + Euclidean distance decay + visibility
 * and behavior weights. See plan in
 * ~/.claude/plans/claude-code-plan-indexed-shore.md for the full spec.
 *
 *   PE_rate(c, t) = Σ_k  1[same_area(c,k)] × V(k) × D(c,k) × B(k)
 *
 * Integration is piecewise: we assume the rate is constant between
 * event timestamps, so we only accumulate at event boundaries.
 */
import {
  seatArea,
  seatPos,
  staticCatPosition,
} from './cafeGeometry'
import type { CafeState, CatSlot, CustomerStage } from './replay'

/** Stages where the customer is settled and has the bandwidth to enjoy
 *  ambient cats. Walking to/from the seat or abandoning doesn't count. */
export function isSeatedStage(stage: CustomerStage): boolean {
  return (
    stage === 'seated' ||
    stage === 'ordering' ||
    stage === 'waitingFood' ||
    stage === 'dining'
  )
}

/** Whether a cat is even a candidate for passive exposure this tick.
 *  A cat in the cat room, hidden, or off-duty (OUT_OF_LOUNGE) doesn't
 *  contribute — customers can't see it. */
export function catContributesToPassive(cat: CatSlot): boolean {
  if (cat.area === undefined) return false // pre-FSM legacy event stream
  if (cat.area === 'CAT_ROOM') return false
  if (cat.behaviorState === 'HIDDEN' || cat.behaviorState === 'OUT_OF_LOUNGE') {
    return false
  }
  return true
}

/** Elevated cats are more noticeable — a cat on a shelf catches the eye
 *  more than one on the floor. Multipliers are gentle (1.0 to 1.2) so
 *  they influence relative ordering without dominating distance/behavior. */
export function visibilityWeight(cat: CatSlot): number {
  if (cat.verticalLevel === 'SHELF') return 1.2
  if (cat.verticalLevel === 'FURNITURE') return 1.1
  return 1.0
}

/** Behavior weight — active cats (playing, exploring) are more joyful
 *  to watch than still ones. SOCIALIZING means with a *different*
 *  customer (this function is only called when cat is NOT visiting our
 *  specific customer), which still reads as "cat is engaged, fun to see". */
export function behaviorWeight(cat: CatSlot): number {
  switch (cat.behaviorState) {
    case 'PLAYING':
      return 1.3
    case 'ALERT':
    case 'MOVING':
    case 'EXPLORING':
    case 'SOCIALIZING':
      return 1.1
    default:
      return 1.0
  }
}

/** Distance decay: 1 at the seat, ~0.5 at ~150px away, tail continues.
 *  Canvas width is ~1000px so "same area + halfway across the area"
 *  gets roughly 0.25 — noticeable but clearly discounted. */
export function distanceWeight(
  seatX: number,
  seatY: number,
  catX: number,
  catY: number,
): number {
  const d = Math.hypot(catX - seatX, catY - seatY)
  return 1 / (1 + d / 150)
}

/** Saturation curve for display — converts raw weighted exposure
 *  minutes into a 0-1 "passive satisfaction" score so it can sit next
 *  to the other normalized metrics. τ=15min: a customer who accumulates
 *  15 min of weighted exposure is at ~0.63; 30 min at ~0.86. */
export function passiveSaturated(minutes: number): number {
  if (minutes <= 0) return 0
  return 1 - Math.exp(-minutes / 15)
}

/**
 * True if this customer is currently accruing passive-exposure minutes
 * at the given simulation snapshot: seated and at least one eligible
 * cat shares their AREA. Cheap enough to call per-customer per-frame in
 * the playback renderer.
 */
export function isAccumulatingPassiveExposure(
  customer: { stage: CustomerStage; seatSlot?: number; id: number },
  cats: readonly CatSlot[],
): boolean {
  if (!isSeatedStage(customer.stage)) return false
  if (customer.seatSlot === undefined) return false
  const customerArea = seatArea(customer.seatSlot)
  for (const cat of cats) {
    if (!catContributesToPassive(cat)) continue
    if (cat.area !== customerArea) continue
    if (cat.state === 'visiting' && cat.visitingCustomerId === customer.id) {
      continue
    }
    return true
  }
  return false
}

/**
 * Piecewise time-integrate the passive exposure rate over every seated
 * customer, from `draft.passiveExposureLastTick` to `toTime`. Call this
 * at the top of every event dispatch before applying any state change:
 * the rate is constant between events, so (toTime - lastTick) × rate
 * gives the exact accumulated exposure for that interval.
 *
 * O(customers × cats) per call. For a full replay (~1000 events, ~35
 * customers alive at peak, 3-5 cats) this is ~175k ops per full replay
 * pass — fast enough to run on every time-seek.
 */
export function accumulatePassiveExposure(
  draft: CafeState,
  toTime: number,
): void {
  const lastTick = draft.passiveExposureLastTick ?? 0
  const dt = toTime - lastTick
  if (dt <= 0) {
    draft.passiveExposureLastTick = toTime
    return
  }

  for (const c of Object.values(draft.customers)) {
    if (!isSeatedStage(c.stage) || c.seatSlot === undefined) continue
    const seat = seatPos(c.seatSlot)
    const customerArea = seatArea(c.seatSlot)

    let rate = 0
    for (const cat of draft.cats) {
      if (!catContributesToPassive(cat)) continue
      if (cat.area !== customerArea) continue
      // Skip the cat already visiting THIS customer — that's the
      // active channel, not passive. (Cats visiting other customers
      // still count as passive for me.)
      if (cat.state === 'visiting' && cat.visitingCustomerId === c.id) continue
      const catPos = staticCatPosition(cat, draft)
      const D = distanceWeight(seat.x, seat.y, catPos.x, catPos.y)
      const V = visibilityWeight(cat)
      const B = behaviorWeight(cat)
      rate += V * D * B
    }

    if (rate > 0) {
      const add = rate * dt
      c.passiveExposureMin += add
      draft.counters.totalPassiveExposureMin += add
      // Mirror to the persistent map so the results page can see final
      // totals even after the customer is swept from state.customers.
      draft.customerPassiveExposure[c.id] =
        (draft.customerPassiveExposure[c.id] ?? 0) + add
    }
  }

  draft.passiveExposureLastTick = toTime
}
