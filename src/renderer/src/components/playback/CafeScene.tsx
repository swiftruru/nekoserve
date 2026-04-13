import { useTranslation } from 'react-i18next'
import type { SimulationConfig } from '../../types'
import {
  BUBBLE_TTL_MIN,
  LEAVE_LINGER_MIN,
  type BubbleKind,
  type CafeState,
  type CatSlot,
  type CustomerRuntime,
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

const VIEW_W = 1000
const VIEW_H = 500

// Zone anchor points (visual centers)
const DOOR = { x: 60, y: 250 }
const EXIT = { x: 940, y: 250 }
const ABANDON = { x: 60, y: 380 }

const QUEUE_SEAT = { x: 170, y: 90, step: 26 }

const SEAT_GRID = { x: 260, y: 100, cellW: 44, cellH: 46, cols: 6 }
const CAT_GRID = { x: 760, y: 110, cellW: 70, cellH: 80, cols: 2 }

const KITCHEN = { x: 620, y: 130, stepX: 40 }

// Purely cosmetic corners inside the cat zone. Resting cats drift between
// home and one of these so the "rest" state has more narrative than just
// a 💤 sitting in place. Zero simulation semantics — no new events, no new
// config, no new metrics.
const FOOD_CORNER = { x: 770, y: 340 }
const LITTER_CORNER = { x: 878, y: 340 }

// How many sim-minutes a resting cat takes to complete one "wander over,
// hang out, wander back" cycle. Tuned so the movement reads clearly at
// 1×–4× without looking restless at 0.5×.
const REST_WANDER_CYCLE_MIN = 6

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

// ─── Position helpers ──────────────────────────────────────

function seatPos(slotIdx: number): { x: number; y: number } {
  const col = slotIdx % SEAT_GRID.cols
  const row = Math.floor(slotIdx / SEAT_GRID.cols)
  return {
    x: SEAT_GRID.x + col * SEAT_GRID.cellW,
    y: SEAT_GRID.y + row * SEAT_GRID.cellH,
  }
}

function catHomePos(slotIdx: number): { x: number; y: number } {
  const col = slotIdx % CAT_GRID.cols
  const row = Math.floor(slotIdx / CAT_GRID.cols)
  return {
    x: CAT_GRID.x + col * CAT_GRID.cellW,
    y: CAT_GRID.y + row * CAT_GRID.cellH,
  }
}

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

function catXY(
  cat: CatSlot,
  state: CafeState,
): { x: number; y: number } {
  if (cat.state === 'visiting' && cat.visitingCustomerId !== null) {
    const customer = state.customers[cat.visitingCustomerId]
    if (customer && customer.seatSlot !== undefined) {
      const sp = seatPos(customer.seatSlot)
      return {
        x: Math.min(sp.x + 16, SEAT_GRID.x + 5 * SEAT_GRID.cellW + 16),
        y: sp.y,
      }
    }
  }
  if (cat.state === 'resting') {
    return restingCatTargetXY(cat, state)
  }
  return catHomePos(cat.slotIdx)
}

function customerXY(
  c: CustomerRuntime,
  state: CafeState,
): { x: number; y: number } {
  switch (c.stage) {
    case 'arriving':
      return DOOR
    case 'waitingSeat': {
      const idx = state.queueSeat.indexOf(c.id)
      const q = idx >= 0 ? idx : 0
      return { x: QUEUE_SEAT.x, y: QUEUE_SEAT.y + q * QUEUE_SEAT.step }
    }
    case 'seated':
    case 'ordering':
    case 'waitingFood':
    case 'dining':
      return c.seatSlot !== undefined ? seatPos(c.seatSlot) : DOOR
    case 'leaving':
      return c.seatSlot !== undefined ? seatPos(c.seatSlot) : EXIT
    case 'abandoned':
      return ABANDON
  }
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

  function handleBackgroundClick() {
    onSelectFocus(null)
  }

  // Inline style for idle bob with speed-aware tempo.
  const bobStyle = { animationDuration: animDurationSec(2.2, speed, 1.1) }
  const heartStyleA = { animationDuration: animDurationSec(2.4, speed, 1.2) }
  const heartStyleB = {
    animationDuration: animDurationSec(2.4, speed, 1.2),
    animationDelay: animDurationSec(1.2, speed, 0.6),
  }
  const tailStyle = { animationDuration: animDurationSec(0.8, speed, 0.3) }
  const steamStyle = { animationDuration: animDurationSec(2.6, speed, 1.2) }
  const decor = showDecor(speed)

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
            <stop offset="0%" stopColor="#fffaf1" />
            <stop offset="100%" stopColor="#fef3e2" />
          </linearGradient>
        </defs>
        <rect x="0" y="0" width={VIEW_W} height={VIEW_H} fill="url(#floor)" />

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
        <ZoneCard x="120" y="60" w="110" h="380" label={t('playback:zones.queueSeat')}>
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
            return (
              <g
                key={`seat-${seat.slotIdx}`}
                transform={`translate(${p.x - 18}, ${p.y - 18})`}
                className="cursor-pointer"
                onClick={(e) => {
                  e.stopPropagation()
                  onSelectFocus({ kind: 'seat', slotIdx: seat.slotIdx })
                }}
              >
                <rect
                  width="36"
                  height="36"
                  rx="8"
                  fill={busy ? '#fed7aa' : '#fff7ed'}
                  stroke={isFocus ? '#ea580c' : busy ? '#f97316' : '#fed7aa'}
                  strokeWidth={isFocus ? '3' : '1.5'}
                />
                <text x="18" y="24" textAnchor="middle" fontSize="18">🪑</text>
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
        <ZoneCard x="520" y="60" w="200" h="380" label={t('playback:zones.kitchen')}>
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

        {/* ── Customer avatars ──────────────────────────────────── */}
        {customers.map((c) => {
          const { x, y } = customerXY(c, state)
          const opacity = customerOpacity(c, state.time)
          const color = chipColor(c)
          const bubble = freshestBubble.get(c.id)
          const fresh = isFreshlyArrived(c, state.time)
          const leaving = c.leftAt !== undefined
          const badge = stageBadge(c)
          const hasCat = c.visitingCats.size > 0 && !leaving

          // Pick the right inner animation class. Pop-in wins while
          // the customer is brand new; pop-out wins while they're
          // leaving; idle bob otherwise.
          const innerClass = fresh
            ? 'neko-pop-in'
            : leaving
            ? 'neko-pop-out'
            : 'neko-bob'
          const innerStyle = innerClass === 'neko-bob' ? bobStyle : undefined

          return (
            <g
              key={`cust-${c.id}`}
              transform={`translate(${x}, ${y})`}
              opacity={opacity}
              style={{
                transition:
                  'transform 420ms cubic-bezier(0.34, 1.56, 0.64, 1), opacity 400ms ease-out',
                willChange: 'transform',
              }}
            >
              <g className={innerClass} style={innerStyle}>
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

                {/* Food bowl while dining */}
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
          )
        })}

        {/* ── Cat sprites (drawn AFTER customers so they sit on top when
            visiting a seat) ──────────────────────────────────────── */}
        {state.cats.map((cat) => {
          const { x, y } = catXY(cat, state)
          const isFocus =
            focus?.kind === 'cat' && focus.slotIdx === cat.slotIdx
          const resting = cat.state === 'resting'
          const visiting = cat.state === 'visiting'
          const tint = CAT_TINT_FILL[cat.slotIdx % CAT_TINT_FILL.length]
          const tintStroke = CAT_TINT_STROKE[cat.slotIdx % CAT_TINT_STROKE.length]
          const bg = resting ? '#e0e7ff' : visiting ? '#bbf7d0' : tint
          const stroke = resting ? '#6366f1' : visiting ? '#16a34a' : tintStroke
          const innerClass = visiting ? 'neko-tail-wag' : 'neko-bob'
          const innerStyle = visiting ? tailStyle : bobStyle

          return (
            <g
              key={`cat-${cat.slotIdx}`}
              transform={`translate(${x - 18}, ${y - 18})`}
              className="cursor-pointer"
              style={{
                transition:
                  'transform 420ms cubic-bezier(0.34, 1.56, 0.64, 1)',
                willChange: 'transform',
              }}
              onClick={(e) => {
                e.stopPropagation()
                onSelectFocus({ kind: 'cat', slotIdx: cat.slotIdx })
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
                <text x="18" y="24" textAnchor="middle" fontSize="20">
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
              </g>
            </g>
          )
        })}
      </svg>
    </div>
  )
}

// ─── Local helpers ─────────────────────────────────────────────

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
