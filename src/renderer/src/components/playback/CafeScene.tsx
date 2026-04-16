import { useEffect, useRef } from 'react'
import { useTranslation } from 'react-i18next'
import type { SimulationConfig } from '../../types'
import {
  ABANDON,
  BOTTOM_AISLE_Y,
  CAT_GRID,
  DOOR,
  EXIT,
  FOOD_CORNER,
  KITCHEN,
  LITTER_CORNER,
  QUEUE_SEAT,
  REST_WANDER_CYCLE_MIN,
  SEAT_GRID,
  TOP_AISLE_Y,
  VIEW_H,
  VIEW_W,
  catHomePos,
  catVisitingPosForSeat,
  seatPos,
  staticCatPosition,
  staticCustomerPosition,
} from '../../utils/cafeGeometry'
import {
  BUBBLE_TTL_MIN,
  LEAVE_LINGER_MIN,
  PULSE_TTL_MIN,
  type BubbleKind,
  type CafeState,
  type CatSlot,
  type CustomerRuntime,
  type CustomerStage,
  type PulseKind,
} from '../../utils/replay'

/**
 * SVG floor plan that renders the current café state produced by the replay
 * reducer. Customers and cats are nested SVG <g> nodes whose outer transform
 * handles position (with a CSS transition) and whose inner wrappers carry
 * per-character CSS animations (bob, pop-in, tail wag, etc.). Transforms
 * compose, so position and animation never fight each other.
 *
 * v0.4.1 "Clearly Cute" pass adds:
 *   - Deterministic emoji pools for customer and cat variety
 *   - Idle bob, pop-in / pop-out, tail wag on visiting cats
 *   - Floating hearts when a cat is on a customer's lap
 *   - Food bowl during dining
 *   - Arrival sparkles on the speech bubble
 *   - Kitchen steam when staff are busy
 *   - Zone feedback: seat-full warn pulse, door arrival flash, exit
 *     departure flash, "all out visiting" cat-zone hint
 *   - Speed-aware tempo so 8× replay doesn't look spastic
 */

export type FocusTarget =
  | { kind: 'seat'; slotIdx: number }
  | { kind: 'cat'; slotIdx: number }

interface CafeSceneProps {
  state: CafeState
  config: SimulationConfig
  focus: FocusTarget | null
  onSelectFocus: (target: FocusTarget | null) => void
  /**
   * Current playback speed multiplier (from PlaybackControls). Used to
   * scale animation durations so idle motion doesn't look jittery at 8×
   * and doesn't feel sluggish at 0.5×.
   */
  speed: number
}

// Zone constants, VIEW dimensions, REST_WANDER_CYCLE_MIN and per-slot
// geometry (seatPos, catHomePos, catVisitingPosForSeat) are all imported
// from '../../utils/cafeGeometry' above — kept there so the reducer can
// also use `staticCustomerPosition` / `staticCatPosition` without
// duplicating geometry.

// ─── Variety pools ─────────────────────────────────────────
// Deterministic per-character visuals, keyed on stable ids so the
// same customer / cat looks the same across repeated replays.

const CUSTOMER_POOL: readonly string[] = [
  '🙂', '😊', '🤗', '😃', '🥰', '🧑‍🎨', '🧑‍💻', '👧', '👴', '👵',
]

function restingAvatar(id: number): string {
  return CUSTOMER_POOL[id % CUSTOMER_POOL.length]
}

// Three hand-picked cat emoji for the three slots. Wraps around if
// someone cranks `catCount` higher than 3.
const CAT_EMOJI: readonly string[] = ['🐱', '🐈', '🐈‍⬛']

function catEmoji(slotIdx: number, resting: boolean): string {
  if (resting) return '💤'
  return CAT_EMOJI[slotIdx % CAT_EMOJI.length]
}

// Very soft per-cat tint for the rounded square they sit in, so the
// three cats feel like three characters even before they move.
const CAT_TINT_FILL: readonly string[] = ['#fff7ed', '#fef9c3', '#ede9fe']
const CAT_TINT_STROKE: readonly string[] = ['#fdba74', '#eab308', '#a78bfa']

// ─── Ambient decoration layout ────────────────────────────
// Static position tables for the persistent scene ambience: hanging
// yarn balls (always on), morning butterflies (frac < 0.45), dusk
// fireflies (frac > 0.6), and the full-scene petal drift.

const YARN_POSITIONS: readonly number[] = [
  50, 160, 270, 380, 500, 620, 740, 860, 960,
]

const BUTTERFLY_POSITIONS: ReadonlyArray<readonly [number, number]> = [
  [70, 40],
  [180, 25],
  [320, 45],
]

const FIREFLY_POSITIONS: ReadonlyArray<readonly [number, number]> = [
  [60, 30],
  [160, 45],
  [280, 25],
  [420, 40],
  [580, 28],
  [720, 42],
  [860, 30],
]

// Cherry blossom petal seeds: each petal has a pseudo-random starting
// x, animation duration (10–17s), and delay (0–13s) so 14 petals
// stagger naturally across the infinite drift cycle.
interface PetalSeed {
  startX: number
  duration: number
  delay: number
}
const PETAL_SEEDS: readonly PetalSeed[] = Array.from({ length: 14 }, (_, i) => {
  const seed = (i * 7919) % 1000
  return {
    startX: 80 + ((seed * 13) % 860),
    duration: 10 + ((seed * 17) % 8),
    delay: (seed * 11) % 14,
  }
})

// ─── Position helpers ──────────────────────────────────────
// seatPos / catHomePos / catVisitingPosForSeat live in cafeGeometry.ts
// now. This section keeps only the scene-specific helpers that don't
// belong in the shared module.

/**
 * Resting cats drift between their home cell and a personal "corner" —
 * either the food bowl or the litter box, picked deterministically by
 * `slotIdx % 2`. The position is a pure function of sim time + slotIdx,
 * so a scrub to the same time always produces the same cat layout.
 *
 * Cycle: spend phase 0.00–0.15 walking out, 0.15–0.50 at the corner,
 * 0.50–0.65 walking back, 0.65–1.00 at home. CSS transition on the
 * parent <g> interpolates the actual motion.
 */
function restingCatTargetXY(
  cat: CatSlot,
  state: CafeState,
): { x: number; y: number } {
  const home = catHomePos(cat.slotIdx)
  const corner = cat.slotIdx % 2 === 0 ? FOOD_CORNER : LITTER_CORNER
  // Offset each cat so they don't all migrate in lockstep.
  const offset = cat.slotIdx * (REST_WANDER_CYCLE_MIN / 3)
  const phase = (((state.time + offset) % REST_WANDER_CYCLE_MIN) +
    REST_WANDER_CYCLE_MIN) %
    REST_WANDER_CYCLE_MIN /
    REST_WANDER_CYCLE_MIN
  return phase >= 0.15 && phase < 0.65 ? corner : home
}

// ─── Walk paths ────────────────────────────────────────────
// Characters route through horizontal corridors (TOP_AISLE_Y /
// BOTTOM_AISLE_Y) instead of cutting diagonal lines through solid
// zone cards. Every path is piecewise linear (L-shape) with 4
// waypoints: start → aisle vertical → aisle horizontal → destination.

type Waypoint = readonly [number, number]
type Path = readonly Waypoint[]

/**
 * Interpolate a point along a piecewise linear path, parameterised by
 * arc length so the character moves at uniform speed across segments.
 * @param path  2+ waypoints
 * @param progress  0..1 along the total path length
 */
function pointOnPath(path: Path, progress: number): { x: number; y: number } {
  if (path.length === 0) return { x: 0, y: 0 }
  if (path.length === 1) return { x: path[0][0], y: path[0][1] }
  if (progress <= 0) return { x: path[0][0], y: path[0][1] }
  if (progress >= 1) {
    const last = path[path.length - 1]
    return { x: last[0], y: last[1] }
  }

  const segs: number[] = []
  let total = 0
  for (let i = 0; i < path.length - 1; i++) {
    const d = Math.hypot(
      path[i + 1][0] - path[i][0],
      path[i + 1][1] - path[i][1],
    )
    segs.push(d)
    total += d
  }
  if (total === 0) return { x: path[0][0], y: path[0][1] }

  const target = progress * total
  let walked = 0
  for (let i = 0; i < segs.length; i++) {
    if (walked + segs[i] >= target) {
      const t = segs[i] === 0 ? 0 : (target - walked) / segs[i]
      const [x1, y1] = path[i]
      const [x2, y2] = path[i + 1]
      return { x: x1 + (x2 - x1) * t, y: y1 + (y2 - y1) * t }
    }
    walked += segs[i]
  }
  const last = path[path.length - 1]
  return { x: last[0], y: last[1] }
}

/**
 * Walk duration in sim-minutes, stretched gently with replay speed so
 * the animation stays visible at 8× without looking sluggish at 1×.
 *   1× → 0.5 sim-min (500 ms real)
 *   2× → 0.71 (354 ms)
 *   4× → 1.0  (250 ms)
 *   8× → 1.41 (177 ms)
 *
 * `'abandoned'` overrides to a fixed 1.0 sim-min regardless of speed
 * so its choreography (stomp, smoke, walk, slam) maps onto a known
 * window. The dramatic exit reads as the angry customer deliberately
 * stomping out, distinct from the speedier happy walks.
 */
function walkDurationMin(
  speed: number,
  stage?: CustomerStage,
): number {
  if (stage === 'abandoned') return 1.0
  return 0.5 * Math.max(1, Math.sqrt(speed))
}

function walkProgress(
  startedAt: number,
  now: number,
  duration: number,
  startDelay = 0,
): number {
  const elapsed = now - startedAt - startDelay
  const span = duration - startDelay
  if (span <= 0) return 1
  return Math.min(1, Math.max(0, elapsed / span))
}

/**
 * Build an L-shape path that routes through the top aisle between a
 * start and end position. Used by most customer and cat walks.
 */
function topAisleLPath(
  start: { x: number; y: number },
  end: { x: number; y: number },
): Path {
  return [
    [start.x, start.y],
    [start.x, TOP_AISLE_Y],
    [end.x, TOP_AISLE_Y],
    [end.x, end.y],
  ]
}

function bottomAisleLPath(
  start: { x: number; y: number },
  end: { x: number; y: number },
): Path {
  return [
    [start.x, start.y],
    [start.x, BOTTOM_AISLE_Y],
    [end.x, BOTTOM_AISLE_Y],
    [end.x, end.y],
  ]
}

/**
 * Decide the walk path for a customer's current stage. Returns null
 * for stationary stages (ordering, waitingFood, dining) where the
 * character should just sit at its static position.
 *
 * Every walking stage uses `c.stageStartPos` (set by the reducer when
 * the stage was entered) as the path start, and `staticCustomerPosition`
 * as the path end. This keeps all path geometry in one place.
 */
function pathForCustomerStage(
  c: CustomerRuntime,
  state: CafeState,
): Path | null {
  if (c.stageStartPos === undefined) return null
  const end = staticCustomerPosition(c, state)
  switch (c.stage) {
    case 'arriving':
      // Door to waiting-seat queue is handled by waitingSeat path —
      // arriving is effectively instantaneous in the simulator (fires
      // at the same timestamp as CUSTOMER_WAIT_SEAT). No walk.
      return null
    case 'waitingSeat': {
      // Door to queue slot. Stay at door height (y=250) until we reach
      // the queue column, then ride straight up into the queue slot.
      // Avoids the "rocket up to the ceiling and drop down" effect that
      // routing via TOP_AISLE_Y produces for this short door-adjacent
      // walk, which visually reads as "customer came from the sky".
      const start = c.stageStartPos
      return [
        [start.x, start.y],
        [end.x, start.y],
        [end.x, end.y],
      ]
    }
    case 'seated':
      // Queue slot → seat cell (the visually critical walk)
      return topAisleLPath(c.stageStartPos, end)
    case 'ordering':
    case 'waitingFood':
    case 'dining':
      // Stationary at the seat
      return null
    case 'leaving': {
      // Seat → exit. Route via top aisle, then drop in the narrow gap
      // between the Cats card (x=740..910) and the Exit card (x=920..),
      // and finally walk horizontally into the exit door at y=EXIT.y.
      // The horizontal final segment makes the customer read as
      // "walking into the door" instead of "falling from the ceiling".
      const start = c.stageStartPos
      const dropX = 916
      return [
        [start.x, start.y],
        [start.x, TOP_AISLE_Y],
        [dropX, TOP_AISLE_Y],
        [dropX, end.y],
        [end.x, end.y],
      ]
    }
    case 'abandoned': {
      // Queue → front door via bottom aisle, then ride up in the narrow
      // gap between the Door card and the Queue card, and slam out the
      // front door horizontally. Bottom-aisle routing stays as the sad
      // exit visual cue, distinct from the happy top-aisle leave.
      const start = c.stageStartPos
      const riseX = 90
      return [
        [start.x, start.y],
        [start.x, BOTTOM_AISLE_Y],
        [riseX, BOTTOM_AISLE_Y],
        [riseX, end.y],
        [end.x, end.y],
      ]
    }
  }
}

/**
 * Decide the walk path for a cat's current state. Visiting and idle
 * (returning from a visit) animate; resting uses the cosmetic
 * food/litter corner drift (`restingCatTargetXY`) which is a
 * completely different mechanism.
 */
function pathForCatState(
  cat: CatSlot,
  state: CafeState,
): Path | null {
  if (cat.stateStartPos === undefined) return null
  switch (cat.state) {
    case 'visiting':
      return topAisleLPath(cat.stateStartPos, staticCatPosition(cat, state))
    case 'idle':
      // After a visit, animate back home from the seat we just left.
      // cat.stateStartPos is the seat-side position snapshotted in the
      // CAT_LEAVE_SEAT handler, and staticCatPosition for an idle cat
      // is catHomePos.
      return topAisleLPath(cat.stateStartPos, catHomePos(cat.slotIdx))
    case 'resting':
      return null
  }
}

function catXY(
  cat: CatSlot,
  state: CafeState,
  speed: number,
): { x: number; y: number } {
  if (cat.state === 'resting') {
    return restingCatTargetXY(cat, state)
  }
  const path = pathForCatState(cat, state)
  if (path === null) {
    return staticCatPosition(cat, state)
  }
  const duration = walkDurationMin(speed)
  const progress = walkProgress(cat.stateStartedAt, state.time, duration)
  return pointOnPath(path, progress)
}

/**
 * Phase-A "stomp" length within the abandoned drama, in sim-min. The
 * customer holds at the queue start position for this long before the
 * walk progress unlocks, so they visually stamp in place first.
 */
const ABANDON_STOMP_DELAY_MIN = 0.20

function customerWalkParams(
  c: CustomerRuntime,
  speed: number,
): { duration: number; startDelay: number } {
  const duration = walkDurationMin(speed, c.stage)
  const startDelay = c.stage === 'abandoned' ? ABANDON_STOMP_DELAY_MIN : 0
  return { duration, startDelay }
}

function customerXY(
  c: CustomerRuntime,
  state: CafeState,
  speed: number,
): { x: number; y: number } {
  const path = pathForCustomerStage(c, state)
  if (path === null) {
    return staticCustomerPosition(c, state)
  }
  const { duration, startDelay } = customerWalkParams(c, speed)
  const progress = walkProgress(c.stageStartedAt, state.time, duration, startDelay)
  return pointOnPath(path, progress)
}

/**
 * Whether the character is currently mid-walk (path active and
 * progress < 1). Render loop uses this to decide whether to disable
 * the CSS transform transition (per-frame JS positioning takes over).
 */
function customerIsWalking(
  c: CustomerRuntime,
  state: CafeState,
  speed: number,
): boolean {
  const path = pathForCustomerStage(c, state)
  if (path === null) return false
  const { duration, startDelay } = customerWalkParams(c, speed)
  return walkProgress(c.stageStartedAt, state.time, duration, startDelay) < 1
}

function catIsWalking(
  cat: CatSlot,
  state: CafeState,
  speed: number,
): boolean {
  const path = pathForCatState(cat, state)
  if (path === null) return false
  const duration = walkDurationMin(speed)
  return walkProgress(cat.stateStartedAt, state.time, duration) < 1
}

// ─── Stage-dependent visuals ───────────────────────────────

/**
 * Primary avatar emoji. Behavioural stages (abandoned, leaving, dining,
 * being visited by a cat) override the resting pool so the current
 * action always reads clearly; stationary stages (ordering, waiting for
 * seat / food) fall back to the customer's personal pool emoji, with a
 * small overlay badge rendered separately to convey the stage.
 */
function avatarEmoji(c: CustomerRuntime): string {
  if (c.visitingCats.size > 0 && c.stage !== 'leaving' && c.stage !== 'abandoned') {
    return '😺'
  }
  switch (c.stage) {
    case 'dining':
      return '🍽️'
    case 'abandoned':
      return '😿'
    case 'leaving':
      return '👋'
    default:
      return restingAvatar(c.id)
  }
}

/**
 * Small status badge drawn top-right of the avatar for waiting/ordering
 * stages, so the customer's face stays visible but we still communicate
 * "they're waiting for food" etc.
 */
function stageBadge(c: CustomerRuntime): string | null {
  if (c.visitingCats.size > 0) return null
  switch (c.stage) {
    case 'waitingSeat':
      return '⏰'
    case 'ordering':
      return '📝'
    case 'waitingFood':
      return '⏳'
    default:
      return null
  }
}

function chipColor(c: CustomerRuntime): string {
  if (c.visitingCats.size > 0 && c.stage !== 'leaving' && c.stage !== 'abandoned') {
    return '#bbf7d0' // green-200 — cat on lap
  }
  switch (c.stage) {
    case 'waitingSeat':
    case 'waitingFood':
      return '#fed7aa'
    case 'seated':
    case 'ordering':
      return '#fdba74'
    case 'dining':
      return '#fbcfe8'
    case 'abandoned':
      return '#fca5a5'
    case 'leaving':
      return '#e5e7eb'
    default:
      return '#fff7ed'
  }
}

function customerOpacity(c: CustomerRuntime, now: number): number {
  if (c.leftAt === undefined) return 1
  const elapsed = now - c.leftAt
  if (elapsed <= 0) return 1
  return Math.max(0, 1 - elapsed / LEAVE_LINGER_MIN)
}

// ─── Day/night floor gradient ──────────────────────────────
// Linearly interpolate between three visual "times of day" to give the
// floor a subtle progression from morning cream → midday bright →
// afternoon warm-pink, following the sim-time fraction. Purely
// decorative — the same floor gradient would render identically for any
// replay position at the same fraction.

// Amplified palette so the progression actually reads on screen. At 0%
// the floor looks warm-golden (morning sunlight slanting in), at 50%
// it's bright and cool (midday brightness), and at 100% it slides into
// dusty peach-pink (sunset). Each pair goes from "ceiling light side"
// to "floor side" of the linear gradient.
const FLOOR_STOPS_MORNING = [
  { offset: '0%', color: '#fff7e6' },   // very warm cream
  { offset: '100%', color: '#fde68a' },  // soft goldenrod
]
const FLOOR_STOPS_NOON = [
  { offset: '0%', color: '#ffffff' },    // bright
  { offset: '100%', color: '#fef3c7' },  // pale butter
]
const FLOOR_STOPS_DUSK = [
  { offset: '0%', color: '#fed7aa' },    // orange-200
  { offset: '100%', color: '#fbcfe8' },  // pink-200, sunset
]

function lerpHex(a: string, b: string, t: number): string {
  const [ar, ag, ab] = [parseInt(a.slice(1, 3), 16), parseInt(a.slice(3, 5), 16), parseInt(a.slice(5, 7), 16)]
  const [br, bg, bb] = [parseInt(b.slice(1, 3), 16), parseInt(b.slice(3, 5), 16), parseInt(b.slice(5, 7), 16)]
  const r = Math.round(ar + (br - ar) * t)
  const g = Math.round(ag + (bg - ag) * t)
  const bl = Math.round(ab + (bb - ab) * t)
  return `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${bl.toString(16).padStart(2, '0')}`
}

function floorStops(simTime: number, totalMinutes: number): readonly { offset: string; color: string }[] {
  const frac = totalMinutes > 0 ? Math.min(1, Math.max(0, simTime / totalMinutes)) : 0
  // 0–0.5: morning→noon, 0.5–1: noon→dusk
  if (frac <= 0.5) {
    const t = frac * 2
    return [
      { offset: '0%', color: lerpHex(FLOOR_STOPS_MORNING[0].color, FLOOR_STOPS_NOON[0].color, t) },
      { offset: '100%', color: lerpHex(FLOOR_STOPS_MORNING[1].color, FLOOR_STOPS_NOON[1].color, t) },
    ]
  }
  const t = (frac - 0.5) * 2
  return [
    { offset: '0%', color: lerpHex(FLOOR_STOPS_NOON[0].color, FLOOR_STOPS_DUSK[0].color, t) },
    { offset: '100%', color: lerpHex(FLOOR_STOPS_NOON[1].color, FLOOR_STOPS_DUSK[1].color, t) },
  ]
}

// ─── Speed-aware animation tempo ───────────────────────────

/**
 * Scale a base animation duration by the current playback speed. At 1×
 * (normal replay) we return the base. At 4× we divide by 4. We clamp
 * the speed factor at 4 so the tempo never gets faster than "one cycle
 * per ~0.5s in wall-clock time", which is the threshold where idle
 * motion starts looking like a strobe.
 */
function animDurationSec(baseSec: number, speed: number, minSec = 0.3): string {
  const factor = Math.min(Math.max(speed, 0.5), 4)
  return `${Math.max(minSec, baseSec / factor).toFixed(2)}s`
}

/**
 * Whether per-frame decorative motion (hearts, steam) should render at
 * all. At 8× playback the thrash is worse than the decoration is cute.
 */
function showDecor(speed: number): boolean {
  return speed <= 4
}

// ─── Fresh-arrival / recent-departure detectors ────────────

const ARRIVAL_WINDOW_MIN = 0.4
const DEPARTURE_WINDOW_MIN = 0.3

function isFreshlyArrived(c: CustomerRuntime, now: number): boolean {
  return now - c.enteredAt < ARRIVAL_WINDOW_MIN && c.leftAt === undefined
}

function isRecentlyDeparted(c: CustomerRuntime, now: number): boolean {
  return c.leftAt !== undefined && now - c.leftAt < DEPARTURE_WINDOW_MIN
}

// ─── Component ─────────────────────────────────────────────

export default function CafeScene({
  state,
  config,
  focus,
  onSelectFocus,
  speed,
}: CafeSceneProps) {
  const { t } = useTranslation('playback')

  /**
   * Per-character "last rendered X" map, used to decide whether each
   * avatar faces left or right this frame. Key is `cust-${id}` or
   * `cat-${slotIdx}`. The lookup happens during render (via
   * `facingFromPrevX`) against the value written at the END of the
   * previous render; a `useEffect` at the end of the current render
   * then writes the new x-values for next frame to read.
   *
   * We deliberately mutate the Map inside `useEffect`, not during
   * render, so strict-mode double-invocation can't corrupt the history.
   */
  const prevXRef = useRef<Map<string, number>>(new Map())
  // We collect "pending writes" during render and flush them in a
  // single useEffect below. Avoids any mid-render side effects.
  const pendingXRef = useRef<Map<string, number>>(new Map())
  pendingXRef.current = new Map()

  function facingFromPrevX(key: string, currentX: number): 'left' | 'right' {
    const prev = prevXRef.current.get(key)
    pendingXRef.current.set(key, currentX)
    if (prev === undefined) return 'right'
    const dx = currentX - prev
    if (dx < -1) return 'left'
    return 'right'
  }

  useEffect(() => {
    // Flush pending x-writes after the render has committed so next
    // frame's facing calculation has fresh history.
    for (const [k, v] of pendingXRef.current) {
      prevXRef.current.set(k, v)
    }
  })

  const seatOcc = state.seats.filter((s) => s.customerId !== null).length
  const catsActive = state.cats.filter((c) => c.state !== 'idle').length
  const seatsNearlyFull = config.seatCount > 0 && seatOcc / config.seatCount >= 0.8
  const allCatsOut =
    config.catCount > 0 &&
    state.cats.every((c) => c.state === 'visiting')

  // At simulationDuration the Python simulator cuts the clock regardless
  // of in-flight customer processes: anyone mid-dining / mid-visit simply
  // never emits their remaining events. Showing a "simulation ended"
  // banner is kinder than leaving the user to wonder why customers are
  // frozen on the scene.
  const isEnded = state.time >= config.simulationDuration - 0.01
  const inFlightCount = isEnded
    ? Object.values(state.customers).filter(
        (c) =>
          c.leftAt === undefined &&
          c.stage !== 'leaving' &&
          c.stage !== 'abandoned',
      ).length
    : 0

  // Zone-feedback triggers driven by customer runtime timestamps.
  const customers = Object.values(state.customers)
  const doorFlashing = customers.some((c) => isFreshlyArrived(c, state.time))
  const exitGoodFlashing = customers.some(
    (c) => c.stage === 'leaving' && isRecentlyDeparted(c, state.time),
  )
  const exitBadFlashing = customers.some(
    (c) => c.stage === 'abandoned' && isRecentlyDeparted(c, state.time),
  )

  // Freshest bubble per customer (youngest wins on overlap)
  const freshestBubble = new Map<number, { kind: BubbleKind; opacity: number }>()
  for (const b of state.activeBubbles) {
    const elapsed = state.time - b.firedAt
    const opacity = Math.max(0, 1 - elapsed / BUBBLE_TTL_MIN)
    const prev = freshestBubble.get(b.customerId)
    if (!prev || opacity > prev.opacity) {
      freshestBubble.set(b.customerId, { kind: b.kind, opacity })
    }
  }

  // Scene pulse lookups — each kind maps target → { firedAt, opacity }.
  // Consumers (seat render, kitchen ZoneCard, etc.) check if their target
  // id has a fresh pulse and conditionally apply an animation class.
  function pulseIndex(kind: PulseKind): Map<number, number> {
    const out = new Map<number, number>()
    for (const p of state.scenePulses) {
      if (p.kind !== kind) continue
      const prev = out.get(p.target)
      if (prev === undefined || p.firedAt > prev) {
        out.set(p.target, p.firedAt)
      }
    }
    return out
  }
  const seatOccupyPulses = pulseIndex('seatOccupy')
  const orderReadyPulses = pulseIndex('orderReady')
  const catLeavePulses = pulseIndex('catLeaveSeat')
  const finishDiningPulses = pulseIndex('finishDining')
  const abandonDramaPulses = pulseIndex('abandonDrama')

  function pulseOpacity(
    kind: PulseKind,
    firedAt: number | undefined,
  ): number {
    if (firedAt === undefined) return 0
    const elapsed = state.time - firedAt
    const ttl = PULSE_TTL_MIN[kind]
    if (elapsed < 0 || elapsed > ttl) return 0
    return 1 - elapsed / ttl
  }

  function handleBackgroundClick() {
    onSelectFocus(null)
  }

  // Inline styles for idle bob / decoration with speed-aware tempo. Bob
  // accepts a seed so we can stagger the phase per character — otherwise
  // every avatar breathes in perfect unison and the scene feels robotic.
  const bobDur = animDurationSec(2.2, speed, 1.1)
  function bobStyleFor(seed: number): React.CSSProperties {
    return {
      animationDuration: bobDur,
      // 5 buckets of 0.4s each so 5 consecutive ids never share a phase.
      animationDelay: `${((seed % 5) * 0.44).toFixed(2)}s`,
    }
  }
  const heartStyleA = { animationDuration: animDurationSec(2.4, speed, 1.2) }
  const heartStyleB = {
    animationDuration: animDurationSec(2.4, speed, 1.2),
    animationDelay: animDurationSec(1.2, speed, 0.6),
  }
  const tailStyle = { animationDuration: animDurationSec(0.8, speed, 0.3) }
  const stepDur = animDurationSec(0.7, speed, 0.3)
  const stepStyleA = { animationDuration: stepDur }
  const stepStyleB = { animationDuration: stepDur }
  const steamStyle = { animationDuration: animDurationSec(2.6, speed, 1.2) }
  const decor = showDecor(speed)
  // Time-of-day fraction for ambient decorations (butterfly morning,
  // firefly dusk). Matches the denominator used by the floor gradient
  // so the visual phases stay in sync.
  const frac = Math.min(
    1,
    Math.max(0, state.time / config.simulationDuration),
  )

  return (
    <div className="w-full">
      <svg
        viewBox={`0 0 ${VIEW_W} ${VIEW_H}`}
        preserveAspectRatio="xMidYMid meet"
        className="w-full h-auto"
        role="img"
        aria-label={t('playback:title')}
        onClick={handleBackgroundClick}
      >
        <defs>
          <linearGradient id="floor" x1="0" y1="0" x2="0" y2="1">
            {floorStops(state.time, config.simulationDuration).map((s, i) => (
              <stop key={i} offset={s.offset} stopColor={s.color} />
            ))}
          </linearGradient>
        </defs>
        <rect x="0" y="0" width={VIEW_W} height={VIEW_H} fill="url(#floor)" />

        {/* ── Hanging yarn balls ─ the ceiling is strung with dangling
            yarn balls (a cat-café staple). Always on, gently sway in
            staggered phase so the row feels alive. */}
        {YARN_POSITIONS.map((x, i) => (
          <g key={`yarn-${i}`} transform={`translate(${x}, 18)`}>
            <g
              className="neko-lantern"
              style={{ animationDelay: `${(i * 0.4).toFixed(2)}s` }}
            >
              <text textAnchor="middle" fontSize="18">🧶</text>
            </g>
          </g>
        ))}

        {/* ── Morning butterflies ─ only during the first ~45% of sim
            time, fading out in the last 0.1 frac for a smooth
            daybreak → midday handoff. */}
        {frac < 0.45 &&
          BUTTERFLY_POSITIONS.map(([x, y], i) => {
            const fadeOpacity = Math.min(1, (0.45 - frac) / 0.1)
            return (
              <g key={`butterfly-${i}`} transform={`translate(${x}, ${y})`}>
                <g
                  className="neko-butterfly"
                  style={{
                    animationDelay: `${(i * 0.7).toFixed(2)}s`,
                    animationDuration: `${(4.5 + i * 0.6).toFixed(2)}s`,
                    opacity: fadeOpacity,
                  }}
                >
                  <text textAnchor="middle" fontSize="13">🦋</text>
                </g>
              </g>
            )
          })}

        {/* ── Dusk fireflies ─ only during the final 40% of sim time,
            fading in across 0.1 frac for a soft sunset handoff. */}
        {frac > 0.6 &&
          FIREFLY_POSITIONS.map(([x, y], i) => {
            const fadeOpacity = Math.min(1, (frac - 0.6) / 0.1)
            return (
              <g key={`firefly-${i}`} transform={`translate(${x}, ${y})`}>
                <g
                  className="neko-firefly"
                  style={{
                    animationDelay: `${(i * 0.35).toFixed(2)}s`,
                    animationDuration: `${(2.0 + (i % 3) * 0.5).toFixed(2)}s`,
                    opacity: fadeOpacity,
                  }}
                >
                  <text textAnchor="middle" fontSize="11">✨</text>
                </g>
              </g>
            )
          })}

        {/* Ambient corner plants — pure decoration, sway gently.
            Two-level nesting: outer <g> owns the SVG attribute
            `transform="translate(...)"` for positioning, inner <g>
            owns the CSS animation that applies `transform: rotate(...)`.
            Without the split, CSS transform overrides the SVG attribute
            and both plants collapse to the SVG origin (top-left). */}
        <g transform="translate(30, 470)">
          <g className="neko-sway">
            <text textAnchor="middle" fontSize="24">🪴</text>
          </g>
        </g>
        <g transform="translate(970, 470)">
          <g className="neko-sway neko-sway--d1">
            <text textAnchor="middle" fontSize="24">🪴</text>
          </g>
        </g>

        {/* Ambient wall clock — sim-time analog face. Opens at 10:00,
            advances one minute hand per sim-minute and one hour hand per
            sim-hour. Zero semantic meaning beyond conveying "time is
            passing". */}
        <AmbientClock simTime={state.time} />

        {/* Simulation-ended banner ─────────────────────────────
            Drawn as a rounded card anchored top-center. Only visible
            when the clock has reached the full duration. Communicates
            that any customers still on the scene were mid-service at
            closing time — their processes were cut off by the Python
            `env.run(until=...)` stop. */}
        {isEnded && (
          <g>
            <rect
              x="290"
              y="6"
              width="420"
              height="42"
              rx="10"
              fill="#fff7ed"
              stroke="#f97316"
              strokeWidth="1.5"
              opacity="0.96"
            />
            <text
              x="500"
              y="26"
              textAnchor="middle"
              fontSize="13"
              fontWeight="700"
              fill="#c2410c"
            >
              ⏰ {t('playback:labels.simulationEnded')}
            </text>
            <text
              x="500"
              y="41"
              textAnchor="middle"
              fontSize="10"
              fill="#9a3412"
            >
              {t('playback:labels.simulationEndedHint', { count: inFlightCount })}
            </text>
          </g>
        )}

        {/* Door */}
        <ZoneCard
          x="10"
          y="200"
          w="100"
          h="110"
          label={t('playback:zones.door')}
          fillClass={doorFlashing ? 'neko-door-flash' : undefined}
        >
          <text x="60" y="250" textAnchor="middle" fontSize="32">🚪</text>
          <text x="60" y="285" textAnchor="middle" fontSize="11" fill="#9a3412">
            {t('playback:labels.arrived')} {state.counters.arrived}
          </text>
        </ZoneCard>

        {/* Seat queue */}
        <ZoneCard
          x="120"
          y="60"
          w="110"
          h="380"
          label={t('playback:zones.queueSeat')}
          strokeClass={
            state.queueSeat.length > 5 ? 'neko-warn-pulse' : undefined
          }
          strokeOverride={
            state.queueSeat.length > 5 ? '#ef4444' : undefined
          }
        >
          {state.queueSeat.length > 3 && (
            <text
              x="175"
              y="44"
              textAnchor="middle"
              fontSize="11"
              fontWeight="700"
              fill="#c2410c"
            >
              {t('playback:labels.queueBadge', { count: state.queueSeat.length })}
            </text>
          )}
          <text x="175" y="430" textAnchor="middle" fontSize="11" fill="#9a3412">
            × {state.queueSeat.length}
          </text>
        </ZoneCard>

        {/* Seat grid */}
        <ZoneCard
          x="240"
          y="60"
          w="260"
          h="380"
          label={t('playback:zones.seats')}
          strokeClass={seatsNearlyFull ? 'neko-warn-pulse' : undefined}
          strokeOverride={seatsNearlyFull ? '#ef4444' : undefined}
        >
          {state.seats.map((seat) => {
            const p = seatPos(seat.slotIdx)
            const busy = seat.customerId !== null
            const isFocus =
              focus?.kind === 'seat' && focus.slotIdx === seat.slotIdx
            const seatPopActive = seatOccupyPulses.has(seat.slotIdx)
            const catLeavePulseAt = catLeavePulses.get(seat.slotIdx)
            // Amplification: while the seat-pop pulse is active, the rect
            // doesn't just scale — it also flashes a bright yellow fill
            // and a deep red border, so even a single rendered frame at
            // 8× replay speed is obviously "something just happened here".
            const seatFill = seatPopActive
              ? '#facc15'
              : busy
              ? '#fed7aa'
              : '#fff7ed'
            const seatStroke = isFocus
              ? '#ea580c'
              : seatPopActive
              ? '#b45309'
              : busy
              ? '#f97316'
              : '#fed7aa'
            return (
              <g
                key={`seat-${seat.slotIdx}`}
                transform={`translate(${p.x - 18}, ${p.y - 18})`}
                className="cursor-pointer focus-visible:outline focus-visible:outline-2 focus-visible:outline-orange-500"
                tabIndex={0}
                role="button"
                aria-label={t('playback:a11y.seat', { n: seat.slotIdx + 1, status: busy ? t('playback:a11y.occupied') : t('playback:a11y.empty') })}
                onClick={(e) => {
                  e.stopPropagation()
                  onSelectFocus({ kind: 'seat', slotIdx: seat.slotIdx })
                }}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault()
                    e.stopPropagation()
                    onSelectFocus({ kind: 'seat', slotIdx: seat.slotIdx })
                  }
                }}
              >
                <rect
                  width="36"
                  height="36"
                  rx="8"
                  fill={seatFill}
                  stroke={seatStroke}
                  strokeWidth={isFocus || seatPopActive ? '3' : '1.5'}
                  className={seatPopActive ? 'neko-seat-pop' : undefined}
                />
                <text x="18" y="24" textAnchor="middle" fontSize="18">🪑</text>

                {/* β.3 Cat-leave puff: five particles rising from the
                    seat after a cat wanders off. Mix of 💨 / ✨ / 💫
                    for more visual density; positions spread left/right
                    so it reads as a burst rather than a single plume.
                    Outer opacity fades deterministically by sim time so
                    scrub stays stable. */}
                {catLeavePulseAt !== undefined && (
                  <g opacity={pulseOpacity('catLeaveSeat', catLeavePulseAt)}>
                    <text
                      x="18"
                      y="12"
                      textAnchor="middle"
                      fontSize="14"
                      className="neko-puff"
                    >
                      💨
                    </text>
                    <text
                      x="8"
                      y="14"
                      textAnchor="middle"
                      fontSize="11"
                      className="neko-puff neko-puff--d1"
                    >
                      ✨
                    </text>
                    <text
                      x="28"
                      y="14"
                      textAnchor="middle"
                      fontSize="11"
                      className="neko-puff neko-puff--d2"
                    >
                      ✨
                    </text>
                    <text
                      x="14"
                      y="18"
                      textAnchor="middle"
                      fontSize="10"
                      className="neko-puff neko-puff--d3"
                    >
                      💫
                    </text>
                    <text
                      x="22"
                      y="18"
                      textAnchor="middle"
                      fontSize="10"
                      className="neko-puff neko-puff--d4"
                    >
                      💫
                    </text>
                  </g>
                )}
              </g>
            )
          })}
          <text x="370" y="430" textAnchor="middle" fontSize="11" fill="#9a3412">
            {t('playback:labels.seatsOccupied', {
              occ: seatOcc,
              total: config.seatCount,
            })}
          </text>
        </ZoneCard>

        {/* Kitchen (full-height now that the cat queue is gone) */}
        <ZoneCard
          x="520"
          y="60"
          w="200"
          h="380"
          label={t('playback:zones.kitchen')}
          strokeClass={
            orderReadyPulses.size > 0 ? 'neko-kitchen-ding' : undefined
          }
          fillClass={
            orderReadyPulses.size > 0 ? 'neko-kitchen-ding-bg' : undefined
          }
        >
          {Array.from({ length: config.staffCount }, (_, i) => {
            const busy = i < state.staffBusyCount
            const col = i % 3
            const row = Math.floor(i / 3)
            return (
              <g
                key={`staff-${i}`}
                transform={`translate(${KITCHEN.x - 70 + col * KITCHEN.stepX}, ${KITCHEN.y + row * 50})`}
              >
                <circle
                  r="16"
                  fill={busy ? '#fdba74' : '#fff7ed'}
                  stroke={busy ? '#ea580c' : '#fed7aa'}
                  strokeWidth="1.5"
                />
                <text textAnchor="middle" y="6" fontSize="16">👩‍🍳</text>
              </g>
            )
          })}

          {/* Steam wisps above the kitchen zone when any staff is busy */}
          {decor && state.staffBusyCount > 0 && (
            <g>
              <text
                x="580"
                y="100"
                textAnchor="middle"
                fontSize="12"
                className="neko-steam"
                style={steamStyle}
              >
                〰️
              </text>
              <text
                x="620"
                y="100"
                textAnchor="middle"
                fontSize="12"
                className="neko-steam neko-steam--d1"
                style={steamStyle}
              >
                〰️
              </text>
              <text
                x="660"
                y="100"
                textAnchor="middle"
                fontSize="12"
                className="neko-steam neko-steam--d2"
                style={steamStyle}
              >
                〰️
              </text>
            </g>
          )}

          <text x="620" y="340" textAnchor="middle" fontSize="11" fill="#9a3412">
            {t('playback:labels.staffBusy', {
              busy: state.staffBusyCount,
              total: config.staffCount,
            })}
          </text>
          <text x="620" y="356" textAnchor="middle" fontSize="10" fill="#9a3412" opacity="0.8">
            {t('playback:labels.catVisitsTotal', { count: state.counters.catVisits })}
          </text>
        </ZoneCard>

        {/* Cat home zone */}
        <ZoneCard x="740" y="60" w="170" h="380" label={t('playback:zones.cats')}>
          {/* Food corner and litter corner — pure visual props that
              resting cats wander between. No semantic meaning, no new
              events, no new metrics. */}
          <g opacity="0.6">
            <circle
              cx={FOOD_CORNER.x}
              cy={FOOD_CORNER.y}
              r="14"
              fill="#fff7ed"
              stroke="#fed7aa"
              strokeWidth="1"
            />
            <text
              x={FOOD_CORNER.x}
              y={FOOD_CORNER.y + 5}
              textAnchor="middle"
              fontSize="16"
            >
              🍚
            </text>
            <circle
              cx={LITTER_CORNER.x}
              cy={LITTER_CORNER.y}
              r="14"
              fill="#fff7ed"
              stroke="#fed7aa"
              strokeWidth="1"
            />
            <text
              x={LITTER_CORNER.x}
              y={LITTER_CORNER.y + 5}
              textAnchor="middle"
              fontSize="16"
            >
              🚽
            </text>
          </g>
          <text x="825" y="430" textAnchor="middle" fontSize="11" fill="#9a3412">
            {t('playback:labels.catsBusy', {
              busy: catsActive,
              total: config.catCount,
            })}
          </text>
          {allCatsOut && (
            <text
              x="825"
              y="280"
              textAnchor="middle"
              fontSize="11"
              fill="#9ca3af"
              fontStyle="italic"
            >
              {t('playback:labels.allCatsOut')}
            </text>
          )}
        </ZoneCard>

        {/* Exit */}
        <ZoneCard
          x="920"
          y="200"
          w="70"
          h="110"
          label={t('playback:zones.exit')}
          fillClass={
            exitBadFlashing
              ? 'neko-exit-flash-bad'
              : exitGoodFlashing
              ? 'neko-exit-flash-good'
              : undefined
          }
        >
          <text x="955" y="250" textAnchor="middle" fontSize="28">🏁</text>
          <text x="955" y="285" textAnchor="middle" fontSize="10" fill="#16a34a">
            {t('playback:labels.served')} {state.counters.served}
          </text>
          <text x="955" y="300" textAnchor="middle" fontSize="10" fill="#dc2626">
            {t('playback:labels.abandoned')} {state.counters.abandoned}
          </text>
        </ZoneCard>

        {/* ── Cherry blossom petals ─ always on, drifting from top
            edge diagonally down and left. Rendered behind customer
            sprites so petals don't obscure avatar legibility. */}
        {PETAL_SEEDS.map((seed, i) => (
          <g
            key={`petal-${i}`}
            transform={`translate(${seed.startX}, 0)`}
          >
            <text
              className="neko-petal"
              textAnchor="middle"
              fontSize="11"
              style={{
                animationDuration: `${seed.duration.toFixed(1)}s`,
                animationDelay: `${seed.delay.toFixed(2)}s`,
              }}
            >
              🌸
            </text>
          </g>
        ))}

        {/* ── Customer avatars ──────────────────────────────────── */}
        {customers.map((c) => {
          const { x, y } = customerXY(c, state, speed)
          const color = chipColor(c)
          const bubble = freshestBubble.get(c.id)
          const fresh = isFreshlyArrived(c, state.time)
          const leaving = c.leftAt !== undefined
          const badge = stageBadge(c)
          const hasCat = c.visitingCats.size > 0 && !leaving
          const facing = facingFromPrevX(`cust-${c.id}`, x)
          const walking = customerIsWalking(c, state, speed)

          // Abandon drama phase derivation. Active when this customer
          // has a fresh `abandonDrama` pulse: phase A (stomp) for the
          // first 20%, phase D (slam) for the last 20%, walk in between.
          const dramaFiredAt = abandonDramaPulses.get(c.id)
          const dramaProgressRaw =
            dramaFiredAt !== undefined
              ? (state.time - dramaFiredAt) / PULSE_TTL_MIN.abandonDrama
              : null
          const dramaActive =
            dramaProgressRaw !== null &&
            dramaProgressRaw >= 0 &&
            dramaProgressRaw < 1
          const dramaClass: string | undefined = !dramaActive
            ? undefined
            : dramaProgressRaw! < 0.20
            ? 'neko-drama-stomp'
            : dramaProgressRaw! >= 0.80
            ? 'neko-drama-slam'
            : undefined

          // While the drama is running, force opacity to 1 so the
          // existing leftAt linger fade does not pre-dim the customer
          // before the slam phase explicitly fades them out.
          const opacity = dramaActive ? 1 : customerOpacity(c, state.time)

          // Pick the right inner animation class. Pop-in wins while
          // the customer is brand new; pop-out wins while they're
          // leaving; idle bob otherwise. Drama suppresses pop-out so
          // its own slam keyframe doesn't fight the shrink animation.
          const innerClass = dramaActive
            ? 'neko-bob'
            : fresh
            ? 'neko-pop-in'
            : leaving
            ? 'neko-pop-out'
            : 'neko-bob'
          const innerStyle =
            innerClass === 'neko-bob' ? bobStyleFor(c.id) : undefined

          // While walking, position is computed per-frame from sim time
          // — no CSS transform transition (which would otherwise fight
          // the JS interpolation). When stationary (e.g. queue shuffle)
          // keep a short transition so position changes stay smooth.
          const transformTransition = walking
            ? ''
            : 'transform 220ms ease-out, '

          return (
            <g
              key={`cust-${c.id}`}
              transform={`translate(${x}, ${y})`}
              opacity={opacity}
              style={{
                transition: `${transformTransition}opacity 400ms ease-out`,
                willChange: 'transform',
              }}
            >
              <g
                transform={facing === 'left' ? 'scale(-1,1)' : undefined}
                style={{ transition: 'transform 220ms ease-out' }}
              >
              <g className={innerClass} style={innerStyle}>
              <g className={dramaClass} key={dramaClass ? `drama-${dramaFiredAt}` : 'no-drama'}>
                <circle
                  r="13"
                  fill={color}
                  stroke="#c2410c"
                  strokeWidth="1.3"
                  opacity="0.92"
                />
                <text textAnchor="middle" y="5" fontSize="15">
                  {avatarEmoji(c)}
                </text>
                <text
                  textAnchor="middle"
                  y="-16"
                  fontSize="9"
                  fill="#7c2d12"
                  fontWeight="600"
                >
                  #{c.id}
                </text>

                {/* Walking legs: two tiny dots that alternate up and down
                    so the avatar always looks a little in-motion. */}
                <circle
                  cx="-4"
                  cy="14"
                  r="1.2"
                  fill="#7c2d12"
                  className="neko-step-a"
                  style={stepStyleA}
                />
                <circle
                  cx="4"
                  cy="14"
                  r="1.2"
                  fill="#7c2d12"
                  className="neko-step-b"
                  style={stepStyleB}
                />

                {/* Stage badge: 📝 / ⏰ / ⏳ in top-right corner */}
                {badge && (
                  <text
                    x="11"
                    y="-6"
                    textAnchor="middle"
                    fontSize="10"
                  >
                    {badge}
                  </text>
                )}

                {/* Food bowl while dining, OR a sparkle burst for the
                    brief window after FINISH_DINING, so the transition
                    "I'm eating → I'm done" has a visible flourish
                    instead of the bowl silently vanishing. */}
                {c.stage === 'dining' && (
                  <text
                    x="-16"
                    y="6"
                    textAnchor="middle"
                    fontSize="12"
                  >
                    🍜
                  </text>
                )}
                {c.seatSlot !== undefined &&
                  finishDiningPulses.has(c.seatSlot) && (
                    <g
                      opacity={pulseOpacity('finishDining', finishDiningPulses.get(c.seatSlot))}
                    >
                      {/* Central large sparkle that rotates out */}
                      <text
                        x="-16"
                        y="6"
                        textAnchor="middle"
                        fontSize="18"
                        className="neko-plate-done"
                      >
                        ✨
                      </text>
                      {/* 3 satellite sparkles radiating in N / NE / SE /
                          SW directions (4 for a full cross) */}
                      <text
                        x="-16"
                        y="-6"
                        textAnchor="middle"
                        fontSize="9"
                        className="neko-plate-orbit-n"
                      >
                        ✨
                      </text>
                      <text
                        x="-6"
                        y="0"
                        textAnchor="middle"
                        fontSize="9"
                        className="neko-plate-orbit-ne"
                      >
                        ✨
                      </text>
                      <text
                        x="-6"
                        y="12"
                        textAnchor="middle"
                        fontSize="9"
                        className="neko-plate-orbit-se"
                      >
                        ✨
                      </text>
                      <text
                        x="-26"
                        y="12"
                        textAnchor="middle"
                        fontSize="9"
                        className="neko-plate-orbit-sw"
                      >
                        ✨
                      </text>
                    </g>
                  )}

                {/* Floating hearts while any cat is visiting */}
                {decor && hasCat && (
                  <g>
                    <text
                      x="4"
                      y="0"
                      textAnchor="middle"
                      fontSize="10"
                      className="neko-heart"
                      style={heartStyleA}
                    >
                      💕
                    </text>
                    <text
                      x="-2"
                      y="0"
                      textAnchor="middle"
                      fontSize="9"
                      className="neko-heart neko-heart--delayed"
                      style={heartStyleB}
                    >
                      💖
                    </text>
                  </g>
                )}

                {bubble && (
                  <SpeechBubble
                    text={t(`playback:bubbles.${bubble.kind}` as const)}
                    opacity={bubble.opacity}
                    withSparkles={bubble.kind === 'arrive'}
                  />
                )}
              </g>
              </g>
              </g>
            </g>
          )
        })}

        {/* ── Abandon-drama decorations: smoke trail tracking the
            angry customer, plus the dust-cloud puff left at the door
            once they slam through. Rendered AFTER the customer body
            so they sit on top of the avatar. ─────────────────────── */}
        {state.scenePulses
          .filter((p) => p.kind === 'abandonDrama')
          .map((p) => {
            const elapsed = state.time - p.firedAt
            const dramaTtl = PULSE_TTL_MIN.abandonDrama
            const dramaP = elapsed / dramaTtl
            if (dramaP < 0 || dramaP >= 1) return null
            const customer = state.customers[p.target]
            if (!customer) return null
            const { x, y } = customerXY(customer, state, speed)
            const slamPhase = dramaP >= 0.80

            return (
              <g key={`drama-${p.target}-${p.firedAt}`} pointerEvents="none">
                {/* Smoke trail above customer's head, follows them for
                    the whole drama window. */}
                <g transform={`translate(${x}, ${y - 22})`}>
                  <text
                    x="-7"
                    y="0"
                    textAnchor="middle"
                    fontSize="13"
                    className="neko-drama-smoke-1"
                  >
                    💨
                  </text>
                  <text
                    x="0"
                    y="-2"
                    textAnchor="middle"
                    fontSize="13"
                    className="neko-drama-smoke-2"
                  >
                    💨
                  </text>
                  <text
                    x="7"
                    y="0"
                    textAnchor="middle"
                    fontSize="13"
                    className="neko-drama-smoke-3"
                  >
                    💨
                  </text>
                </g>

                {/* Dust cloud at the door, only during the slam phase.
                    Re-keyed per pulse so the CSS animation restarts
                    cleanly for each abandoning customer. */}
                {slamPhase && (
                  <text
                    key={`dust-${p.target}-${p.firedAt}`}
                    x={DOOR.x}
                    y={DOOR.y + 4}
                    textAnchor="middle"
                    fontSize="22"
                    className="neko-drama-dust"
                  >
                    💨
                  </text>
                )}
              </g>
            )
          })}

        {/* ── Cat sprites (drawn AFTER customers so they sit on top when
            visiting a seat) ──────────────────────────────────────── */}
        {state.cats.map((cat) => {
          const { x, y } = catXY(cat, state, speed)
          const isFocus =
            focus?.kind === 'cat' && focus.slotIdx === cat.slotIdx
          const resting = cat.state === 'resting'
          const visiting = cat.state === 'visiting'
          const walking = catIsWalking(cat, state, speed)
          const tint = CAT_TINT_FILL[cat.slotIdx % CAT_TINT_FILL.length]
          const tintStroke = CAT_TINT_STROKE[cat.slotIdx % CAT_TINT_STROKE.length]
          const bg = resting ? '#e0e7ff' : visiting ? '#bbf7d0' : tint
          const stroke = resting ? '#6366f1' : visiting ? '#16a34a' : tintStroke
          const innerClass = visiting ? 'neko-tail-wag' : 'neko-bob'
          // Cats get a separate stagger pool so they don't sync up with
          // any customer of the same id modulo.
          const innerStyle = visiting
            ? tailStyle
            : bobStyleFor(cat.slotIdx * 2 + 1)
          const catFacing = facingFromPrevX(`cat-${cat.slotIdx}`, x)
          // matrix(-1 0 0 1 36 0): flip X around the 36-px wide box's
          // center so the emoji face points the other way without
          // shifting the box. Only applied to the emoji glyph, not the
          // surrounding rect / id label, so the cell stays readable.
          const faceTransform =
            catFacing === 'left' ? 'matrix(-1 0 0 1 36 0)' : undefined

          // Same per-frame vs CSS-transition decision as customers.
          const transformTransition = walking
            ? ''
            : 'transform 220ms ease-out'

          return (
            <g
              key={`cat-${cat.slotIdx}`}
              transform={`translate(${x - 18}, ${y - 18})`}
              className="cursor-pointer focus-visible:outline focus-visible:outline-2 focus-visible:outline-orange-500"
              tabIndex={0}
              role="button"
              aria-label={t('playback:a11y.cat', { n: cat.slotIdx + 1, status: t(`playback:a11y.catState.${cat.state}` as const) })}
              style={{
                transition: transformTransition,
                willChange: 'transform',
              }}
              onClick={(e) => {
                e.stopPropagation()
                onSelectFocus({ kind: 'cat', slotIdx: cat.slotIdx })
              }}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault()
                  e.stopPropagation()
                  onSelectFocus({ kind: 'cat', slotIdx: cat.slotIdx })
                }
              }}
            >
              <g className={innerClass} style={innerStyle}>
                <rect
                  width="36"
                  height="36"
                  rx="10"
                  fill={bg}
                  stroke={isFocus ? '#ea580c' : stroke}
                  strokeWidth={isFocus ? '3' : '1.5'}
                />
                <text
                  x="18"
                  y="24"
                  textAnchor="middle"
                  fontSize="20"
                  transform={faceTransform}
                  style={{ transition: 'transform 220ms ease-out' }}
                >
                  {catEmoji(cat.slotIdx, resting)}
                </text>
                {visiting && (
                  <text x="30" y="10" textAnchor="middle" fontSize="11">💖</text>
                )}
                <text
                  textAnchor="middle"
                  x="18"
                  y="-4"
                  fontSize="9"
                  fill="#7c2d12"
                  fontWeight="600"
                >
                  #{cat.slotIdx + 1}
                </text>
                {/* Cat's back legs: two dots under the cat box */}
                <circle
                  cx="14"
                  cy="37"
                  r="1.2"
                  fill="#7c2d12"
                  className="neko-step-a"
                  style={stepStyleA}
                />
                <circle
                  cx="22"
                  cy="37"
                  r="1.2"
                  fill="#7c2d12"
                  className="neko-step-b"
                  style={stepStyleB}
                />
              </g>
            </g>
          )
        })}
      </svg>
    </div>
  )
}

// ─── Local helpers ─────────────────────────────────────────────

/**
 * Ambient analog clock in the top-left corner that advances with sim
 * time. We pretend the café opens at 10:00, so `simTime = 0` shows
 * 10:00 and a 240-min run ends at 14:00.
 *
 * v3 polish: bigger face, a visible 12 o'clock tick so the orientation
 * is obvious, and a digital `HH:MM` label below the dial so the clock
 * reads instantly as "a clock" instead of "a weird rotating dot".
 */
function AmbientClock({ simTime }: { simTime: number }) {
  const cx = 50
  const cy = 42
  const r = 24
  // Map simTime (minutes since open) onto a wall clock that starts at
  // 10:00 and wraps every 24 hours. Long runs past midnight are still
  // readable because the 24-hour wrap keeps the digital label in a
  // sensible range. Analog and digital read from the same source so
  // they never disagree.
  const wallMinutes = Math.max(0, 10 * 60 + Math.floor(simTime)) % (24 * 60)
  const wallH = Math.floor(wallMinutes / 60)
  const wallM = wallMinutes % 60
  const label = `${wallH.toString().padStart(2, '0')}:${wallM
    .toString()
    .padStart(2, '0')}`

  // Analog hands: hour hand sweeps once per 12 hours, minute hand once
  // per hour. Both use the same wallMinutes so they match the label.
  const hourAngle = ((wallH % 12) / 12) * 360 + (wallM / 60) * 30 - 90
  const minAngle = (wallM / 60) * 360 - 90
  const hourLen = r * 0.52
  const minLen = r * 0.82
  const hourX = cx + Math.cos((hourAngle * Math.PI) / 180) * hourLen
  const hourY = cy + Math.sin((hourAngle * Math.PI) / 180) * hourLen
  const minX = cx + Math.cos((minAngle * Math.PI) / 180) * minLen
  const minY = cy + Math.sin((minAngle * Math.PI) / 180) * minLen

  return (
    <g aria-hidden>
      <circle
        cx={cx}
        cy={cy}
        r={r}
        fill="#fff7ed"
        stroke="#fdba74"
        strokeWidth="2"
      />
      {/* 12 o'clock tick — a short orange bar at the top of the dial so
          the clock orientation is unambiguous. */}
      <line
        x1={cx}
        y1={cy - r + 2}
        x2={cx}
        y2={cy - r + 6}
        stroke="#c2410c"
        strokeWidth="2"
        strokeLinecap="round"
      />
      {/* Hour hand: thicker, shorter. */}
      <line
        x1={cx}
        y1={cy}
        x2={hourX}
        y2={hourY}
        stroke="#9a3412"
        strokeWidth="2.2"
        strokeLinecap="round"
      />
      {/* Minute hand: thinner, longer. */}
      <line
        x1={cx}
        y1={cy}
        x2={minX}
        y2={minY}
        stroke="#ea580c"
        strokeWidth="1.6"
        strokeLinecap="round"
      />
      <circle cx={cx} cy={cy} r="1.8" fill="#9a3412" />
      {/* Digital label sitting just under the dial — belt-and-braces
          so a user who can't read the tiny hands still sees a time. */}
      <text
        x={cx}
        y={cy + r + 12}
        textAnchor="middle"
        fontSize="11"
        fontWeight="700"
        fill="#9a3412"
        fontFamily="ui-monospace, SFMono-Regular, Menlo, monospace"
      >
        {label}
      </text>
    </g>
  )
}

interface ZoneCardProps {
  x: string
  y: string
  w: string
  h: string
  label: string
  children?: React.ReactNode
  /** When set, applied to the background <rect> for fill animations. */
  fillClass?: string
  /** When set, applied to the background <rect> for stroke animations. */
  strokeClass?: string
  /** Static stroke color override for reduced-motion fallback + warn state. */
  strokeOverride?: string
}

function ZoneCard({
  x,
  y,
  w,
  h,
  label,
  children,
  fillClass,
  strokeClass,
  strokeOverride,
}: ZoneCardProps) {
  return (
    <g>
      <rect
        x={x}
        y={y}
        width={w}
        height={h}
        rx="12"
        fill="#ffffff"
        stroke={strokeOverride ?? '#fed7aa'}
        strokeWidth="1.2"
        opacity="0.85"
        className={[fillClass, strokeClass].filter(Boolean).join(' ') || undefined}
      />
      <text
        x={String(Number(x) + Number(w) / 2)}
        y={String(Number(y) + 18)}
        textAnchor="middle"
        fontSize="11"
        fontWeight="600"
        fill="#c2410c"
        letterSpacing="0.08em"
      >
        {label}
      </text>
      {children}
    </g>
  )
}

/**
 * Pill-shaped speech bubble anchored above a customer. When the bubble
 * belongs to a CUSTOMER_ARRIVE event we also render four sparkles that
 * burst out from the customer as a welcome effect.
 */
function SpeechBubble({
  text,
  opacity,
  withSparkles,
}: {
  text: string
  opacity: number
  withSparkles: boolean
}) {
  return (
    <g opacity={opacity} style={{ transition: 'opacity 160ms ease-out' }}>
      {withSparkles && (
        <g>
          <text x="0" y="0" textAnchor="middle" fontSize="11" className="neko-sparkle-ne">✨</text>
          <text x="0" y="0" textAnchor="middle" fontSize="11" className="neko-sparkle-nw">✨</text>
          <text x="0" y="0" textAnchor="middle" fontSize="11" className="neko-sparkle-se">✨</text>
          <text x="0" y="0" textAnchor="middle" fontSize="11" className="neko-sparkle-sw">✨</text>
        </g>
      )}
      <rect
        x="-42"
        y="-44"
        width="84"
        height="18"
        rx="9"
        fill="#fff7ed"
        stroke="#f97316"
        strokeWidth="1.2"
      />
      <text
        x="0"
        y="-31"
        textAnchor="middle"
        fontSize="10"
        fontWeight="600"
        fill="#9a3412"
      >
        {text}
      </text>
    </g>
  )
}
