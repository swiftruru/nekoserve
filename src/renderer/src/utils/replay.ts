import type { EventLogItem, SimulationConfig } from '../types'
import { staticCatPosition, staticCustomerPosition } from './cafeGeometry'

/**
 * Pure reducer that rebuilds a café floor snapshot from the time-sorted
 * event log. Consumed by PlaybackPage to drive the SVG animation.
 *
 * v0.4.0 rewrite
 * --------------
 * Cats are now autonomous — the Python simulator emits `CAT_VISIT_SEAT`
 * with `resourceId = "貓-N"` whenever a cat physically walks over to a
 * seated customer, and `CAT_LEAVE_SEAT` when it wanders off. A cat may
 * visit several customers per stay, and a customer may be visited by
 * several cats at once. The three old events (`CUSTOMER_WAIT_CAT`,
 * `CUSTOMER_START_CAT_INTERACTION`, `CUSTOMER_FINISH_CAT_INTERACTION`)
 * are gone and so are the associated customer stages.
 *
 * What we still have to work around: the seat label (`座位-N`) is still
 * the "count of currently-occupied seats at emit time", NOT a stable
 * slot identity — see `simulator-python/simulator/core.py`. So we
 * maintain virtual seat slots via a free-pool allocator.
 *
 * Cat identity, however, IS carried now: `resourceId = "貓-N"` is
 * parseable and 1-indexed. We map it onto a 0-indexed cat slot array.
 */

export type CustomerStage =
  | 'arriving'
  | 'waitingSeat'
  | 'seated'
  | 'ordering'
  | 'waitingFood'
  | 'dining'
  | 'leaving'
  | 'abandoned'

export interface CustomerRuntime {
  id: number
  stage: CustomerStage
  seatSlot?: number
  enteredAt: number
  /**
   * Sim-minute at which the customer entered their CURRENT stage.
   * Drives the walk-path progress calculation in CafeScene so the
   * animation is purely a function of `state.time - stageStartedAt`.
   */
  stageStartedAt: number
  /**
   * Snapshot of the customer's position at the moment they entered
   * the current stage. Used as the starting point of the walk path
   * for this stage. Set by `transitionCustomerStage` before writing
   * the new stage value.
   */
  stageStartPos?: { x: number; y: number }
  /** Cat ids currently sitting with this customer. */
  visitingCats: Set<number>
  /** Total cat visits received during this stay (monotonic counter). */
  visitCount: number
  /** Sim-minute at which the customer left or abandoned, used for fade-out. */
  leftAt?: number
}

export interface SeatSlot {
  slotIdx: number
  customerId: number | null
}

/**
 * A cat's animation state.
 *   - `idle`: wandering in the cat zone (home position)
 *   - `visiting`: physically next to a seated customer
 *   - `resting`: sleeping in the cat zone (💤)
 */
export type CatState = 'idle' | 'visiting' | 'resting'

export interface CatSlot {
  /** 0-indexed; `catId` in events is 1-indexed. */
  slotIdx: number
  state: CatState
  /**
   * Customer the cat is currently visiting (only while `state === 'visiting'`).
   */
  visitingCustomerId: number | null
  /**
   * Sim-minute at which the cat entered its current state. Used by
   * CafeScene to compute walk-path progress for idle→visiting and
   * visiting→idle transitions.
   */
  stateStartedAt: number
  /**
   * Position at the moment the cat entered its current state, used as
   * the starting point of the walk path for that state.
   */
  stateStartPos?: { x: number; y: number }
  /**
   * Seat slot of the LAST customer this cat visited. Kept alive past
   * CAT_LEAVE_SEAT so the return path has a proper starting point
   * (we need to animate "from the seat" even after state has flipped
   * back to idle).
   */
  lastVisitSeatSlot?: number
  /**
   * v2.1: richer behavior state from the nine-state FSM
   * (CAT_STATE_CHANGE event's toState). Optional because legacy
   * simulator builds may not emit it.
   */
  behaviorState?:
    | 'OUT_OF_LOUNGE'
    | 'RESTING'
    | 'SOCIALIZING'
    | 'HIDDEN'
    | 'ALERT'
    | 'GROOMING'
    | 'MOVING'
    | 'EXPLORING'
    | 'PLAYING'
  /** v2.1: current café area (AREA_1 / AREA_2 / CAT_ROOM). */
  area?: 'AREA_1' | 'AREA_2' | 'CAT_ROOM'
  /** v2.1: current vertical level (FLOOR / FURNITURE / SHELF). */
  verticalLevel?: 'FLOOR' | 'FURNITURE' | 'SHELF'
}

export interface CafeState {
  time: number
  seats: SeatSlot[]
  cats: CatSlot[]
  staffBusyCount: number
  queueSeat: number[]
  customers: Record<number, CustomerRuntime>
  /** Short-lived speech bubbles attached to customers by the reducer. */
  activeBubbles: Bubble[]
  /** Short-lived scene-anchored visual effects (seat pop, kitchen ding, …). */
  scenePulses: ScenePulse[]
  lastEvent: EventLogItem | null
  /** How many events have been applied so far — drives the "N / M" counter. */
  appliedCount: number
  counters: {
    arrived: number
    served: number
    abandoned: number
    /** Total cat visits completed so far (cumulative). */
    catVisits: number
  }
}

/**
 * Short-lived speech bubble attached to a customer. Bubbles live in reducer
 * state (not a side effect) so scrubbing to any sim-time deterministically
 * rebuilds which bubbles should be visible at that moment.
 */
export type BubbleKind =
  | 'arrive'
  | 'order'
  | 'dining'
  | 'catArrive'
  | 'abandon'

export interface Bubble {
  customerId: number
  kind: BubbleKind
  firedAt: number
}

/** How long a bubble stays visible, in sim-minutes. */
export const BUBBLE_TTL_MIN = 0.8

/**
 * Scene pulses are non-textual visual events (a seat popping, a kitchen
 * flashing, a puff of particles) anchored to a specific scene element
 * rather than a customer avatar. They are stored in reducer state so
 * scrubbing the timeline deterministically replays each pulse at the
 * right simulation instant.
 */
export type PulseKind =
  | 'seatOccupy'
  | 'orderReady'
  | 'catLeaveSeat'
  | 'finishDining'
  | 'abandonDrama'

export interface ScenePulse {
  kind: PulseKind
  /**
   * For `seatOccupy`, `catLeaveSeat`, `finishDining`: the seat slot index.
   * For `orderReady` and `abandonDrama`: the customer id.
   */
  target: number
  firedAt: number
}

/**
 * How long each scene pulse kind stays in reducer state, in sim-minutes.
 *
 * Must be generous enough that at any playback speed the CSS animation
 * has enough real-time to at least render its first frame. Front-loaded
 * keyframes guarantee the peak dramatic state is visible from frame 0,
 * so even a heavily compressed replay shows the effect.
 *
 * `abandonDrama` is shorter (1.0) because it is a multi-phase skit
 * whose phases key off `(now - firedAt) / PULSE_TTL_MIN.abandonDrama`,
 * so the total window maps exactly onto the 1 sim-min choreography.
 */
export const PULSE_TTL_MIN: Record<PulseKind, number> = {
  seatOccupy: 3.0,
  orderReady: 3.0,
  catLeaveSeat: 3.0,
  finishDining: 3.0,
  abandonDrama: 1.0,
}

/**
 * Precomputed lookup table derived once per simulation result. Currently
 * just carries the config and raw event list; retained as a named struct
 * because future optimisations (snapshot index for huge logs) can live
 * here without touching call sites.
 */
export interface ReplayContext {
  config: SimulationConfig
  events: readonly EventLogItem[]
}

export function buildReplayContext(
  events: readonly EventLogItem[],
  config: SimulationConfig,
): ReplayContext {
  return { config, events }
}

export function initialState(config: SimulationConfig): CafeState {
  return {
    time: 0,
    seats: Array.from({ length: config.seatCount }, (_, i) => ({
      slotIdx: i,
      customerId: null,
    })),
    cats: Array.from({ length: config.catCount }, (_, i) => ({
      slotIdx: i,
      state: 'idle' as CatState,
      visitingCustomerId: null,
      stateStartedAt: 0,
    })),
    staffBusyCount: 0,
    queueSeat: [],
    customers: {},
    activeBubbles: [],
    scenePulses: [],
    lastEvent: null,
    appliedCount: 0,
    counters: { arrived: 0, served: 0, abandoned: 0, catVisits: 0 },
  }
}

// ─── Seat allocator ──────────────────────────────────────────────────────

function allocateSeat(seats: SeatSlot[], customerId: number): number | null {
  for (const slot of seats) {
    if (slot.customerId === null) {
      slot.customerId = customerId
      return slot.slotIdx
    }
  }
  return null
}

function releaseSeat(seats: SeatSlot[], slotIdx: number): void {
  const slot = seats[slotIdx]
  if (slot) slot.customerId = null
}

// ─── Cat identity parsing ────────────────────────────────────────────────
// The Python simulator emits `resourceId = "貓-N"` (1-indexed). We convert
// it into a 0-indexed slotIdx for our cats array. If the parse fails we
// bail out silently — the event will be applied as a no-op, and the scene
// degrades gracefully.

function parseCatSlotIdx(resourceId: string | undefined): number | null {
  if (!resourceId) return null
  // Accept the Traditional Chinese form "貓-N" as well as a pure-ASCII
  // "cat-N" form in case the simulator is retrofitted to English.
  const match = resourceId.match(/^(?:貓|cat)-(\d+)$/)
  if (!match) return null
  const oneBased = parseInt(match[1], 10)
  if (Number.isNaN(oneBased) || oneBased < 1) return null
  return oneBased - 1
}

// ─── Customer + bubble helpers ───────────────────────────────────────────

function ensureCustomer(state: CafeState, id: number, now: number): CustomerRuntime {
  let c = state.customers[id]
  if (!c) {
    c = {
      id,
      stage: 'arriving',
      enteredAt: now,
      stageStartedAt: now,
      // New customers are born at the door — this gives the very first
      // path (door → queue) a proper starting point.
      stageStartPos: { x: 60, y: 250 },
      visitingCats: new Set<number>(),
      visitCount: 0,
    }
    state.customers[id] = c
  }
  return c
}

/**
 * Transition a customer into a new stage while snapshotting their
 * current position as the start of the next walk path. Centralising
 * this into one helper ensures every single stage-changing event
 * handler agrees on the invariant: `stageStartPos` is always the
 * position from the OLD stage, `stageStartedAt` is always the current
 * event's timestamp.
 *
 * Missing this on any handler would cause characters to teleport to
 * `(0, 0)` and then fly to the destination — the most visible bug in
 * this whole refactor.
 */
function transitionCustomerStage(
  c: CustomerRuntime,
  newStage: CustomerStage,
  draft: CafeState,
  now: number,
): void {
  // Snapshot the OLD stage's position (before mutating stage) so the
  // next walk path knows where this character is coming from.
  c.stageStartPos = staticCustomerPosition(c, draft)
  c.stage = newStage
  c.stageStartedAt = now
}

/**
 * Transition a cat into a new state, snapshotting its current
 * position. Same pattern as transitionCustomerStage but for cats.
 */
function transitionCatState(
  cat: CatSlot,
  newState: CatState,
  draft: CafeState,
  now: number,
): void {
  cat.stateStartPos = staticCatPosition(cat, draft)
  cat.state = newState
  cat.stateStartedAt = now
}

function removeFromQueue(queue: number[], customerId: number): void {
  const idx = queue.indexOf(customerId)
  if (idx !== -1) queue.splice(idx, 1)
}

function pushBubble(
  draft: CafeState,
  customerId: number,
  kind: BubbleKind,
  now: number,
): void {
  draft.activeBubbles.push({ customerId, kind, firedAt: now })
}

function pushPulse(
  draft: CafeState,
  kind: PulseKind,
  target: number,
  now: number,
): void {
  draft.scenePulses.push({ kind, target, firedAt: now })
}

// ─── Reducer ─────────────────────────────────────────────────────────────

/**
 * Applies a single event to the state. Mutates the passed draft for speed;
 * `replayUpTo` re-runs from a fresh initial state each call, so mutation
 * is safe there.
 */
export function applyEvent(
  draft: CafeState,
  event: EventLogItem,
  ctx: ReplayContext,
): void {
  draft.time = event.timestamp
  draft.lastEvent = event
  draft.appliedCount += 1
  const cid = event.customerId

  switch (event.eventType) {
    case 'CUSTOMER_ARRIVE': {
      const c = ensureCustomer(draft, cid, event.timestamp)
      transitionCustomerStage(c, 'arriving', draft, event.timestamp)
      draft.counters.arrived += 1
      pushBubble(draft, cid, 'arrive', event.timestamp)
      break
    }

    case 'CUSTOMER_WAIT_SEAT': {
      const c = ensureCustomer(draft, cid, event.timestamp)
      transitionCustomerStage(c, 'waitingSeat', draft, event.timestamp)
      if (!draft.queueSeat.includes(cid)) draft.queueSeat.push(cid)
      break
    }

    case 'CUSTOMER_SEATED': {
      const c = ensureCustomer(draft, cid, event.timestamp)
      removeFromQueue(draft.queueSeat, cid)
      const slot = allocateSeat(draft.seats, cid)
      // Must snapshot the queue position BEFORE setting seatSlot, because
      // staticCustomerPosition for stage='waitingSeat' reads the queue
      // index. If we set seatSlot first, the customer has already "moved"
      // to the seat before transitionCustomerStage samples position.
      transitionCustomerStage(c, 'seated', draft, event.timestamp)
      if (slot !== null) {
        c.seatSlot = slot
        pushPulse(draft, 'seatOccupy', slot, event.timestamp)
      }
      break
    }

    case 'CUSTOMER_ORDER': {
      const c = ensureCustomer(draft, cid, event.timestamp)
      transitionCustomerStage(c, 'ordering', draft, event.timestamp)
      draft.staffBusyCount = Math.min(
        ctx.config.staffCount,
        draft.staffBusyCount + 1,
      )
      pushBubble(draft, cid, 'order', event.timestamp)
      break
    }

    case 'ORDER_START_PREPARE': {
      const c = ensureCustomer(draft, cid, event.timestamp)
      transitionCustomerStage(c, 'waitingFood', draft, event.timestamp)
      break
    }

    case 'ORDER_READY': {
      const c = ensureCustomer(draft, cid, event.timestamp)
      transitionCustomerStage(c, 'waitingFood', draft, event.timestamp)
      draft.staffBusyCount = Math.max(0, draft.staffBusyCount - 1)
      pushPulse(draft, 'orderReady', cid, event.timestamp)
      break
    }

    case 'CUSTOMER_START_DINING': {
      const c = ensureCustomer(draft, cid, event.timestamp)
      transitionCustomerStage(c, 'dining', draft, event.timestamp)
      pushBubble(draft, cid, 'dining', event.timestamp)
      break
    }

    case 'CUSTOMER_FINISH_DINING': {
      const c = ensureCustomer(draft, cid, event.timestamp)
      // The customer stays in the seat until every visiting cat has left,
      // so we leave `seatSlot` populated and just flip the stage. Seat is
      // released on CUSTOMER_LEAVE.
      transitionCustomerStage(c, 'leaving', draft, event.timestamp)
      if (c.seatSlot !== undefined) {
        pushPulse(draft, 'finishDining', c.seatSlot, event.timestamp)
      }
      break
    }

    case 'CUSTOMER_LEAVE': {
      const c = ensureCustomer(draft, cid, event.timestamp)
      // Snapshot the seat position BEFORE releasing the seat slot, so
      // the leaving path starts from the seat (not from EXIT which is
      // what staticCustomerPosition returns when seatSlot is undefined).
      transitionCustomerStage(c, 'leaving', draft, event.timestamp)
      if (c.seatSlot !== undefined) {
        releaseSeat(draft.seats, c.seatSlot)
        c.seatSlot = undefined
      }
      c.leftAt = event.timestamp
      draft.counters.served += 1
      break
    }

    case 'CUSTOMER_ABANDON': {
      const c = ensureCustomer(draft, cid, event.timestamp)
      // Snapshot queue position BEFORE removing from queue, so the
      // abandon path starts from the queue slot the customer was in.
      transitionCustomerStage(c, 'abandoned', draft, event.timestamp)
      removeFromQueue(draft.queueSeat, cid)
      c.leftAt = event.timestamp
      draft.counters.abandoned += 1
      pushBubble(draft, cid, 'abandon', event.timestamp)
      pushPulse(draft, 'abandonDrama', cid, event.timestamp)
      break
    }

    case 'CAT_VISIT_SEAT': {
      const catIdx = parseCatSlotIdx(event.resourceId)
      if (catIdx === null || catIdx >= draft.cats.length) break
      const catSlot = draft.cats[catIdx]
      // Snapshot the cat's current (idle/home) position, then flip to
      // visiting. The visitingCustomerId must be set AFTER the snapshot
      // so staticCatPosition on the OLD state returns the home cell.
      transitionCatState(catSlot, 'visiting', draft, event.timestamp)
      catSlot.visitingCustomerId = cid
      const c = ensureCustomer(draft, cid, event.timestamp)
      c.visitingCats.add(catIdx)
      c.visitCount += 1
      if (c.seatSlot !== undefined) {
        catSlot.lastVisitSeatSlot = c.seatSlot
      }
      draft.counters.catVisits += 1
      pushBubble(draft, cid, 'catArrive', event.timestamp)
      break
    }

    case 'CAT_LEAVE_SEAT': {
      const catIdx = parseCatSlotIdx(event.resourceId)
      if (catIdx === null || catIdx >= draft.cats.length) break
      const catSlot = draft.cats[catIdx]
      // Snapshot the seat-side position before flipping to idle, so the
      // return path starts from the seat and animates back to home.
      transitionCatState(catSlot, 'idle', draft, event.timestamp)
      catSlot.visitingCustomerId = null
      const c = draft.customers[cid]
      if (c) {
        c.visitingCats.delete(catIdx)
        if (c.seatSlot !== undefined) {
          pushPulse(draft, 'catLeaveSeat', c.seatSlot, event.timestamp)
        }
      }
      break
    }

    case 'CAT_START_REST': {
      // cid is the cat's own id (1-indexed), not a customer id.
      const catIdx = parseCatSlotIdx(event.resourceId)
      if (catIdx === null || catIdx >= draft.cats.length) break
      const catSlot = draft.cats[catIdx]
      transitionCatState(catSlot, 'resting', draft, event.timestamp)
      catSlot.visitingCustomerId = null
      break
    }

    case 'CAT_END_REST': {
      const catIdx = parseCatSlotIdx(event.resourceId)
      if (catIdx === null || catIdx >= draft.cats.length) break
      const catSlot = draft.cats[catIdx]
      if (catSlot.state === 'resting') {
        transitionCatState(catSlot, 'idle', draft, event.timestamp)
        catSlot.visitingCustomerId = null
      }
      break
    }

    case 'CAT_STATE_CHANGE': {
      // v2.1: nine-state ethogram transition. Updates the cat's
      // behaviorState + area + verticalLevel so CafeScene can route
      // the sprite to the correct anchor (shelf / furniture / cat room).
      // We do NOT flip the legacy state ('idle' / 'visiting' / 'resting')
      // here — those stay driven by CAT_VISIT_SEAT / CAT_START_REST so
      // existing animation paths keep working.
      const catIdx = parseCatSlotIdx(event.resourceId)
      if (catIdx === null || catIdx >= draft.cats.length) break
      const catSlot = draft.cats[catIdx]
      const toState = (event as { toState?: string }).toState
      const area = (event as { area?: string }).area
      const level = (event as { level?: string }).level
      if (toState) {
        catSlot.behaviorState = toState as NonNullable<CatSlot['behaviorState']>
      }
      if (area) {
        catSlot.area = area as NonNullable<CatSlot['area']>
      }
      if (level) {
        catSlot.verticalLevel = level as NonNullable<CatSlot['verticalLevel']>
      }
      break
    }
  }
}

/**
 * How many sim-minutes a leaving / abandoned customer lingers on the scene
 * so the exit fade-out animation has time to play before the avatar is
 * deleted. Keeps the scene from accumulating stale dots on long replays.
 */
export const LEAVE_LINGER_MIN = 2

/**
 * Replays events from t=0 up to and including `simTime`. O(N) in the number
 * of events; the event log is typically ~600-800 items so this easily runs
 * within a single animation frame.
 */
export function replayUpTo(ctx: ReplayContext, simTime: number): CafeState {
  const draft = initialState(ctx.config)
  for (const event of ctx.events) {
    if (event.timestamp > simTime) break
    applyEvent(draft, event, ctx)
  }
  // Clamp draft.time to simTime so fade timing is frame-accurate even when
  // the last applied event is several minutes behind the current clock.
  draft.time = simTime
  // Sweep departed customers whose fade window has elapsed.
  for (const id in draft.customers) {
    const c = draft.customers[id]
    if (c.leftAt !== undefined && simTime - c.leftAt > LEAVE_LINGER_MIN) {
      delete draft.customers[id]
    }
  }
  // Sweep expired speech bubbles so the scene only renders the freshest batch.
  draft.activeBubbles = draft.activeBubbles.filter(
    (b) => simTime - b.firedAt <= BUBBLE_TTL_MIN,
  )
  // Scene pulses live up to their per-kind TTL.
  draft.scenePulses = draft.scenePulses.filter(
    (p) => simTime - p.firedAt <= PULSE_TTL_MIN[p.kind],
  )
  return draft
}
