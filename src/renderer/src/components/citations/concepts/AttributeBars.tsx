import ScriptedAnim from '../ScriptedAnim'

/**
 * Li et al. (2025) customer-attribute satisfaction visualization.
 *
 * Ambient: three bars (environment / price / service) grow to their
 * typical steady-state values; the customer face shows 😊.
 *
 * Scripted: service bar drops from high to low over 5s; watch the
 * customer face degrade from 😊 → 😐 → 😟 as the weighted sum of
 * attribute scores crosses each threshold.
 */

const VB_W = 320
const VB_H = 228
const BAR_Y = 80
const BAR_H = 80
const BAR_W = 32
const BAR_GAP = 20
const BARS_START_X = 50
const LABEL_Y_OFFSET = 14
const VALUE_Y_OFFSET = 28
const CAPTION_Y = VB_H - 8

interface Bar {
  key: string
  label: string
  color: string
  frac: number
}

function Frame({ bars, faceEmoji, caption }: {
  bars: Bar[]
  faceEmoji: string
  caption: string
}) {
  return (
    <svg viewBox={`0 0 ${VB_W} ${VB_H}`} className="w-full h-auto">
      <text
        x={VB_W / 2}
        y={26}
        textAnchor="middle"
        fontSize="13"
        fontWeight="700"
        fill="#7c2d12"
      >
        屬性 → 滿意度
      </text>
      <text
        x={VB_W / 2}
        y={44}
        textAnchor="middle"
        fontSize="12"
        fontWeight="500"
        fill="#7c2d12"
      >
        環境 / 價格 / 服務 加權得滿意度
      </text>

      {bars.map((b, i) => {
        const x = BARS_START_X + i * (BAR_W + BAR_GAP)
        const h = Math.max(2, b.frac * BAR_H)
        const y = BAR_Y + (BAR_H - h)
        return (
          <g key={b.key}>
            {/* Track */}
            <rect
              x={x}
              y={BAR_Y}
              width={BAR_W}
              height={BAR_H}
              rx="4"
              fill="#fef3c7"
              stroke="#f59e0b"
              strokeWidth="0.8"
              opacity="0.6"
            />
            {/* Fill */}
            <rect
              x={x}
              y={y}
              width={BAR_W}
              height={h}
              rx="4"
              fill={b.color}
              style={{
                transition: 'height 300ms ease-out, y 300ms ease-out',
              }}
            />
            <text
              x={x + BAR_W / 2}
              y={BAR_Y + BAR_H + LABEL_Y_OFFSET}
              textAnchor="middle"
              fontSize="9"
              fill="#7c2d12"
              fontWeight="700"
            >
              {b.label}
            </text>
            <text
              x={x + BAR_W / 2}
              y={BAR_Y + BAR_H + VALUE_Y_OFFSET}
              textAnchor="middle"
              fontSize="9"
              fill="#9a3412"
              className="tabular-nums"
            >
              {(b.frac * 100).toFixed(0)}
            </text>
          </g>
        )
      })}

      {/* Customer face on the right */}
      <g transform={`translate(${VB_W - 60}, ${BAR_Y + BAR_H / 2 + 6})`}>
        <circle r="24" fill="#fff7ed" stroke="#fb923c" strokeWidth="1.5" />
        <text textAnchor="middle" y="8" fontSize="26">
          {faceEmoji}
        </text>
      </g>

      <text
        x={VB_W / 2}
        y={CAPTION_Y}
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

function faceFor(avg: number): string {
  if (avg >= 0.7) return '😊'
  if (avg >= 0.45) return '😐'
  return '😟'
}

export function AttributeBarsAmbient() {
  const bars: Bar[] = [
    { key: 'env',     label: '環境', color: '#34d399', frac: 0.82 },
    { key: 'price',   label: '價格', color: '#60a5fa', frac: 0.65 },
    { key: 'service', label: '服務', color: '#f472b6', frac: 0.78 },
  ]
  const avg = bars.reduce((a, b) => a + b.frac, 0) / bars.length
  return (
    <Frame
      bars={bars.map((b) => ({ ...b }))}
      faceEmoji={faceFor(avg)}
      caption="三屬性平衡 → 顧客滿意"
    />
  )
}

export function AttributeBarsScripted({ duration = 5000, onDone }: {
  duration?: number
  onDone?: () => void
}) {
  // Service bar drops from 0.85 to 0.2 linearly; other bars stay put.
  return (
    <ScriptedAnim duration={duration} onDone={onDone}>
      {({ progress }) => {
        const serviceFrac = 0.85 - progress * 0.65
        const bars: Bar[] = [
          { key: 'env',     label: '環境', color: '#34d399', frac: 0.82 },
          { key: 'price',   label: '價格', color: '#60a5fa', frac: 0.65 },
          { key: 'service', label: '服務', color: '#f472b6', frac: serviceFrac },
        ]
        const avg = bars.reduce((a, b) => a + b.frac, 0) / bars.length
        return (
          <Frame
            bars={bars}
            faceEmoji={faceFor(avg)}
            caption={
              avg >= 0.7
                ? '服務還行，整體仍開心'
                : avg >= 0.45
                  ? '服務掉下去，臉色變了'
                  : '服務崩了，顧客不開心'
            }
          />
        )
      }}
    </ScriptedAnim>
  )
}
