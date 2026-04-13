import type { EventLogItem, SimulationConfig } from '../types'

/**
 * Pure reducer that rebuilds a café floor snapshot from the time-sorted
 * event log. Consumed by PlaybackPage to drive the SVG animation.
 *
 * Why a reducer instead of trusting the Python simulator's resource ids:
 * `simulator-python/simulator/core.py:140` emits `座位-{seats.count}` where
 * `seats.count` is the number of *currently occupied* seats at the moment
 * the event fires. Two customers can end up tagged `座位-1` at the same
 * time, and the tag has no relation to a physical seat slot. We therefore
 * assign our own stable virtual slot indices on CUSTOMER_SEATED and free
 * them on CUSTOMER_FINISH_DINING. Cats are assigned the same way because
 * the simulator emits no cat id at all.
 *
 * The reducer walks events in chronological order so a `replayUpTo(t)`
 * always produces the same output for the same (events, t) pair — this is
 * what lets scrubbing and reset work deterministically.
 */

export type CustomerStage =
  | 'arriving'
  | 'waitingSeat'
  | 'seated'
  | 'ordering'
  | 'waitingFood'
  | 'dining'
  | 'waitingCat'
  | 'interacting'
  | 'leaving'
  | 'abandoned'

export interface CustomerRuntime {
  id: number
  stage: CustomerStage
  seatSlot?: number
  catSlot?: number
  enteredAt: number
  /** Sim-minute at which the customer left or abandoned, used for fade-out. */
  leftAt?: number
}

export interface SeatSlot {
  slotIdx: number
  customerId: number | null
}

export interface CatSlot {
  slotIdx: number
  state: 'idle' | 'busy' | 'resting'
  /**
   * Customer currently associated with this cat slot. Stays populated while
   * the cat is `busy` or `resting` so CAT_START_REST / CAT_END_REST can find
   * the right slot by customerId — SimPy events don't carry cat identity.
   */
  customerId: number | null
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
  | 'petting'
  | 'abandon'

export interface Bubble {
  customerId: number
  kind: BubbleKind
  firedAt: number
}

/** How long a bubble stays visible, in sim-minutes. */
export const BUBBLE_TTL_MIN = 0.8

export interface CafeState {
  time: number
  seats: SeatSlot[]
  cats: CatSlot[]
  staffBusyCount: number
  queueSeat: number[]
  queueCat: number[]
  customers: Record<number, CustomerRuntime>
  /** Short-lived speech bubbles attached to customers by the reducer. */
  activeBubbles: Bubble[]
  lastEvent: EventLogItem | null
  /** How many events have been applied so far — drives the "N / M" counter. */
  appliedCount: number
  counters: {
    arrived: number
    served: number
    abandoned: number
  }
}

/**
 * Precomputed lookup table derived once per simulation result. Tells us
 * whether a given customer's cat interaction will be followed by a rest
 * period, so CUSTOMER_FINISH_CAT_INTERACTION can decide immediately whether
 * to release the cat slot or keep it reserved for the upcoming rest.
 */
export interface ReplayContext {
  config: SimulationConfig
  events: readonly EventLogItem[]
  catRestsByCustomer: Set<number>
}

export function buildReplayContext(
  events: readonly EventLogItem[],
  config: SimulationConfig,
): ReplayContext {
  const catRestsByCustomer = new Set<number>()
  for (const event of events) {
    if (event.eventType === 'CAT_START_REST') {
      catRestsByCustomer.add(event.customerId)
    }
  }
  return { config, events, catRestsByCustomer }
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
      state: 'idle' as const,
      customerId: null,
    })),
    staffBusyCount: 0,
    queueSeat: [],
    queueCat: [],
    customers: {},
    activeBubbles: [],
    lastEvent: null,
    appliedCount: 0,
    counters: { arrived: 0, served: 0, abandoned: 0 },
  }
}

// ─── Allocators ──────────────────────────────────────────────────────────

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

function allocateCat(cats: CatSlot[], customerId: number): number | null {
  for (const slot of cats) {
    if (slot.state === 'idle' && slot.customerId === null) {
      slot.state = 'busy'
      slot.customerId = customerId
      return slot.slotIdx
    }
  }
  return null
}

function findCatSlotByCustomer(cats: CatSlot[], customerId: number): CatSlot | undefined {
  return cats.find((c) => c.customerId === customerId)
}

function releaseCatSlot(slot: CatSlot): void {
  slot.state = 'idle'
  slot.customerId = null
}

function ensureCustomer(state: CafeState, id: number, now: number): CustomerRuntime {
  let c = state.customers[id]
  if (!c) {
    c = { id, stage: 'arriving', enteredAt: now }
    state.customers[id] = c
  }
  return c
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

// ─── Reducer ─────────────────────────────────────────────────────────────

/**
 * Applies a single event to the state. Mutates the passed draft for speed;
 * callers that need immutability should clone first (replayUpTo re-runs from
 * a fresh initial state each call, so mutation is safe there).
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
      c.stage = 'arriving'
      draft.counters.arrived += 1
      pushBubble(draft, cid, 'arrive', event.timestamp)
      break
    }

    case 'CUSTOMER_WAIT_SEAT': {
      const c = ensureCustomer(draft, cid, event.timestamp)
      c.stage = 'waitingSeat'
      if (!draft.queueSeat.includes(cid)) draft.queueSeat.push(cid)
      break
    }

    case 'CUSTOMER_SEATED': {
      const c = ensureCustomer(draft, cid, event.timestamp)
      removeFromQueue(draft.queueSeat, cid)
      const slot = allocateSeat(draft.seats, cid)
      if (slot !== null) c.seatSlot = slot
      c.stage = 'seated'
      break
    }

    case 'CUSTOMER_ORDER': {
      const c = ensureCustomer(draft, cid, event.timestamp)
      c.stage = 'ordering'
      draft.staffBusyCount = Math.min(
        ctx.config.staffCount,
        draft.staffBusyCount + 1,
      )
      pushBubble(draft, cid, 'order', event.timestamp)
      break
    }

    case 'ORDER_START_PREPARE': {
      const c = ensureCustomer(draft, cid, event.timestamp)
      c.stage = 'waitingFood'
      // Ordering done; prep grabs a staff slot next. Net effect on busy
      // count is zero (one released, one re-acquired) so we leave it.
      break
    }

    case 'ORDER_READY': {
      const c = ensureCustomer(draft, cid, event.timestamp)
      c.stage = 'waitingFood'
      draft.staffBusyCount = Math.max(0, draft.staffBusyCount - 1)
      break
    }

    case 'CUSTOMER_START_DINING': {
      const c = ensureCustomer(draft, cid, event.timestamp)
      c.stage = 'dining'
      pushBubble(draft, cid, 'dining', event.timestamp)
      break
    }

    case 'CUSTOMER_FINISH_DINING': {
      const c = ensureCustomer(draft, cid, event.timestamp)
      if (c.seatSlot !== undefined) {
        releaseSeat(draft.seats, c.seatSlot)
        c.seatSlot = undefined
      }
      c.stage = 'waitingCat'
      break
    }

    case 'CUSTOMER_WAIT_CAT': {
      const c = ensureCustomer(draft, cid, event.timestamp)
      c.stage = 'waitingCat'
      if (!draft.queueCat.includes(cid)) draft.queueCat.push(cid)
      break
    }

    case 'CUSTOMER_START_CAT_INTERACTION': {
      const c = ensureCustomer(draft, cid, event.timestamp)
      removeFromQueue(draft.queueCat, cid)
      const slot = allocateCat(draft.cats, cid)
      if (slot !== null) c.catSlot = slot
      c.stage = 'interacting'
      pushBubble(draft, cid, 'petting', event.timestamp)
      break
    }

    case 'CUSTOMER_FINISH_CAT_INTERACTION': {
      const c = ensureCustomer(draft, cid, event.timestamp)
      c.stage = 'leaving'
      // If this customer's cat will NOT rest, free the slot now. Otherwise
      // leave it populated so CAT_START_REST can flip it to 'resting'.
      if (!ctx.catRestsByCustomer.has(cid)) {
        const slot = findCatSlotByCustomer(draft.cats, cid)
        if (slot) releaseCatSlot(slot)
      }
      c.catSlot = undefined
      break
    }

    case 'CUSTOMER_LEAVE': {
      const c = ensureCustomer(draft, cid, event.timestamp)
      c.stage = 'leaving'
      c.leftAt = event.timestamp
      draft.counters.served += 1
      break
    }

    case 'CUSTOMER_ABANDON': {
      const c = ensureCustomer(draft, cid, event.timestamp)
      removeFromQueue(draft.queueSeat, cid)
      c.stage = 'abandoned'
      c.leftAt = event.timestamp
      draft.counters.abandoned += 1
      pushBubble(draft, cid, 'abandon', event.timestamp)
      break
    }

    case 'CAT_START_REST': {
      const slot = findCatSlotByCustomer(draft.cats, cid)
      if (slot) slot.state = 'resting'
      break
    }

    case 'CAT_END_REST': {
      const slot = findCatSlotByCustomer(draft.cats, cid)
      if (slot) releaseCatSlot(slot)
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
  return draft
}
