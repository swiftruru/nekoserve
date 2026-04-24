import { useState, useEffect } from 'react'
import ScriptedAnim from '../ScriptedAnim'

/**
 * Little's Law (L = λ·W) visualization.
 *
 * Ambient: the λ value and W value bubble gently, with L recomputed
 * live so the identity always reads as balanced.
 *
 * Scripted: λ ramps from 0.5 to 2.0 over 5 seconds while W stays at a
 * constant 10 minutes; the reader watches L grow linearly from 5 to 20,
 * proving that L scales 1:1 with λ when W is held fixed. This is the
 * pedagogical punch of Little (1961) in one look.
 */

const VB_W = 360
const VB_H = 220

function Dial({ label, value, unit, x, y, pulse }: {
  label: string
  value: string
  unit: string
  x: number
  y: number
  pulse?: boolean
}) {
  return (
    <g transform={`translate(${x}, ${y})`}>
      <circle
        r="36"
        fill="#fff7ed"
        stroke="#fb923c"
        strokeWidth="1.5"
        className={pulse ? 'neko-dial-pulse' : undefined}
      />
      <text
        y="-10"
        textAnchor="middle"
        fontSize="10"
        fill="#9a3412"
        fontWeight="700"
        letterSpacing="1"
      >
        {label}
      </text>
      <text
        y="10"
        textAnchor="middle"
        fontSize="18"
        fill="#7c2d12"
        fontWeight="700"
        className="tabular-nums"
      >
        {value}
      </text>
      <text
        y="24"
        textAnchor="middle"
        fontSize="8"
        fill="#9a3412"
      >
        {unit}
      </text>
    </g>
  )
}

function Frame({ lambda, w, l, hint }: {
  lambda: number
  w: number
  l: number
  hint: string
}) {
  return (
    <svg viewBox={`0 0 ${VB_W} ${VB_H}`} className="w-full h-auto">
      <Dial label="λ" value={lambda.toFixed(2)} unit="人/分" x={60}  y={110} pulse />
      <Dial label="W" value={w.toFixed(1)}     unit="分"   x={180} y={110} />
      <Dial label="L" value={l.toFixed(1)}     unit="人"   x={300} y={110} pulse />

      {/* Multiplication / equality operators */}
      <text x={120} y={115} textAnchor="middle" fontSize="20" fill="#c2410c">×</text>
      <text x={240} y={115} textAnchor="middle" fontSize="20" fill="#c2410c">=</text>

      {/* Formula label */}
      <text
        x={VB_W / 2}
        y={40}
        textAnchor="middle"
        fontSize="14"
        fill="#7c2d12"
        fontWeight="700"
        fontFamily="ui-monospace, monospace"
      >
        L = λ · W
      </text>

      {/* Live caption */}
      <text
        x={VB_W / 2}
        y={190}
        textAnchor="middle"
        fontSize="13"
        fontWeight="500"
        fill="#4b5563"
        fontStyle="italic"
      >
        {hint}
      </text>
    </svg>
  )
}

export function LittlesLawAmbient() {
  // Gentle ambient wobble: λ oscillates around 1.0, W around 12 min.
  const [t, setT] = useState(0)
  useEffect(() => {
    const id = window.setInterval(() => setT((n) => n + 1), 1000)
    return () => window.clearInterval(id)
  }, [])
  const lambda = 1.0 + 0.15 * Math.sin(t * 0.5)
  const w = 12 + 1.5 * Math.cos(t * 0.4)
  const l = lambda * w
  return <Frame lambda={lambda} w={w} l={l} hint="L, λ, W 會同步跳動" />
}

export function LittlesLawScripted({ duration = 5000, onDone }: {
  duration?: number
  onDone?: () => void
}) {
  return (
    <ScriptedAnim duration={duration} onDone={onDone}>
      {({ progress }) => {
        // λ ramps 0.5 → 2.0; W held fixed at 10. L tracks λ·W.
        const lambda = 0.5 + progress * 1.5
        const w = 10
        const l = lambda * w
        return (
          <Frame
            lambda={lambda}
            w={w}
            l={l}
            hint={`λ 由 0.5 拉到 2.0；W 固定 10 分；L 從 ${(0.5 * 10).toFixed(0)} 長到 ${(2 * 10).toFixed(0)}`}
          />
        )
      }}
    </ScriptedAnim>
  )
}
