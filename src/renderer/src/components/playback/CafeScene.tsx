import { useTranslation } from 'react-i18next'
import type { SimulationConfig } from '../../types'
import {
  BUBBLE_TTL_MIN,
  LEAVE_LINGER_MIN,
  type BubbleKind,
  type CafeState,
  type CustomerRuntime,
} from '../../utils/replay'

/**
 * SVG floor plan that renders the current café state produced by the replay
 * reducer. Customers are <g> nodes whose `transform` is updated every frame;
 * CSS transitions smooth the movement between zones so the reducer stays
 * discrete while the animation stays fluid.
 */

export type FocusTarget =
  | { kind: 'seat'; slotIdx: number }
  | { kind: 'cat'; slotIdx: number }

interface CafeSceneProps {
  state: CafeState
  config: SimulationConfig
  focus: FocusTarget | null
  onSelectFocus: (target: FocusTarget | null) => void
}

const VIEW_W = 1000
const VIEW_H = 500

// Zone anchor points (visual centers) — keep in sync with CafeScene background
const DOOR = { x: 60, y: 250 }
const EXIT = { x: 940, y: 250 }
const ABANDON = { x: 60, y: 380 }

const QUEUE_SEAT = { x: 170, y: 90, step: 26 }
const QUEUE_CAT = { x: 620, y: 290, step: 22 }

const SEAT_GRID = { x: 260, y: 100, cellW: 44, cellH: 46, cols: 6 }
const CAT_GRID = { x: 740, y: 100, cellW: 60, cellH: 70, cols: 2 }

const KITCHEN = { x: 620, y: 90, stepX: 40 }

function seatPos(slotIdx: number): { x: number; y: number } {
  const col = slotIdx % SEAT_GRID.cols
  const row = Math.floor(slotIdx / SEAT_GRID.cols)
  return {
    x: SEAT_GRID.x + col * SEAT_GRID.cellW,
    y: SEAT_GRID.y + row * SEAT_GRID.cellH,
  }
}

function catPos(slotIdx: number): { x: number; y: number } {
  const col = slotIdx % CAT_GRID.cols
  const row = Math.floor(slotIdx / CAT_GRID.cols)
  return {
    x: CAT_GRID.x + col * CAT_GRID.cellW,
    y: CAT_GRID.y + row * CAT_GRID.cellH,
  }
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
    case 'waitingCat': {
      const idx = state.queueCat.indexOf(c.id)
      const q = idx >= 0 ? idx : 0
      return { x: QUEUE_CAT.x, y: QUEUE_CAT.y + q * QUEUE_CAT.step }
    }
    case 'interacting':
      return c.catSlot !== undefined ? catPos(c.catSlot) : EXIT
    case 'leaving':
      return EXIT
    case 'abandoned':
      return ABANDON
  }
}

function avatarEmoji(stage: CustomerRuntime['stage']): string {
  switch (stage) {
    case 'dining':
      return '🍽️'
    case 'interacting':
      return '😺'
    case 'abandoned':
      return '😿'
    case 'ordering':
      return '📝'
    case 'waitingFood':
      return '⏳'
    case 'leaving':
      return '👋'
    case 'waitingSeat':
    case 'waitingCat':
      return '🙂'
    default:
      return '🙂'
  }
}

function chipColor(stage: CustomerRuntime['stage']): string {
  switch (stage) {
    case 'waitingSeat':
    case 'waitingFood':
    case 'waitingCat':
      return '#fed7aa'
    case 'seated':
    case 'ordering':
      return '#fdba74'
    case 'dining':
      return '#fbcfe8'
    case 'interacting':
      return '#bbf7d0'
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

export default function CafeScene({
  state,
  config,
  focus,
  onSelectFocus,
}: CafeSceneProps) {
  const { t } = useTranslation('playback')

  const seatOcc = state.seats.filter((s) => s.customerId !== null).length
  const catsBusy = state.cats.filter((c) => c.state !== 'idle').length

  // Index the active bubbles by customer so customer rendering is O(1) per.
  const bubblesByCustomer = new Map<number, BubbleKind[]>()
  for (const b of state.activeBubbles) {
    const list = bubblesByCustomer.get(b.customerId) ?? []
    list.push(b.kind)
    bubblesByCustomer.set(b.customerId, list)
  }

  // Bubble fade helper — youngest bubble wins if multiple fired for same id.
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
    // Clicking the floor (not a seat/cat) clears any focus selection.
    onSelectFocus(null)
  }

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

        {/* Door */}
        <ZoneCard x="10" y="200" w="100" h="110" label={t('playback:zones.door')}>
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
        <ZoneCard x="240" y="60" w="260" h="380" label={t('playback:zones.seats')}>
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

        {/* Kitchen */}
        <ZoneCard x="560" y="60" w="150" h="170" label={t('playback:zones.kitchen')}>
          {Array.from({ length: config.staffCount }, (_, i) => {
            const busy = i < state.staffBusyCount
            return (
              <g
                key={`staff-${i}`}
                transform={`translate(${KITCHEN.x - 55 + i * KITCHEN.stepX}, ${KITCHEN.y + 20})`}
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
          <text x="635" y="210" textAnchor="middle" fontSize="11" fill="#9a3412">
            {t('playback:labels.staffBusy', {
              busy: state.staffBusyCount,
              total: config.staffCount,
            })}
          </text>
        </ZoneCard>

        {/* Cat queue */}
        <ZoneCard x="560" y="250" w="150" h="190" label={t('playback:zones.queueCat')}>
          <text x="635" y="425" textAnchor="middle" fontSize="11" fill="#9a3412">
            × {state.queueCat.length}
          </text>
        </ZoneCard>

        {/* Cat area */}
        <ZoneCard x="720" y="60" w="180" h="380" label={t('playback:zones.cats')}>
          {state.cats.map((cat) => {
            const p = catPos(cat.slotIdx)
            const busy = cat.state === 'busy'
            const resting = cat.state === 'resting'
            const bg = resting ? '#e0e7ff' : busy ? '#bbf7d0' : '#fff7ed'
            const stroke = resting ? '#6366f1' : busy ? '#16a34a' : '#fed7aa'
            const isFocus =
              focus?.kind === 'cat' && focus.slotIdx === cat.slotIdx
            return (
              <g
                key={`cat-${cat.slotIdx}`}
                transform={`translate(${p.x - 22}, ${p.y - 24})`}
                className="cursor-pointer"
                onClick={(e) => {
                  e.stopPropagation()
                  onSelectFocus({ kind: 'cat', slotIdx: cat.slotIdx })
                }}
              >
                <rect
                  width="44"
                  height="48"
                  rx="10"
                  fill={bg}
                  stroke={isFocus ? '#ea580c' : stroke}
                  strokeWidth={isFocus ? '3' : '1.5'}
                />
                <text x="22" y="30" textAnchor="middle" fontSize="24">
                  {resting ? '💤' : '🐱'}
                </text>
                {busy && (
                  <text x="34" y="14" textAnchor="middle" fontSize="12">💖</text>
                )}
              </g>
            )
          })}
          <text x="810" y="430" textAnchor="middle" fontSize="11" fill="#9a3412">
            {t('playback:labels.catsBusy', {
              busy: catsBusy,
              total: config.catCount,
            })}
          </text>
        </ZoneCard>

        {/* Exit */}
        <ZoneCard x="910" y="200" w="80" h="110" label={t('playback:zones.exit')}>
          <text x="950" y="250" textAnchor="middle" fontSize="32">🏁</text>
          <text x="950" y="285" textAnchor="middle" fontSize="10" fill="#16a34a">
            {t('playback:labels.served')} {state.counters.served}
          </text>
          <text x="950" y="300" textAnchor="middle" fontSize="10" fill="#dc2626">
            {t('playback:labels.abandoned')} {state.counters.abandoned}
          </text>
        </ZoneCard>

        {/* ── Customer avatars ──────────────────────────────────── */}
        {Object.values(state.customers).map((c) => {
          const { x, y } = customerXY(c, state)
          const opacity = customerOpacity(c, state.time)
          const color = chipColor(c.stage)
          const bubble = freshestBubble.get(c.id)
          return (
            <g
              key={`cust-${c.id}`}
              transform={`translate(${x}, ${y})`}
              opacity={opacity}
              style={{
                transition:
                  'transform 320ms cubic-bezier(0.22, 0.61, 0.36, 1), opacity 400ms ease-out',
                willChange: 'transform',
              }}
            >
              <circle
                r="13"
                fill={color}
                stroke="#c2410c"
                strokeWidth="1.3"
                opacity="0.92"
              />
              <text textAnchor="middle" y="5" fontSize="15">
                {avatarEmoji(c.stage)}
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
              {bubble && (
                <SpeechBubble
                  text={t(`playback:bubbles.${bubble.kind}` as const)}
                  opacity={bubble.opacity}
                />
              )}
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
}

function ZoneCard({ x, y, w, h, label, children }: ZoneCardProps) {
  return (
    <g>
      <rect
        x={x}
        y={y}
        width={w}
        height={h}
        rx="12"
        fill="#ffffff"
        stroke="#fed7aa"
        strokeWidth="1.2"
        opacity="0.85"
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
 * Pill-shaped speech bubble anchored above a customer. Width is fixed at
 * 60 px so the estimate-fit is good enough for short strings; opacity is
 * driven by the TTL sweep in replay.ts.
 */
function SpeechBubble({ text, opacity }: { text: string; opacity: number }) {
  return (
    <g opacity={opacity} style={{ transition: 'opacity 160ms ease-out' }}>
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
