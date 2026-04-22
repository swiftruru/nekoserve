/**
 * Shared geometry for the Playback scene.
 *
 * v2.1: Redesigned around the real cat-café floor plan (Hirsch 2025
 * appendix). The canvas is now portrait 1000×780, partitioned into:
 *
 *   - AREA_2 (top): café seating with a round-6 table + four 2-seaters
 *   - COUNTER (middle): L-shaped bar that blocks north-south traffic
 *   - AREA_1 (bottom): main lounge with sofas, coffee table, round-4 tables
 *   - CAT_ROOM (top-right): cat-only retreat, customers can't enter
 *   - ENTRANCE (right-middle): single door, also used as exit
 *   - CAT_TREE (left wall of AREA_1): vertical shelf anchor
 *
 * Seat allocation is now anchor-based: FURNITURE defines every piece
 * of furniture with its center + seat count, and `seatPos(slotIdx)`
 * maps a flat slot index to a cushion coordinate on a specific piece
 * of furniture. SimulationConfig.seatCount should fit within
 * MAX_SEATS (currently 23).
 *
 * Legacy names (DOOR, EXIT, QUEUE_SEAT, etc.) are preserved as
 * aliases so existing consumers in CafeScene continue to compile
 * during the three-commit rewrite; they point at sensible positions
 * in the new layout.
 */

import type { CafeState, CatSlot, CustomerRuntime } from './replay'

// ── View ───────────────────────────────────────────────────

export const VIEW_W = 1000
export const VIEW_H = 780

// ── Area partitions ────────────────────────────────────────

export type CafeAreaId = 'AREA_1' | 'AREA_2' | 'CAT_ROOM'

export interface AreaRect {
  id: CafeAreaId
  x: number
  y: number
  w: number
  h: number
  labelX: number
  labelY: number
}

export const AREAS: Record<CafeAreaId, AreaRect> = {
  // Upper café zone (tables, quieter side). Spans full width except
  // Cat Room, which sits to its right.
  AREA_2: { id: 'AREA_2', x: 60,  y: 40,  w: 640, h: 280, labelX: 380, labelY: 60 },
  // Lower lounge (sofas + round tables + cat tree).
  AREA_1: { id: 'AREA_1', x: 60,  y: 440, w: 820, h: 320, labelX: 470, labelY: 460 },
  // Private cat retreat, top-right. Customers never cross the line.
  CAT_ROOM: { id: 'CAT_ROOM', x: 730, y: 40, w: 230, h: 260, labelX: 845, labelY: 60 },
}

// Counter / bar strip between AREA_2 and AREA_1. Acts as a physical
// barrier — no character walks through it; paths route around via
// RIGHT_AISLE_X.
export const COUNTER = { x: 60, y: 330, w: 640, h: 70 } as const

// Entrance from reception (single door, right-middle, between Cat Room
// bottom and counter east end). Used for both arrival and exit.
export const ENTRANCE = { x: 940, y: 310 } as const

// Queue anchor — a few sim-minutes of waiting happen here, near the
// bar's east end right after stepping in from the reception door.
export const QUEUE_ANCHOR = { x: 710, y: 345, step: 22 } as const

// Kitchen / staff positions — behind the bar.
export const KITCHEN_STAFF_SLOTS = [
  { x: 250, y: 365 },
  { x: 430, y: 365 },
  { x: 590, y: 365 },
] as const

// Cat-room door (south-west corner of Cat Room, where a cat transitions
// between Cat Room and the main lounge).
export const CAT_ROOM_DOOR = { x: 740, y: 295 } as const
// Inside Cat Room, a resting anchor where OUT_OF_LOUNGE cats sit.
export const CAT_ROOM_INSIDE = { x: 860, y: 170 } as const

// ── Furniture catalog ─────────────────────────────────────

export type FurnitureType = 'round6' | 'round4' | 'table2' | 'sofa' | 'coffee'

export interface FurnitureItem {
  id: string
  type: FurnitureType
  area: CafeAreaId
  /** Center of the furniture piece (anchor for cats lounging on it). */
  x: number
  y: number
  /** Number of customer cushions around this piece (0 for coffee tables). */
  seats: number
  /** Rough footprint (for rendering the SVG shape). */
  w: number
  h: number
}

export const FURNITURE: FurnitureItem[] = [
  // ── AREA 2 (upper café) ────────────────────────────────
  { id: 'A2-round', type: 'round6', area: 'AREA_2', x: 200, y: 210, seats: 6, w: 92, h: 92 },
  { id: 'A2-t1',    type: 'table2', area: 'AREA_2', x: 380, y: 130, seats: 2, w: 52, h: 52 },
  { id: 'A2-t2',    type: 'table2', area: 'AREA_2', x: 470, y: 130, seats: 2, w: 52, h: 52 },
  { id: 'A2-t3',    type: 'table2', area: 'AREA_2', x: 570, y: 130, seats: 2, w: 52, h: 52 },
  { id: 'A2-t4',    type: 'table2', area: 'AREA_2', x: 520, y: 240, seats: 2, w: 52, h: 52 },
  // ── AREA 1 (lower lounge) ──────────────────────────────
  { id: 'A1-round-L', type: 'round4', area: 'AREA_1', x: 260, y: 550, seats: 4, w: 86, h: 86 },
  { id: 'A1-round-R', type: 'round4', area: 'AREA_1', x: 570, y: 550, seats: 4, w: 86, h: 86 },
  { id: 'A1-sofa-L',  type: 'sofa',   area: 'AREA_1', x: 250, y: 700, seats: 3, w: 170, h: 42 },
  { id: 'A1-coffee',  type: 'coffee', area: 'AREA_1', x: 430, y: 700, seats: 0, w: 90,  h: 42 },
  { id: 'A1-sofa-R',  type: 'sofa',   area: 'AREA_1', x: 620, y: 700, seats: 2, w: 120, h: 42 },
]

/** Max customers this café can seat (sum of FURNITURE[].seats). */
export const MAX_SEATS = FURNITURE.reduce((acc, f) => acc + f.seats, 0)

// Flat seat pool: precompute every cushion coordinate in the order we
// allocate seats. seatCount=N uses the first N entries.
interface Cushion {
  furnitureId: string
  x: number
  y: number
}

function cushionRing(item: FurnitureItem): Cushion[] {
  const seats: Cushion[] = []
  const radius = Math.max(item.w, item.h) * 0.55 + 6
  for (let i = 0; i < item.seats; i++) {
    const angle = -Math.PI / 2 + (i / item.seats) * Math.PI * 2
    seats.push({
      furnitureId: item.id,
      x: item.x + Math.cos(angle) * radius,
      y: item.y + Math.sin(angle) * radius,
    })
  }
  return seats
}

function cushionLinear(item: FurnitureItem, yOffset: number): Cushion[] {
  // For sofas: seats line up in front of the furniture (slightly below).
  const seats: Cushion[] = []
  if (item.seats <= 0) return seats
  const span = item.w - 20
  const step = item.seats > 1 ? span / (item.seats - 1) : 0
  const startX = item.x - span / 2
  for (let i = 0; i < item.seats; i++) {
    seats.push({
      furnitureId: item.id,
      x: startX + i * step,
      y: item.y + yOffset,
    })
  }
  return seats
}

// Deterministic cushion pool — order drives which seats fill first.
// Start with Area 1's sofas (most desirable / cat-friendly), then Area 2
// tables, then Area 1 round tables. Matches the intuition that patrons
// take the sofas first in a real cat café.
const CUSHION_POOL: readonly Cushion[] = [
  ...cushionLinear(FURNITURE.find((f) => f.id === 'A1-sofa-L')!, -22),
  ...cushionLinear(FURNITURE.find((f) => f.id === 'A1-sofa-R')!, -22),
  ...cushionRing(FURNITURE.find((f) => f.id === 'A1-round-L')!),
  ...cushionRing(FURNITURE.find((f) => f.id === 'A1-round-R')!),
  ...cushionRing(FURNITURE.find((f) => f.id === 'A2-round')!),
  ...cushionRing(FURNITURE.find((f) => f.id === 'A2-t1')!),
  ...cushionRing(FURNITURE.find((f) => f.id === 'A2-t2')!),
  ...cushionRing(FURNITURE.find((f) => f.id === 'A2-t3')!),
  ...cushionRing(FURNITURE.find((f) => f.id === 'A2-t4')!),
]

// ── Shelves (cat jump anchors) ─────────────────────────────

export interface ShelfAnchor {
  id: string
  x: number
  y: number
  area: CafeAreaId
}

export const SHELVES: ShelfAnchor[] = [
  { id: 'A2-shelf-1', x: 90,  y: 60,  area: 'AREA_2' },
  { id: 'A2-shelf-2', x: 350, y: 60,  area: 'AREA_2' },
  { id: 'A2-shelf-3', x: 650, y: 60,  area: 'AREA_2' },
  { id: 'A1-shelf-L', x: 90,  y: 470, area: 'AREA_1' },
  { id: 'A1-shelf-R', x: 870, y: 470, area: 'AREA_1' },
  { id: 'CAT-TREE',   x: 50,  y: 560, area: 'AREA_1' },
  { id: 'CR-shelf-1', x: 760, y: 60,  area: 'CAT_ROOM' },
  { id: 'CR-shelf-2', x: 930, y: 60,  area: 'CAT_ROOM' },
]

// Furniture-surface anchors for cats to lie on (not the customer cushion
// but the piece itself — the top of the sofa back, center of the round
// table, etc.). When a cat enters RESTING / GROOMING it targets one of
// these.
export interface FurnitureCatSpot {
  id: string
  x: number
  y: number
  area: CafeAreaId
}

export const FURNITURE_SPOTS: FurnitureCatSpot[] = FURNITURE.map((f) => ({
  id: `spot-${f.id}`,
  x: f.x,
  y: f.y,
  area: f.area,
}))

// ── Walking aisle system ──────────────────────────────────

// Vertical trunk corridor on the right side. The ONLY path from AREA_1
// (south of counter) up to AREA_2 (north of counter) or into the Cat
// Room. Customer queue and staff entry also use this.
export const RIGHT_AISLE_X = 710
// North side of the counter — AREA_2 internal horizontal highway.
export const AREA2_BOTTOM_Y = 310
// South side of the counter — AREA_1 internal horizontal highway.
export const AREA1_TOP_Y = 420
// Legacy aliases (for CafeScene during migration commits)
export const TOP_AISLE_Y = AREA2_BOTTOM_Y
export const BOTTOM_AISLE_Y = AREA1_TOP_Y

// ── Legacy aliases (migration-friendly) ───────────────────

// Kept so CafeScene compiles during the staged rewrite. Names repurposed.
export const DOOR = { x: ENTRANCE.x, y: ENTRANCE.y } as const
export const EXIT = { x: ENTRANCE.x, y: ENTRANCE.y } as const
export const ABANDON = { x: ENTRANCE.x, y: ENTRANCE.y + 50 } as const
export const QUEUE_SEAT = QUEUE_ANCHOR
export const SEAT_GRID = {
  // Not really a grid anymore; CafeScene migration maps away from it.
  x: 0,
  y: 0,
  cellW: 0,
  cellH: 0,
  cols: 1,
} as const
export const CAT_GRID = {
  // Cats now use furniture / shelf anchors instead of a fixed home grid.
  x: CAT_ROOM_INSIDE.x,
  y: CAT_ROOM_INSIDE.y,
  cellW: 60,
  cellH: 60,
  cols: 3,
} as const
export const KITCHEN = {
  x: KITCHEN_STAFF_SLOTS[0].x,
  y: KITCHEN_STAFF_SLOTS[0].y,
  stepX: KITCHEN_STAFF_SLOTS[1].x - KITCHEN_STAFF_SLOTS[0].x,
} as const

// Legacy resting-cat drift targets (reused by CafeScene restingCatTargetXY).
// Point them at Cat Tree + a Area 1 shelf so behavior stays sensible.
export const FOOD_CORNER = { x: 50, y: 580 } as const
export const LITTER_CORNER = { x: 870, y: 500 } as const

export const REST_WANDER_CYCLE_MIN = 6

// ── Per-slot geometry ──────────────────────────────────────

/**
 * Cushion coordinate for a given flat seat index. Consumers should
 * ensure slotIdx < MAX_SEATS; out-of-range indices clamp to the last
 * cushion as a safety fallback.
 */
export function seatPos(slotIdx: number): { x: number; y: number } {
  const idx = Math.min(slotIdx, CUSHION_POOL.length - 1)
  const cushion = CUSHION_POOL[Math.max(0, idx)]
  return { x: cushion.x, y: cushion.y }
}

/**
 * Which piece of furniture a given seat slot belongs to. Useful for
 * rendering hover highlights on the correct furniture.
 */
export function seatFurnitureId(slotIdx: number): string {
  const idx = Math.min(slotIdx, CUSHION_POOL.length - 1)
  return CUSHION_POOL[Math.max(0, idx)].furnitureId
}

/**
 * Which area a seat slot is in (used for walking-path routing).
 */
export function seatArea(slotIdx: number): CafeAreaId {
  const fid = seatFurnitureId(slotIdx)
  const f = FURNITURE.find((x) => x.id === fid)
  return f ? f.area : 'AREA_1'
}

/**
 * Home position for an idle cat — picks a furniture spot deterministically
 * by slot index so each cat has a stable "favorite seat". Cats that
 * haven't received any CAT_STATE_CHANGE event yet fall back here.
 */
export function catHomePos(slotIdx: number): { x: number; y: number } {
  const spot = FURNITURE_SPOTS[slotIdx % FURNITURE_SPOTS.length]
  return { x: spot.x, y: spot.y }
}

/**
 * Where a visiting cat sits when it reaches a seated customer — just
 * next to the cushion so both the cat sprite and the customer avatar
 * read clearly.
 */
export function catVisitingPosForSeat(
  seatSlot: number,
): { x: number; y: number } {
  const sp = seatPos(seatSlot)
  return { x: sp.x + 18, y: sp.y + 2 }
}

// ── Static (non-walking) positions ─────────────────────────

export function staticCustomerPosition(
  c: CustomerRuntime,
  state: CafeState,
): { x: number; y: number } {
  switch (c.stage) {
    case 'arriving':
      return { x: ENTRANCE.x, y: ENTRANCE.y }
    case 'waitingSeat': {
      const idx = state.queueSeat.indexOf(c.id)
      const q = idx >= 0 ? idx : 0
      // Queue stretches south from QUEUE_ANCHOR, along the right aisle.
      const jitter = ((c.id * 7919) % 7) - 3
      return {
        x: QUEUE_ANCHOR.x + jitter,
        y: QUEUE_ANCHOR.y + q * QUEUE_ANCHOR.step,
      }
    }
    case 'seated':
    case 'ordering':
    case 'waitingFood':
    case 'dining':
      return c.seatSlot !== undefined
        ? seatPos(c.seatSlot)
        : { x: ENTRANCE.x, y: ENTRANCE.y }
    case 'leaving':
      return c.seatSlot !== undefined
        ? seatPos(c.seatSlot)
        : { x: ENTRANCE.x, y: ENTRANCE.y }
    case 'abandoned':
      return { x: ENTRANCE.x, y: ENTRANCE.y }
  }
}

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

// ── Path routing around the counter ───────────────────────

/**
 * Compute a piecewise-linear walk from `from` to `to` that respects the
 * counter barrier (no crossing through COUNTER rect). Returns an array
 * of waypoints including the endpoints. Consumers feed this to
 * `pointOnPath` for arc-length interpolation.
 *
 * Routing rules:
 *   - If both points are already on the same side of the counter
 *     (both y < COUNTER.y or both y > COUNTER.y + COUNTER.h), go direct.
 *   - Otherwise route via RIGHT_AISLE_X: go horizontally to the aisle,
 *     then vertically past the counter, then horizontally to the target.
 */
export function detourAroundCounter(
  from: { x: number; y: number },
  to: { x: number; y: number },
): { x: number; y: number }[] {
  const COUNTER_TOP = COUNTER.y
  const COUNTER_BOT = COUNTER.y + COUNTER.h
  const fromNorth = from.y < COUNTER_TOP
  const fromSouth = from.y > COUNTER_BOT
  const toNorth = to.y < COUNTER_TOP
  const toSouth = to.y > COUNTER_BOT

  // Same side → straight line
  if ((fromNorth && toNorth) || (fromSouth && toSouth)) {
    return [from, to]
  }

  // Crossing counter → route via right-side aisle
  const aisleY1 = fromNorth ? AREA2_BOTTOM_Y : AREA1_TOP_Y
  const aisleY2 = toNorth ? AREA2_BOTTOM_Y : AREA1_TOP_Y
  return [
    from,
    { x: RIGHT_AISLE_X, y: aisleY1 },
    { x: RIGHT_AISLE_X, y: aisleY2 },
    to,
  ]
}
