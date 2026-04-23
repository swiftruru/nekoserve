import ScriptedAnim from '../ScriptedAnim'

/**
 * Cat welfare sub-indicator bars (Ropski 2023 + Hirsch 2025 welfare
 * extension). Five behaviors; play/explore/maintain are "higher is
 * better" (green), hiding/alert are "lower is better" (red).
 *
 * Ambient: baseline healthy-café configuration.
 *
 * Scripted: 5s crossfade from "low-occupancy happy café" to
 * "high-occupancy stressful café": green bars shrink, red bars grow.
 */

const VB_W = 360
const VB_H = 200
const BAR_Y = 60
const BAR_H = 90
const BAR_W = 30
const BAR_GAP = 22
const BARS_START_X = 50

type Polarity = 'good' | 'bad'
interface Bar {
  key: string
  label: string
  polarity: Polarity
  frac: number
}

function Frame({ bars, caption, scenarioLabel }: {
  bars: readonly Bar[]
  caption: string
  scenarioLabel: string
}) {
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
        貓咪福祉五項指標
      </text>
      <text
        x={VB_W / 2}
        y={40}
        textAnchor="middle"
        fontSize="10"
        fill="#9a3412"
      >
        綠 = 越高越好、紅 = 越低越好
      </text>

      {/* Scenario badge top-right */}
      <g transform={`translate(${VB_W - 90}, 30)`}>
        <rect
          width={80}
          height={20}
          rx="10"
          fill="#fff7ed"
          stroke="#fb923c"
          strokeWidth="1"
        />
        <text x="40" y="14" textAnchor="middle" fontSize="10" fill="#7c2d12" fontWeight="700">
          {scenarioLabel}
        </text>
      </g>

      {bars.map((b, i) => {
        const x = BARS_START_X + i * (BAR_W + BAR_GAP)
        const h = Math.max(2, b.frac * BAR_H)
        const y = BAR_Y + (BAR_H - h)
        const color = b.polarity === 'good' ? '#34d399' : '#f87171'
        return (
          <g key={b.key}>
            <rect
              x={x}
              y={BAR_Y}
              width={BAR_W}
              height={BAR_H}
              rx="4"
              fill="#f3f4f6"
              stroke={color}
              strokeWidth="0.6"
              opacity="0.55"
            />
            <rect
              x={x}
              y={y}
              width={BAR_W}
              height={h}
              rx="4"
              fill={color}
              style={{ transition: 'height 400ms ease-out, y 400ms ease-out' }}
            />
            <text
              x={x + BAR_W / 2}
              y={BAR_Y + BAR_H + 14}
              textAnchor="middle"
              fontSize="9"
              fill="#7c2d12"
              fontWeight="700"
            >
              {b.label}
            </text>
            <text
              x={x + BAR_W / 2}
              y={BAR_Y + BAR_H + 26}
              textAnchor="middle"
              fontSize="8"
              fill={b.polarity === 'good' ? '#047857' : '#b91c1c'}
            >
              {b.polarity === 'good' ? '↑好' : '↓好'}
            </text>
          </g>
        )
      })}

      <text
        x={VB_W / 2}
        y={VB_H - 8}
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

const GOOD_SCENARIO: Bar[] = [
  { key: 'play',     label: '玩耍', polarity: 'good', frac: 0.75 },
  { key: 'explore',  label: '探索', polarity: 'good', frac: 0.65 },
  { key: 'maintain', label: '整理', polarity: 'good', frac: 0.80 },
  { key: 'hide',     label: '躲藏', polarity: 'bad',  frac: 0.20 },
  { key: 'alert',    label: '警戒', polarity: 'bad',  frac: 0.15 },
]

const BAD_SCENARIO: Bar[] = [
  { key: 'play',     label: '玩耍', polarity: 'good', frac: 0.10 },
  { key: 'explore',  label: '探索', polarity: 'good', frac: 0.15 },
  { key: 'maintain', label: '整理', polarity: 'good', frac: 0.25 },
  { key: 'hide',     label: '躲藏', polarity: 'bad',  frac: 0.75 },
  { key: 'alert',    label: '警戒', polarity: 'bad',  frac: 0.70 },
]

function lerpBars(a: readonly Bar[], b: readonly Bar[], t: number): Bar[] {
  return a.map((bar, i) => ({
    ...bar,
    frac: bar.frac + (b[i].frac - bar.frac) * t,
  }))
}

export function WelfareBarsAmbient() {
  return (
    <Frame
      bars={GOOD_SCENARIO}
      caption="低擁擠場景：貓玩得開心、很少躲藏"
      scenarioLabel="low occ"
    />
  )
}

export function WelfareBarsScripted({ duration = 5000, onDone }: {
  duration?: number
  onDone?: () => void
}) {
  return (
    <ScriptedAnim duration={duration} onDone={onDone}>
      {({ progress }) => {
        const bars = lerpBars(GOOD_SCENARIO, BAD_SCENARIO, progress)
        const scenarioLabel = progress < 0.5 ? 'low occ' : 'high occ'
        const caption =
          progress < 0.3
            ? '低擁擠：綠長紅短，貓過得好'
            : progress < 0.7
              ? '擁擠度爬升：綠縮、紅長'
              : '高擁擠：紅反超綠，貓需要喘息'
        return <Frame bars={bars} caption={caption} scenarioLabel={scenarioLabel} />
      }}
    </ScriptedAnim>
  )
}
