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

// Total SVG canvas. FLOOR_W is the yellow café interior width; the
// strip between FLOOR_W and VIEW_W is an off-canvas "outside" margin
// where the entrance / queue info column lives, so those panels don't
// crowd the floor plan.
export const FLOOR_W = 1000
export const VIEW_W = 1180
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
  AREA_2: { id: 'AREA_2', x: 60,  y: 40,  w: 640, h: 290, labelX: 380, labelY: 60 },
  // Lower lounge (sofas + round tables + cat tree).
  AREA_1: { id: 'AREA_1', x: 60,  y: 402, w: 820, h: 358, labelX: 600, labelY: 418 },
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
// Queue forms OUTSIDE the café door, in the right-side white margin
// between FLOOR_W (yellow edge) and the entrance info card. Customers
// stack downward from just below the door, like real patrons waiting
// on the sidewalk. Previous anchor (710, 345) made them line up along
// the counter's interior aisle, which read as "23 people crammed
// inside the shop" instead of "23 people waiting to get in".
export const QUEUE_ANCHOR = { x: 1005, y: 340, step: 19 } as const

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

export type FurnitureType =
  | 'round6'
  | 'round4'
  | 'table2'
  | 'sofa'
  | 'coffee'
  | 'ottoman'

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

// Furniture layout transcribed from Hirsch 2025 Figure 1 (Stockholm cat
// café floor plan). AREA 2 mirrors the paper exactly: one 6-seat round
// table, one 2-seat top-left table, and three 2-seat tables stacked
// along the right wall. AREA 1 follows the paper's lounge arrangement:
// two round 4-seat tables, a corner L-sofa, a long back-wall bench, a
// smaller side bench, a cluster of three pouffe-style ottomans, and a
// central coffee table (no seats). Total 35 cushions — matches the
// paper's "14 observed capacity" while leaving headroom for experiments
// with larger seatCount settings.
export const FURNITURE: FurnitureItem[] = [
  // ── AREA 2 (upper café) ── 14 seats ────────────────────
  { id: 'A2-t-top', type: 'table2', area: 'AREA_2', x: 310, y: 90,  seats: 2, w: 52, h: 52 },
  { id: 'A2-round', type: 'round6', area: 'AREA_2', x: 200, y: 215, seats: 6, w: 92, h: 92 },
  { id: 'A2-t-r1',  type: 'table2', area: 'AREA_2', x: 590, y: 85,  seats: 2, w: 52, h: 52 },
  { id: 'A2-t-r2',  type: 'table2', area: 'AREA_2', x: 590, y: 180, seats: 2, w: 52, h: 52 },
  { id: 'A2-t-r3',  type: 'table2', area: 'AREA_2', x: 590, y: 275, seats: 2, w: 52, h: 52 },
  // ── AREA 1 (lower lounge) ── 21 seats ──────────────────
  { id: 'A1-round-L', type: 'round4',  area: 'AREA_1', x: 210, y: 540, seats: 4, w: 86,  h: 86 },
  { id: 'A1-round-R', type: 'round4',  area: 'AREA_1', x: 500, y: 540, seats: 4, w: 86,  h: 86 },
  { id: 'A1-bench-L', type: 'sofa',    area: 'AREA_1', x: 115, y: 660, seats: 2, w: 86,  h: 38 },
  { id: 'A1-ott-1',   type: 'ottoman', area: 'AREA_1', x: 295, y: 408, seats: 1, w: 30,  h: 30 },
  { id: 'A1-ott-2',   type: 'ottoman', area: 'AREA_1', x: 355, y: 408, seats: 1, w: 30,  h: 30 },
  { id: 'A1-ott-3',   type: 'ottoman', area: 'AREA_1', x: 415, y: 408, seats: 1, w: 30,  h: 30 },
  { id: 'A1-coffee',  type: 'coffee',  area: 'AREA_1', x: 660, y: 680, seats: 0, w: 90,  h: 52 },
  { id: 'A1-sofa-rs', type: 'sofa',    area: 'AREA_1', x: 810, y: 655, seats: 2, w: 110, h: 40 },
  { id: 'A1-sofa-bt', type: 'sofa',    area: 'AREA_1', x: 440, y: 735, seats: 3, w: 150, h: 40 },
  { id: 'A1-sofa-br', type: 'sofa',    area: 'AREA_1', x: 800, y: 735, seats: 3, w: 150, h: 40 },
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

function cushionOnTop(item: FurnitureItem): Cushion[] {
  // For ottomans / pouffes: the single cushion IS the furniture — sit
  // directly on the center rather than around a ring.
  if (item.seats <= 0) return []
  return [{ furnitureId: item.id, x: item.x, y: item.y }]
}

function cushionHorizontal(item: FurnitureItem): Cushion[] {
  // For small 2-seat square tables: seat customers on the left and
  // right sides rather than top/bottom, so the three stacked tables
  // along the right wall of AREA 2 don't squash their cushions into
  // each other vertically.
  const seats: Cushion[] = []
  if (item.seats <= 0) return seats
  const radius = Math.max(item.w, item.h) * 0.55 + 6
  for (let i = 0; i < item.seats; i++) {
    // Start at angle=π (left) then π/2 apart — so 2 seats go left/right.
    const angle = Math.PI + (i / item.seats) * Math.PI * 2
    seats.push({
      furnitureId: item.id,
      x: item.x + Math.cos(angle) * radius,
      y: item.y + Math.sin(angle) * radius,
    })
  }
  return seats
}

function cushionsFor(item: FurnitureItem): Cushion[] {
  switch (item.type) {
    case 'round6':
    case 'round4':
      return cushionRing(item)
    case 'table2':
      return cushionHorizontal(item)
    case 'sofa':
      return cushionLinear(item, -22)
    case 'ottoman':
      return cushionOnTop(item)
    case 'coffee':
      return []
  }
}

// Deterministic cushion pool. Order drives which seats fill first.
//
// Strategy: tier-based fill. Within a tier we round-robin across the
// pieces in that tier (one seat per piece per round), so the round
// tables in AREA 1 and AREA 2 fill at the same rate. We only move to
// the next tier once the previous tier's pieces are fully seated.
//
//   Tier 1  Round tables (6-seat + both 4-seat)      14 seats
//   Tier 2  Sofas / benches (group seating)          10 seats
//   Tier 3  Small 2-tops (pairs)                      8 seats
//   Tier 4  Ottomans / pouffes (singles)              3 seats
//
// Why tiered instead of pure round-robin: Hirsch 2025's floor plan
// shows round tables with 4-6 chairs around each, so a real café
// seats groups around a table together. A naive "1 per piece" round-
// robin scattered lone customers across every piece of furniture and
// left round tables looking 5/6 empty even at saturation.
function buildCushionPool(): Cushion[] {
  const TIERS: FurnitureType[][] = [
    ['round6', 'round4'],
    ['sofa'],
    ['table2'],
    ['ottoman'],
  ]
  const out: Cushion[] = []
  for (const tier of TIERS) {
    const pieces = FURNITURE.filter(
      (f) => f.seats > 0 && tier.includes(f.type),
    )
    // Stable area interleave so AREA 1 / AREA 2 fill in parallel.
    pieces.sort((a, b) => {
      if (a.area !== b.area) return a.area.localeCompare(b.area)
      return a.id.localeCompare(b.id)
    })
    const perPiece: Cushion[][] = pieces.map(cushionsFor)
    if (perPiece.length === 0) continue
    const maxLen = Math.max(...perPiece.map((p) => p.length))
    for (let i = 0; i < maxLen; i++) {
      for (const piece of perPiece) {
        if (i < piece.length) out.push(piece[i])
      }
    }
  }
  return out
}

const CUSHION_POOL: readonly Cushion[] = buildCushionPool()

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
// Cat-room amenities: food bowl in the south-west corner, litter box
// in the south-east corner. Positioned inside AREAS.CAT_ROOM (x=730-
// 960, y=40-300) so they render as part of the cat-only retreat, not
// out in the customer lounge.
export const FOOD_CORNER = { x: 770, y: 260 } as const
export const LITTER_CORNER = { x: 920, y: 260 } as const

// Extra food bowls scattered around the customer areas. Real cat cafés
// keep a feeding station or two in the lounge so cats don't have to
// hike back to the cat room for a snack. Positions MUST avoid the x,y
// of any SHELVES entry: cats with verticalLevel=SHELF teleport onto
// the nearest shelf in their area, which visually reads as "cat
// standing on the bowl" and made the old layout look like cats were
// endlessly piling onto the food.
export const CAFE_FOOD_BOWLS: readonly { x: number; y: number }[] = [
  { x: 450, y: 465 }, // AREA 1 top-middle, between the two round tables
  { x: 350, y: 300 }, // AREA 2 bottom-middle, under AREA_2 label row
]

// Ambient floor spots — quiet open-floor anchors where cats can chill
// when they're in FLOOR verticalLevel but not actively visiting /
// walking / resting-on-furniture. Gives the café that lived-in feel of
// a cat randomly lying on a rug between tables instead of always being
// glued to a shelf or sofa. Positions avoid furniture footprints,
// shelf coordinates, and food-bowl placements.
export interface AmbientCatSpot {
  id: string
  x: number
  y: number
  area: CafeAreaId
}

export const AMBIENT_CAT_SPOTS: readonly AmbientCatSpot[] = [
  // AREA 1 open-floor spots
  { id: 'a1-floor-center', x: 380, y: 615, area: 'AREA_1' },
  { id: 'a1-floor-right',  x: 720, y: 575, area: 'AREA_1' },
  { id: 'a1-floor-left',   x: 155, y: 600, area: 'AREA_1' },
  // AREA 2 open-floor spots
  { id: 'a2-floor-center', x: 410, y: 200, area: 'AREA_2' },
  { id: 'a2-floor-south',  x: 460, y: 290, area: 'AREA_2' },
  // CAT ROOM open-floor spots. Cat room bounds: x=730-960, y=40-300.
  // Avoids the shelf anchors at y=60, the food bowl at (770, 260), the
  // litter corner at (920, 260), and the door at (740, 295). Cats
  // currently "at home" in the cat room bunched up at CAT_ROOM_INSIDE;
  // these spots let them spread out across the mid-band instead.
  { id: 'cr-floor-center',  x: 845, y: 170, area: 'CAT_ROOM' },
  { id: 'cr-floor-left',    x: 780, y: 160, area: 'CAT_ROOM' },
  { id: 'cr-floor-right',   x: 915, y: 160, area: 'CAT_ROOM' },
  { id: 'cr-floor-top',     x: 845, y: 110, area: 'CAT_ROOM' },
  { id: 'cr-floor-bottom',  x: 845, y: 225, area: 'CAT_ROOM' },
]

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
      // Queue stretches south from the door into the right margin.
      // Tiny jitter (±1) since the column is narrow; anything larger
      // makes avatars overlap the entrance info card at x=1020.
      const jitter = ((c.id * 7919) % 3) - 1
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
  const COUNTER_RIGHT = COUNTER.x + COUNTER.w
  const fromNorth = from.y < COUNTER_TOP
  const fromSouth = from.y > COUNTER_BOT
  const toNorth = to.y < COUNTER_TOP
  const toSouth = to.y > COUNTER_BOT

  // Same side → straight line
  if ((fromNorth && toNorth) || (fromSouth && toSouth)) {
    return [from, to]
  }

  // Both points are east of the counter's right edge → counter isn't
  // physically in the way even if their y straddles it. Straight line
  // avoids the ugly U-turn west-then-east when customers walk from the
  // door to the outside queue column.
  if (from.x > COUNTER_RIGHT && to.x > COUNTER_RIGHT) {
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
