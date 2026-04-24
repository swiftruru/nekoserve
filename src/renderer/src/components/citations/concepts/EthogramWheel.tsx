import ScriptedAnim from '../ScriptedAnim'

/**
 * Hirsch et al. (2025) 9-state cat ethogram wheel.
 *
 * Ambient: the 9 sectors are drawn proportionally to the Hirsch 2025
 * measured frequencies, with a slowly rotating indicator pointer so it
 * reads as a live dial.
 *
 * Scripted: a cat sprite walks through the 9 states one by one,
 * labeled in sequence, dwell time scaled so popular states hold the
 * pointer longer.
 */

const VB_W = 320
const VB_H = 270
const CX = VB_W / 2
const CY = 130
const R_OUTER = 90
const R_INNER = 30

interface StateInfo {
  key: string
  label: string
  pct: number
  color: string
  emoji: string
}

/** Source: Hirsch 2025 Table 2 (rounded to whole % for display). */
const STATES: StateInfo[] = [
  { key: 'out',       label: 'OUT',        pct: 31.6, color: '#d4d4d8', emoji: '🚪' },
  { key: 'resting',   label: 'REST',       pct: 31.7, color: '#a7f3d0', emoji: '😴' },
  { key: 'socialize', label: 'SOCIAL',     pct: 12.8, color: '#fde68a', emoji: '🧑' },
  { key: 'hidden',    label: 'HIDE',       pct: 10.7, color: '#94a3b8', emoji: '🫣' },
  { key: 'alert',     label: 'ALERT',      pct: 4.9,  color: '#fca5a5', emoji: '👀' },
  { key: 'groom',     label: 'GROOM',      pct: 4.5,  color: '#c4b5fd', emoji: '🧼' },
  { key: 'move',      label: 'MOVE',       pct: 2.7,  color: '#fdba74', emoji: '🏃' },
  { key: 'explore',   label: 'EXPLORE',    pct: 0.8,  color: '#6ee7b7', emoji: '🔍' },
  { key: 'play',      label: 'PLAY',       pct: 0.3,  color: '#f9a8d4', emoji: '🧶' },
]

/** Polar to cartesian helper; angle is in radians, 0 = 12 o'clock. */
function p(angle: number, r: number) {
  const a = angle - Math.PI / 2
  return { x: CX + r * Math.cos(a), y: CY + r * Math.sin(a) }
}

function sectorPath(startFrac: number, endFrac: number): string {
  const a0 = startFrac * Math.PI * 2
  const a1 = endFrac * Math.PI * 2
  const outerStart = p(a0, R_OUTER)
  const outerEnd = p(a1, R_OUTER)
  const innerEnd = p(a1, R_INNER)
  const innerStart = p(a0, R_INNER)
  const large = endFrac - startFrac > 0.5 ? 1 : 0
  return [
    `M ${outerStart.x} ${outerStart.y}`,
    `A ${R_OUTER} ${R_OUTER} 0 ${large} 1 ${outerEnd.x} ${outerEnd.y}`,
    `L ${innerEnd.x} ${innerEnd.y}`,
    `A ${R_INNER} ${R_INNER} 0 ${large} 0 ${innerStart.x} ${innerStart.y}`,
    'Z',
  ].join(' ')
}

function Frame({
  pointerFrac,
  active,
  caption,
  spinning,
}: {
  pointerFrac: number
  active: StateInfo | null
  caption: string
  spinning: boolean
}) {
  let cumulative = 0
  const total = STATES.reduce((a, b) => a + b.pct, 0)

  return (
    <svg viewBox={`0 0 ${VB_W} ${VB_H}`} className="w-full h-auto">
      <text
        x={VB_W / 2}
        y={24}
        textAnchor="middle"
        fontSize="13"
        fontWeight="700"
        fill="#7c2d12"
      >
        Hirsch 2025 · 9 狀態 Ethogram
      </text>

      {/* Donut sectors */}
      {STATES.map((s) => {
        const startFrac = cumulative / total
        cumulative += s.pct
        const endFrac = cumulative / total
        const isActive = active?.key === s.key
        return (
          <path
            key={s.key}
            d={sectorPath(startFrac, endFrac)}
            fill={s.color}
            stroke={isActive ? '#7c2d12' : '#ffffff'}
            strokeWidth={isActive ? 2 : 1}
            opacity={active && !isActive ? 0.45 : 1}
            style={{ transition: 'opacity 240ms ease-out' }}
          />
        )
      })}

      {/* Pointer. Outer <g> translates to wheel center so geometry is
          drawn relative to (0, 0). Inner <g> applies the CSS rotation,
          whose transform-origin = own box center = (0, 0) regardless of
          view-box, so ambient spin and scripted rotate pivot on the
          actual wheel hub instead of drifting off to the view-box
          center. */}
      <g transform={`translate(${CX}, ${CY})`}>
        <g
          className={spinning ? 'neko-wheel-tick' : undefined}
          style={
            spinning
              ? undefined
              : {
                  transform: `rotate(${pointerFrac * 360}deg)`,
                  transition: 'transform 260ms ease-out',
                }
          }
        >
          <line
            x1={0}
            y1={0}
            x2={0}
            y2={-R_OUTER - 4}
            stroke="#7c2d12"
            strokeWidth="2"
            strokeLinecap="round"
          />
          <circle cx={0} cy={-R_OUTER - 4} r="3" fill="#fb923c" stroke="#7c2d12" strokeWidth="1" />
        </g>
      </g>

      {/* Hub with active-state label */}
      <circle cx={CX} cy={CY} r={R_INNER - 2} fill="#fff7ed" stroke="#fb923c" strokeWidth="1.5" />
      <text
        x={CX}
        y={CY + 4}
        textAnchor="middle"
        fontSize="14"
      >
        {active ? active.emoji : '🐈'}
      </text>

      <text
        x={VB_W / 2}
        y={VB_H - 10}
        textAnchor="middle"
        fontSize="13"
        fontWeight="500"
        fill="#4b5563"
        fontStyle="italic"
      >
        {caption}
      </text>
    </svg>
  )
}

export function EthogramAmbient() {
  return (
    <Frame
      pointerFrac={0}
      active={null}
      caption="扇形大小 = 該狀態占觀察時間的比例"
      spinning
    />
  )
}

export function EthogramScripted({ duration = 5000, onDone }: {
  duration?: number
  onDone?: () => void
}) {
  // Step through states, dwelling proportional to their pct so the most
  // common states feel dominant. Skips OUT / HIDE (not interesting to
  // show as a dwelling animation) to save screen time.
  const sequence = STATES.filter((s) => s.key !== 'out' && s.key !== 'hidden')
  const totalWeight = sequence.reduce((a, b) => a + b.pct, 0)
  const segments = sequence.map((s, i) => {
    const prev = sequence.slice(0, i).reduce((a, b) => a + b.pct, 0)
    return {
      info: s,
      tStart: prev / totalWeight,
      tEnd: (prev + s.pct) / totalWeight,
    }
  })

  return (
    <ScriptedAnim duration={duration} onDone={onDone}>
      {({ progress }) => {
        const seg = segments.find((s) => progress >= s.tStart && progress <= s.tEnd)
          ?? segments[segments.length - 1]
        // Pointer points at the START of the CURRENT state's sector,
        // not the whole wheel's fraction.
        let cumulative = 0
        const total = STATES.reduce((a, b) => a + b.pct, 0)
        let pointerFrac = 0
        for (const s of STATES) {
          if (s.key === seg.info.key) {
            pointerFrac = (cumulative + s.pct / 2) / total
            break
          }
          cumulative += s.pct
        }
        return (
          <Frame
            pointerFrac={pointerFrac}
            active={seg.info}
            caption={`當下：${seg.info.label} (${seg.info.pct.toFixed(1)}%)`}
            spinning={false}
          />
        )
      }}
    </ScriptedAnim>
  )
}
