import { useEffect, useMemo, useState } from 'react'
import ScriptedAnim from '../ScriptedAnim'

/**
 * Poisson arrival visualization.
 *
 * Ambient: a fixed sequence of customer emojis falls through the door
 * at pre-sampled Exp(λ) intervals. The sequence loops so the ambient
 * card stays lively without reseeding.
 *
 * Scripted: 30 customers compressed into 5 seconds at λ = 6/sec,
 * showing the characteristic Poisson bursty-then-quiet pattern.
 */

const VB_W = 360
const VB_H = 180
const DROP_Y = 120
const DOOR_X = 40

const EMOJI_POOL = ['🙂', '😊', '🧔', '👩', '👧', '👨', '🧑', '🧑‍🦰', '👱']

/**
 * Sample `n` exponential inter-arrival times with rate lambda (events
 * per unit) using a LCG seeded by `seed` so sequences are stable across
 * renders. Returns cumulative times (the arrival timestamps).
 */
function sampleArrivals(n: number, lambda: number, seed: number): number[] {
  // Mulberry32 PRNG for determinism.
  let a = seed >>> 0
  const rand = () => {
    a = (a + 0x6D2B79F5) >>> 0
    let t = a
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
  const times: number[] = []
  let cum = 0
  for (let i = 0; i < n; i++) {
    // Exponential: -ln(U) / lambda
    const u = Math.max(1e-6, rand())
    const gap = -Math.log(u) / lambda
    cum += gap
    times.push(cum)
  }
  return times
}

function Frame({
  arrivals,
  currentMs,
  totalMs,
  caption,
}: {
  arrivals: readonly { time: number; emoji: string }[]
  currentMs: number
  totalMs: number
  caption: string
}) {
  // Visible arrivals = those with time <= currentMs.
  return (
    <svg viewBox={`0 0 ${VB_W} ${VB_H}`} className="w-full h-auto">
      {/* Door + ground */}
      <text x={DOOR_X - 20} y={DROP_Y} fontSize="22">🚪</text>
      <line
        x1={40}
        y1={DROP_Y + 10}
        x2={VB_W - 20}
        y2={DROP_Y + 10}
        stroke="#c2410c"
        strokeWidth="1.5"
        strokeDasharray="4,4"
        opacity="0.4"
      />
      <text
        x={VB_W / 2}
        y={30}
        textAnchor="middle"
        fontSize="13"
        fontWeight="700"
        fill="#7c2d12"
      >
        顧客到達近似 Poisson
      </text>
      <text x={VB_W / 2} y={48} textAnchor="middle" fontSize="12" fontWeight="500" fill="#7c2d12">
        間隔 = Exp(λ)
      </text>

      {arrivals.map((a, i) => {
        if (a.time > currentMs) return null
        const elapsedSinceArrive = currentMs - a.time
        // Space arrivals along the x axis by their arrival order in the
        // visible window, so a burst visually stacks rightward.
        const xOffset = 40 + i * 11
        const x = Math.min(VB_W - 20, xOffset)
        return (
          <text
            key={i}
            x={x}
            y={DROP_Y}
            textAnchor="middle"
            fontSize="14"
            className="neko-poisson-drop"
            style={{
              animationDelay: `0ms`,
              opacity: elapsedSinceArrive < 200 ? undefined : 1,
            }}
          >
            {a.emoji}
          </text>
        )
      })}

      <text
        x={VB_W / 2}
        y={VB_H - 10}
        textAnchor="middle"
        fontSize="10"
        fill="#6b7280"
        fontStyle="italic"
      >
        {caption} ({Math.min(arrivals.length, arrivals.filter((a) => a.time <= currentMs).length)}/{arrivals.length})
      </text>
      {/* suppress unused warning */}
      <text visibility="hidden">{totalMs}</text>
    </svg>
  )
}

export function ArrivalDropperAmbient() {
  // Fixed seed, slow lambda: ~1 arrival per second, looping softly.
  const arrivals = useMemo(() => {
    const times = sampleArrivals(10, 1, 42) // 10 arrivals ~ 10s
    return times.map((t, i) => ({
      time: t * 1000,
      emoji: EMOJI_POOL[i % EMOJI_POOL.length],
    }))
  }, [])
  // Ambient uses a slow loop; drive currentMs from wall clock modulo
  // total span so the ambient keeps replaying gently.
  const totalMs = arrivals[arrivals.length - 1]?.time ?? 10000
  const currentMs = useLoopingTick(totalMs + 1500)
  return <Frame arrivals={arrivals} currentMs={currentMs} totalMs={totalMs} caption="每 1 秒左右 drop 一位" />
}

/** Looping RAF tick in ms, resets when it hits maxMs. */
function useLoopingTick(maxMs: number): number {
  const [ms, setMs] = useState(0)
  useEffect(() => {
    const start = performance.now()
    let rafId = 0
    const tick = (now: number) => {
      setMs(((now - start) % maxMs) | 0)
      rafId = requestAnimationFrame(tick)
    }
    rafId = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(rafId)
  }, [maxMs])
  return ms
}

export function ArrivalDropperScripted({ duration = 5000, onDone }: {
  duration?: number
  onDone?: () => void
}) {
  // 30 arrivals compressed into `duration` ms at high λ so the user
  // sees the Poisson bursty shape within 5s.
  const arrivals = useMemo(() => {
    const secs = duration / 1000
    const lambda = 30 / secs
    const times = sampleArrivals(30, lambda, 7) // deterministic seed
    return times.map((t, i) => ({
      time: t * 1000,
      emoji: EMOJI_POOL[i % EMOJI_POOL.length],
    }))
  }, [duration])

  return (
    <ScriptedAnim duration={duration} onDone={onDone}>
      {({ progress }) => {
        const currentMs = progress * duration
        return (
          <Frame
            arrivals={arrivals}
            currentMs={currentMs}
            totalMs={duration}
            caption="Poisson 波形：有時擠在一起、有時間隔很長"
          />
        )
      }}
    </ScriptedAnim>
  )
}
