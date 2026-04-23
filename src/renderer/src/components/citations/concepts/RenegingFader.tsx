import ScriptedAnim from '../ScriptedAnim'

/**
 * Reneging visualization (Dbeis & Al-Sahili 2024).
 *
 * Ambient: a single customer stands in queue with a clock ticking down
 * from maxWait (represented as a shrinking progress ring). When the
 * ring empties they fade grey and slide out with a 🚶‍♀️💨 bubble.
 *
 * Scripted: the same clock ticks visibly, with timestamps annotated
 * ("0:00 arrived", "2:00 losing patience", "3:00 left"), so the reader
 * sees that reneging isn't instant — it's a threshold crossing.
 */

const VB_W = 300
const VB_H = 180
const CX = 100
const CY = 100
const R = 38
const TWO_PI = Math.PI * 2

function ArcPath(startFrac: number, endFrac: number): string {
  // Circle arc from startFrac to endFrac (0..1 going clockwise from 12).
  const start = startFrac * TWO_PI - Math.PI / 2
  const end = endFrac * TWO_PI - Math.PI / 2
  const x1 = CX + R * Math.cos(start)
  const y1 = CY + R * Math.sin(start)
  const x2 = CX + R * Math.cos(end)
  const y2 = CY + R * Math.sin(end)
  const large = endFrac - startFrac > 0.5 ? 1 : 0
  return `M ${x1} ${y1} A ${R} ${R} 0 ${large} 1 ${x2} ${y2}`
}

function Frame({
  remainingFrac,
  faded,
  caption,
}: {
  remainingFrac: number
  faded: boolean
  caption: string
}) {
  const arcEnd = Math.max(0, remainingFrac)
  return (
    <svg viewBox={`0 0 ${VB_W} ${VB_H}`} className="w-full h-auto">
      <text
        x={VB_W / 2}
        y={28}
        textAnchor="middle"
        fontSize="13"
        fontWeight="700"
        fill="#7c2d12"
      >
        reneging：有耐性極限
      </text>

      {/* Patience ring */}
      <circle
        cx={CX}
        cy={CY}
        r={R}
        fill="none"
        stroke="#fee2e2"
        strokeWidth="6"
      />
      {arcEnd > 0 && (
        <path
          d={ArcPath(0, arcEnd)}
          stroke="#ef4444"
          strokeWidth="6"
          fill="none"
          strokeLinecap="round"
        />
      )}
      {/* Customer avatar */}
      <text
        x={CX}
        y={CY + 6}
        textAnchor="middle"
        fontSize="28"
        style={{
          transition: 'transform 400ms ease-out, filter 400ms ease-out, opacity 400ms ease-out',
          transform: faded ? `translateX(40px)` : undefined,
          filter: faded ? 'grayscale(1)' : undefined,
          opacity: faded ? 0.3 : 1,
        }}
      >
        🧑
      </text>

      {faded && (
        <text
          x={CX + 60}
          y={CY - 10}
          textAnchor="start"
          fontSize="12"
          fill="#6b7280"
          fontStyle="italic"
        >
          「下次再來吧」
        </text>
      )}

      {/* Label on the right */}
      <g transform={`translate(200, 70)`}>
        <text fontSize="11" fill="#7c2d12" fontWeight="700">maxWait</text>
        <text y="18" fontSize="10" fill="#9a3412">耐心耗盡就走</text>
        <text y="34" fontSize="10" fill="#9a3412">= reneging</text>
      </g>

      <text
        x={VB_W / 2}
        y={VB_H - 12}
        textAnchor="middle"
        fontSize="10"
        fill="#6b7280"
        fontStyle="italic"
      >
        {caption}
      </text>
    </svg>
  )
}

export function RenegingFaderAmbient() {
  // Ambient uses a looping CSS-like cycle via progress: compute from a
  // sawtooth function. We don't need useState for this; the animated
  // children rely on their own transitions on the `faded` boolean.
  // Keep it simple: snapshot at progress = 0.4 remaining, not faded.
  return (
    <Frame
      remainingFrac={0.55}
      faded={false}
      caption="紅色弧 = 還剩下多少耐心"
    />
  )
}

export function RenegingFaderScripted({ duration = 5000, onDone }: {
  duration?: number
  onDone?: () => void
}) {
  // Timeline (5s total):
  //   0.0s  : full ring, arrived
  //   0-3.0s: ring drains linearly
  //   3.0s  : patience exhausted, fade out
  return (
    <ScriptedAnim duration={duration} onDone={onDone}>
      {({ progress }) => {
        const t = progress * duration
        const drainEnd = (duration * 3) / 5 // 3 out of 5 seconds
        const remaining =
          t < drainEnd ? 1 - t / drainEnd : 0
        const faded = t >= drainEnd
        const caption = faded
          ? '3:00 耐心耗盡，reneging 出隊'
          : t < 500
            ? '0:00 剛到，滿格耐心'
            : t < drainEnd - 500
              ? `${formatMmSs(t, drainEnd)} 等待中…`
              : `${formatMmSs(t, drainEnd)} 忍不住了…`
        return <Frame remainingFrac={remaining} faded={faded} caption={caption} />
      }}
    </ScriptedAnim>
  )
}

function formatMmSs(t: number, totalWait: number): string {
  // Map scripted timeline t in [0..totalWait] onto a synthetic 0:00-3:00 clock.
  const clampedT = Math.min(t, totalWait)
  const totalSeconds = (clampedT / totalWait) * 180 // 3 minutes
  const m = Math.floor(totalSeconds / 60)
  const s = Math.floor(totalSeconds % 60)
  return `${m}:${s.toString().padStart(2, '0')}`
}
