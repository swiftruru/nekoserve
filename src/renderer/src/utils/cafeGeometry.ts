/**
 * Shared geometry for the Playback scene.
 *
 * This module is deliberately stateless and depends only on types.
 * Both CafeScene.tsx (render layer) and replay.ts (reducer layer)
 * import from here so they can agree on:
 *
 *   - where each zone lives in SVG space
 *   - where each seat / cat slot sits inside its grid
 *   - what the "static" (non-walking) position of a character is for
 *     a given stage / state
 *
 * The reducer needs the static-position helpers so that whenever a
 * stage transition happens it can snapshot the customer's current
 * position as the START of the next walk path. Without this module the
 * reducer would have to duplicate CafeScene's geometry, which would
 * drift over time.
 */

import type { CafeState, CatSlot, CustomerRuntime } from './replay'

// ── View ───────────────────────────────────────────────────

export const VIEW_W = 1000
export const VIEW_H = 500

// ── Zone anchors (visual centers) ──────────────────────────

export const DOOR = { x: 60, y: 250 } as const
export const EXIT = { x: 940, y: 250 } as const
export const ABANDON = { x: 60, y: 380 } as const

export const QUEUE_SEAT = { x: 170, y: 90, step: 26 } as const

export const SEAT_GRID = {
  x: 260,
  y: 100,
  cellW: 44,
  cellH: 46,
  cols: 6,
} as const

export const CAT_GRID = {
  x: 760,
  y: 110,
  cellW: 70,
  cellH: 80,
  cols: 2,
} as const

export const KITCHEN = { x: 620, y: 130, stepX: 40 } as const

// Purely cosmetic corners inside the cat zone. Resting cats drift
// between home and one of these so the "rest" state has more narrative
// than just a 💤 sitting in place. Zero simulation semantics.
export const FOOD_CORNER = { x: 770, y: 340 } as const
export const LITTER_CORNER = { x: 878, y: 340 } as const

/**
 * How many sim-minutes a resting cat takes to complete one full
 * wander-to-corner-and-back cycle.
 */
export const REST_WANDER_CYCLE_MIN = 6

// ── Aisle corridors (for walking paths) ────────────────────

/**
 * Horizontal corridors along which characters walk to avoid crossing
 * through zone cards. The top aisle sits just above every zone card
 * (their top edges are at y=60); the bottom aisle sits just below
 * every zone card (their bottom edges are at y=440).
 *
 * Used by CafeScene path functions to route customers / cats around
 * the scene instead of cutting diagonal lines through solid cards.
 */
export const TOP_AISLE_Y = 52
export const BOTTOM_AISLE_Y = 458

// ── Per-slot geometry ──────────────────────────────────────

export function seatPos(slotIdx: number): { x: number; y: number } {
  const col = slotIdx % SEAT_GRID.cols
  const row = Math.floor(slotIdx / SEAT_GRID.cols)
  return {
    x: SEAT_GRID.x + col * SEAT_GRID.cellW,
    y: SEAT_GRID.y + row * SEAT_GRID.cellH,
  }
}

export function catHomePos(slotIdx: number): { x: number; y: number } {
  const col = slotIdx % CAT_GRID.cols
  const row = Math.floor(slotIdx / CAT_GRID.cols)
  return {
    x: CAT_GRID.x + col * CAT_GRID.cellW,
    y: CAT_GRID.y + row * CAT_GRID.cellH,
  }
}

/**
 * Position offset used when a cat is visiting a seated customer. The
 * cat sits to the right of the customer's avatar so both read clearly,
 * clamped so a cat on the rightmost seat column doesn't punch out of
 * the seat grid into the kitchen.
 */
export function catVisitingPosForSeat(
  seatSlot: number,
): { x: number; y: number } {
  const sp = seatPos(seatSlot)
  return {
    x: Math.min(sp.x + 16, SEAT_GRID.x + 5 * SEAT_GRID.cellW + 16),
    y: sp.y,
  }
}

// ── Static (non-walking) positions ─────────────────────────

/**
 * Where a customer "belongs" at the end of their current stage,
 * ignoring any in-progress walking animation. Used by both:
 *
 *   - The reducer, to snapshot `stageStartPos` before moving a
 *     customer into their next stage (so the next walk path has a
 *     correct starting point)
 *   - The CafeScene render loop, as the fallback when the current
 *     stage has no walk path (stationary stages like `ordering` /
 *     `dining` just return this position directly)
 *
 * Keep this function PURE — no refs, no closures, no side effects.
 */
export function staticCustomerPosition(
  c: CustomerRuntime,
  state: CafeState,
): { x: number; y: number } {
  switch (c.stage) {
    case 'arriving':
      return { x: DOOR.x, y: DOOR.y }
    case 'waitingSeat': {
      const idx = state.queueSeat.indexOf(c.id)
      const q = idx >= 0 ? idx : 0
      // Deterministic horizontal jitter per customer so the queue looks
      // like a crowd rather than a stack of perfectly aligned dots.
      const jitter = ((c.id * 7919) % 9) - 4
      return {
        x: QUEUE_SEAT.x + jitter,
        y: QUEUE_SEAT.y + q * QUEUE_SEAT.step,
      }
    }
    case 'seated':
    case 'ordering':
    case 'waitingFood':
    case 'dining':
      return c.seatSlot !== undefined
        ? seatPos(c.seatSlot)
        : { x: DOOR.x, y: DOOR.y }
    case 'leaving':
      return c.seatSlot !== undefined
        ? seatPos(c.seatSlot)
        : { x: EXIT.x, y: EXIT.y }
    case 'abandoned':
      // Abandoned customers slam out the front door, not off into a
      // separate corner. The dramatic-exit animation (`abandonDrama`
      // pulse) anchors its dust-cloud to DOOR too, so keep the static
      // fallback consistent.
      return { x: DOOR.x, y: DOOR.y }
  }
}

/**
 * Where a cat "belongs" at the end of its current state, ignoring any
 * walk path. Resting wander is NOT computed here — the scene renders
 * the cosmetic home↔corner drift via its own `restingCatTargetXY`.
 */
export function staticCatPosition(
  cat: CatSlot,
  state: CafeState,
): { x: number; y: number } {
  if (cat.state === 'visiting' && cat.visitingCustomerId !== null) {
    const customer = state.customers[cat.visitingCustomerId]
    if (customer && customer.seatSlot !== undefined) {
      return catVisitingPosForSeat(customer.seatSlot)
    }
  }
  return catHomePos(cat.slotIdx)
}
