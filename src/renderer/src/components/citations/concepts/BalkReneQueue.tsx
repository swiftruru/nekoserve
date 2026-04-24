import ScriptedAnim from '../ScriptedAnim'

/**
 * Balking vs reneging visualization.
 *
 * Ambient: a queue of five dots waits; the newest arrival occasionally
 * balks (hops back out at the tail), while an older one occasionally
 * reneges (greys out and slides off to the right). Purely decorative.
 *
 * Scripted: a 2-second "inflow burst" drops six arrivals into the
 * queue, then shows one specific customer balking (📛) and one
 * specific customer reneging (😤), so the reader can see the two
 * concepts as distinct events happening to different people.
 */

const VB_W = 360
const VB_H = 160
const QUEUE_BASE_X = 50
const QUEUE_Y = 100
const SLOT_W = 34

function QueueFrame({ children }: { children: React.ReactNode }) {
  return (
    <svg viewBox={`0 0 ${VB_W} ${VB_H}`} className="w-full h-auto">
      {/* Door icon on the left */}
      <text x={20} y={110} fontSize="20">🚪</text>
      {/* Counter icon on the right */}
      <text x={VB_W - 28} y={110} fontSize="20">🧋</text>
      {/* Queue lane */}
      <rect
        x={40}
        y={85}
        width={VB_W - 80}
        height={30}
        rx="6"
        fill="#fef3c7"
        stroke="#f59e0b"
        strokeWidth="1"
        strokeDasharray="3,3"
        opacity="0.5"
      />
      {/* Titles */}
      <text x={VB_W / 2} y={40} textAnchor="middle" fontSize="13" fontWeight="700" fill="#7c2d12">
        Balking vs Reneging
      </text>
      <text x={VB_W / 2} y={60} textAnchor="middle" fontSize="12" fontWeight="500" fill="#7c2d12">
        進來前就不排 vs 排一半放棄
      </text>
      {children}
    </svg>
  )
}

interface Dot {
  emoji: string
  color: string
  /** Grid slot, 0 = closest to counter. */
  slot: number
  state: 'queued' | 'balking' | 'reneging'
}

function Dot({ dot, key: _k }: { dot: Dot; key?: string }) {
  const x = QUEUE_BASE_X + dot.slot * SLOT_W
  const cls =
    dot.state === 'balking'
      ? 'neko-balk-turn'
      : dot.state === 'reneging'
        ? 'neko-queue-fade'
        : undefined
  // Outer <g> carries the SVG positioning transform, inner <g> carries
  // the CSS animation class. Without this split, CSS `transform:
  // translateX(...)` in the keyframes would overwrite the SVG
  // `transform="translate(x, QUEUE_Y)"` attribute and drop the dot at
  // (0, 0) instead of its queue slot.
  return (
    <g transform={`translate(${x}, ${QUEUE_Y})`}>
      <g className={cls}>
        <circle r="11" fill={dot.color} stroke="#7c2d12" strokeWidth="1" />
        <text textAnchor="middle" y="4" fontSize="12">{dot.emoji}</text>
      </g>
    </g>
  )
}

export function BalkReneAmbient() {
  // Deterministic repeating cycle. Mount time drives which dots are
  // "currently leaving" through the class name toggle. Five slots
  // always painted; on re-renders we just vary which one is fading.
  const dots: Dot[] = [
    { emoji: '🧑', color: '#fde68a', slot: 0, state: 'queued' },
    { emoji: '👩', color: '#fde68a', slot: 1, state: 'queued' },
    { emoji: '🧔', color: '#fde68a', slot: 2, state: 'reneging' },
    { emoji: '👧', color: '#fde68a', slot: 3, state: 'queued' },
    { emoji: '👨', color: '#fde68a', slot: 4, state: 'balking' },
  ]
  return (
    <QueueFrame>
      {dots.map((d, i) => (
        <Dot dot={d} key={`ambient-${i}`} />
      ))}
    </QueueFrame>
  )
}

export function BalkReneScripted({ duration = 5000, onDone }: {
  duration?: number
  onDone?: () => void
}) {
  // Timeline:
  //   0.0s - 1.6s: 6 arrivals drop into slots 0..5 one after another
  //   1.8s       : slot-5 (newest) balks (hops back, we're too full)
  //   3.0s       : slot-3 reneges (grey slide off)
  //   4.0s+      : show labels
  return (
    <ScriptedAnim duration={duration} onDone={onDone}>
      {({ progress }) => {
        const tMs = progress * duration
        const arrivals: number[] = []
        for (let i = 0; i < 6; i++) {
          if (tMs > i * 270) arrivals.push(i)
        }
        const slot5Balked = tMs > 1800
        const slot3Reneged = tMs > 3000
        return (
          <QueueFrame>
            {arrivals.map((slot) => {
              let state: Dot['state'] = 'queued'
              if (slot === 5 && slot5Balked) state = 'balking'
              if (slot === 3 && slot3Reneged) state = 'reneging'
              return (
                <Dot
                  key={`s-${slot}`}
                  dot={{
                    emoji: ['🧑', '👩', '🧔', '👧', '👨', '🧑‍🦰'][slot] ?? '🙂',
                    color: '#fde68a',
                    slot,
                    state,
                  }}
                />
              )
            })}

            {tMs > 2200 && (
              <text
                x={QUEUE_BASE_X + 5 * SLOT_W}
                y={QUEUE_Y - 24}
                textAnchor="middle"
                fontSize="10"
                fill="#dc2626"
                fontWeight="700"
              >
                balk
              </text>
            )}
            {tMs > 3300 && (
              <text
                x={QUEUE_BASE_X + 3 * SLOT_W}
                y={QUEUE_Y + 28}
                textAnchor="middle"
                fontSize="10"
                fill="#dc2626"
                fontWeight="700"
              >
                renege
              </text>
            )}
          </QueueFrame>
        )
      }}
    </ScriptedAnim>
  )
}
