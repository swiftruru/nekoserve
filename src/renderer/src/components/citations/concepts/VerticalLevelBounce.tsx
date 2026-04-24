import ScriptedAnim from '../ScriptedAnim'

/**
 * Hirsch 2025 Figure 4b: cats use the floor / furniture / shelf
 * vertical space differently as customer occupancy rises. Low
 * occupancy → cats sit on floor / furniture; high occupancy → cats
 * flee upward to shelves.
 *
 * Ambient: three horizontal bands with a cat sprite hopping between
 * them, steady-state centered on "furniture."
 *
 * Scripted: occupancy slider ramps from 0.2 to 0.9; watch the cat
 * migrate from floor to shelf as customer count climbs.
 */

const VB_W = 320
const VB_H = 200
const BAND_H = 40
const BAND_Y: Record<Level, number> = {
  shelf: 50,
  furniture: 100,
  floor: 150,
}
// Placed at roughly mid-band (band spans x=30..240) so the left-edge
// SHELF / FURNITURE / FLOOR text labels stay clear of the cat sprite.
const CAT_X = 150

type Level = 'shelf' | 'furniture' | 'floor'
const LEVELS: Level[] = ['shelf', 'furniture', 'floor']

function levelForOccupancy(occ: number): Level {
  // Probabilities from Hirsch 2025 Figure 4b (stylised): at low occ
  // floor dominates, at high occ shelf dominates. We map the scalar
  // occupancy to a deterministic level for the animation so the cat
  // reads as moving purposefully rather than jittering.
  if (occ < 0.35) return 'floor'
  if (occ < 0.7) return 'furniture'
  return 'shelf'
}

function Frame({
  occupancy,
  catLevel,
  customerCount,
  caption,
  ambient,
}: {
  occupancy: number
  catLevel: Level
  customerCount: number
  caption: string
  ambient: boolean
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
        垂直層級隨擁擠度遷移
      </text>

      {/* Bands */}
      {LEVELS.map((lvl) => (
        <g key={lvl}>
          <rect
            x={30}
            y={BAND_Y[lvl] - BAND_H / 2}
            width={VB_W - 110}
            height={BAND_H}
            rx="8"
            fill={
              lvl === 'shelf'
                ? '#fef3c7'
                : lvl === 'furniture'
                  ? '#fde68a'
                  : '#fbd38d'
            }
            stroke="#f59e0b"
            strokeWidth="1"
            opacity="0.65"
          />
          <text
            x={34}
            y={BAND_Y[lvl] + 4}
            fontSize="10"
            fontWeight="700"
            fill="#7c2d12"
          >
            {lvl.toUpperCase()}
          </text>
        </g>
      ))}

      {/* Cat sprite.
          Outer <g> carries the SVG transform attribute for positioning,
          inner <g> carries the CSS animation class. CSS transform would
          otherwise override the SVG transform and collapse the cat to
          (0, 0). */}
      <g
        transform={`translate(${CAT_X}, ${BAND_Y[catLevel]})`}
        style={ambient ? undefined : { transition: 'transform 450ms cubic-bezier(0.34, 1.56, 0.64, 1)' }}
      >
        <g className={ambient ? 'neko-shelf-hop' : undefined}>
          <circle r="14" fill="#fff7ed" stroke="#c2410c" strokeWidth="1.5" />
          <text textAnchor="middle" y="5" fontSize="16">🐈</text>
        </g>
      </g>

      {/* Occupancy meter on the right */}
      <g transform={`translate(${VB_W - 60}, 50)`}>
        <text x={20} y={-4} textAnchor="middle" fontSize="9" fontWeight="700" fill="#7c2d12">
          occupancy
        </text>
        <rect width={40} height={100} rx="4" fill="#fee2e2" stroke="#ef4444" strokeWidth="0.8" />
        <rect
          y={100 - occupancy * 100}
          width={40}
          height={occupancy * 100}
          rx="4"
          fill="#ef4444"
          style={{ transition: 'height 320ms ease-out, y 320ms ease-out' }}
        />
        <text x={20} y={116} textAnchor="middle" fontSize="9" fill="#7c2d12" className="tabular-nums">
          {Math.round(occupancy * 100)}%
        </text>
        <text x={20} y={128} textAnchor="middle" fontSize="8" fill="#9a3412">
          ≈ {customerCount} 人
        </text>
      </g>

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

export function VerticalLevelAmbient() {
  return (
    <Frame
      occupancy={0.5}
      catLevel="furniture"
      customerCount={15}
      caption="中等擁擠 → 貓偏好 furniture"
      ambient
    />
  )
}

export function VerticalLevelScripted({ duration = 5000, onDone }: {
  duration?: number
  onDone?: () => void
}) {
  return (
    <ScriptedAnim duration={duration} onDone={onDone}>
      {({ progress }) => {
        const occ = 0.2 + progress * 0.7
        const catLevel = levelForOccupancy(occ)
        const customerCount = Math.round(occ * 30)
        return (
          <Frame
            occupancy={occ}
            catLevel={catLevel}
            customerCount={customerCount}
            caption={
              catLevel === 'shelf'
                ? '太擠了，貓逃上書架'
                : catLevel === 'furniture'
                  ? '中等擁擠，貓跳上家具'
                  : '還不擠，貓在地板懶著'
            }
            ambient={false}
          />
        )
      }}
    </ScriptedAnim>
  )
}
