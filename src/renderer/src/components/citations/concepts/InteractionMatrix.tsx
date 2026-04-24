import ScriptedAnim from '../ScriptedAnim'

/**
 * Hirsch 2025 Figure 6: 4 customer types × 4 interaction modes matrix.
 * Each cell shows how often that customer type produces that interaction
 * mode with cats. Higher = darker + larger emoji.
 *
 * Ambient: all 16 cells rendered at their steady-state probabilities,
 * with a soft flicker on the top-probability cells so the matrix reads
 * as "live."
 *
 * Scripted: 5 seconds walk through a single customer's interaction
 * over time: no_interaction → non_contact_attention → contact_attention.
 */

const VB_W = 360
const VB_H = 280
const CELL_W = 52
const CELL_H = 34
const MATRIX_X = 110
const MATRIX_Y = 80

type CustomerType = 'woman' | 'man' | 'girl' | 'boy'
type Mode = 'no_interaction' | 'no_attention' | 'non_contact' | 'contact'

const CUSTOMER_ROWS: { key: CustomerType; emoji: string; label: string }[] = [
  { key: 'woman', emoji: '👩', label: '女' },
  { key: 'man',   emoji: '🧔', label: '男' },
  { key: 'girl',  emoji: '👧', label: '女童' },
  { key: 'boy',   emoji: '👦', label: '男童' },
]

const MODE_COLS: { key: Mode; label: string; emoji: string }[] = [
  { key: 'no_interaction', label: 'no',      emoji: '—' },
  { key: 'no_attention',   label: 'passing', emoji: '🚶' },
  { key: 'non_contact',    label: 'look',    emoji: '👀' },
  { key: 'contact',        label: 'touch',   emoji: '✋' },
]

/** Hirsch 2025-style probabilities (0..1), stylised for legibility. */
const PROB: Record<CustomerType, Record<Mode, number>> = {
  woman: { no_interaction: 0.30, no_attention: 0.04, non_contact: 0.36, contact: 0.30 },
  man:   { no_interaction: 0.50, no_attention: 0.04, non_contact: 0.28, contact: 0.18 },
  girl:  { no_interaction: 0.42, no_attention: 0.02, non_contact: 0.30, contact: 0.26 },
  boy:   { no_interaction: 0.60, no_attention: 0.02, non_contact: 0.18, contact: 0.20 },
}

function cellFill(p: number, highlighted: boolean): string {
  // Map probability 0..1 → amber scale.
  const base = Math.round(230 - p * 110) // lighter when low, darker when high
  if (highlighted) return '#fb923c'
  return `rgb(${base}, ${base - 10}, ${Math.max(160, base - 40)})`
}

function Frame({
  highlightCell,
  caption,
  flicker,
}: {
  highlightCell: { row: CustomerType; col: Mode } | null
  caption: string
  flicker: boolean
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
        顧客類別 × 互動方式 (Hirsch Fig 6)
      </text>

      {/* Column headers. Lifted above the cells so the label text does
          not touch the top row (cells start at MATRIX_Y). */}
      {MODE_COLS.map((m, i) => (
        <g key={m.key} transform={`translate(${MATRIX_X + i * CELL_W + CELL_W / 2}, ${MATRIX_Y - 24})`}>
          <text textAnchor="middle" fontSize="11">{m.emoji}</text>
          <text textAnchor="middle" fontSize="8" fill="#7c2d12" y="12">{m.label}</text>
        </g>
      ))}

      {/* Row headers + cells */}
      {CUSTOMER_ROWS.map((r, rowIdx) => (
        <g key={r.key}>
          <g transform={`translate(${MATRIX_X - 36}, ${MATRIX_Y + rowIdx * CELL_H + CELL_H / 2})`}>
            <text fontSize="18" textAnchor="middle" y="5">{r.emoji}</text>
            <text fontSize="8" fill="#7c2d12" textAnchor="middle" y="18">{r.label}</text>
          </g>
          {MODE_COLS.map((m, colIdx) => {
            const p = PROB[r.key][m.key]
            const highlighted =
              highlightCell?.row === r.key && highlightCell.col === m.key
            // Cells with prob >= 0.25 get a subtle flicker in ambient mode.
            const isHot = p >= 0.25
            const classNames =
              flicker && isHot && !highlighted ? 'neko-matrix-flicker' : undefined
            return (
              <g
                key={m.key}
                transform={`translate(${MATRIX_X + colIdx * CELL_W}, ${MATRIX_Y + rowIdx * CELL_H})`}
                className={classNames}
                style={
                  classNames
                    ? { animationDelay: `${(rowIdx + colIdx) * 180}ms` }
                    : undefined
                }
              >
                <rect
                  width={CELL_W - 3}
                  height={CELL_H - 3}
                  rx="4"
                  fill={cellFill(p, highlighted)}
                  stroke={highlighted ? '#7c2d12' : '#fb923c'}
                  strokeWidth={highlighted ? 1.5 : 0.4}
                  opacity={highlighted ? 1 : 0.85}
                />
                <text
                  x={(CELL_W - 3) / 2}
                  y={(CELL_H - 3) / 2 + 4}
                  textAnchor="middle"
                  fontSize="10"
                  fontWeight={highlighted ? '700' : '500'}
                  fill={highlighted ? '#ffffff' : '#7c2d12'}
                  className="tabular-nums"
                >
                  {(p * 100).toFixed(0)}%
                </text>
              </g>
            )
          })}
        </g>
      ))}

      <text
        x={VB_W / 2}
        y={VB_H - 8}
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

export function InteractionMatrixAmbient() {
  return (
    <Frame
      highlightCell={null}
      caption="格子越深 = 該組合發生頻率越高"
      flicker
    />
  )
}

export function InteractionMatrixScripted({ duration = 5000, onDone }: {
  duration?: number
  onDone?: () => void
}) {
  // 3 phases highlighting one cell at a time for a "woman" customer:
  //   0.0-2.0s : no_interaction highlighted
  //   2.0-3.5s : non_contact highlighted
  //   3.5-5.0s : contact highlighted
  return (
    <ScriptedAnim duration={duration} onDone={onDone}>
      {({ progress }) => {
        const t = progress * duration
        let col: Mode = 'no_interaction'
        let caption = '0:00 顧客剛入座，沒互動'
        if (t > 3500) {
          col = 'contact'
          caption = '3:30 顧客開始摸貓 (contact)'
        } else if (t > 2000) {
          col = 'non_contact'
          caption = '2:00 顧客注意到貓，但還沒摸 (non-contact)'
        }
        return (
          <Frame
            highlightCell={{ row: 'woman', col }}
            caption={caption}
            flicker={false}
          />
        )
      }}
    </ScriptedAnim>
  )
}
