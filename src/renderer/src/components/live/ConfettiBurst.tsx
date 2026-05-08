import { useEffect, useState } from 'react'

interface Props {
  /** When this value changes from null to a number, fires a single
   *  confetti burst. Setting back to null cleans up state but won't
   *  re-trigger. */
  trigger: number | null
}

const PARTICLES = ['✨', '🎉', '⭐', '💫', '🌟']
const COUNT = 14

/**
 * One-shot particle burst rendered absolutely over the parent. Fires
 * when `trigger` flips from null to a number — typically when the
 * convergence detector registers a stable curve for the first time.
 *
 * Particles are absolutely positioned with random direction vectors
 * exposed through CSS variables. The keyframe animation reads the
 * variables to fly outward over ~1s, then state clears.
 */
export default function ConfettiBurst({ trigger }: Props) {
  const [active, setActive] = useState(false)

  useEffect(() => {
    if (trigger == null) return
    setActive(true)
    const timer = setTimeout(() => setActive(false), 1300)
    return () => clearTimeout(timer)
  }, [trigger])

  if (!active) return null

  return (
    <div
      aria-hidden
      className="pointer-events-none absolute inset-0 flex items-start justify-center overflow-visible"
      style={{ zIndex: 30 }}
    >
      {Array.from({ length: COUNT }, (_, i) => {
        // Even-ish hemisphere spray with slight randomness.
        const angleDeg = -90 + (i / COUNT) * 180 + (Math.random() - 0.5) * 20
        const distance = 90 + Math.random() * 60
        const angleRad = (angleDeg * Math.PI) / 180
        const dx = Math.cos(angleRad) * distance
        const dy = Math.sin(angleRad) * distance - 40
        const rot = (Math.random() - 0.5) * 720
        const particle = PARTICLES[i % PARTICLES.length]
        return (
          <span
            key={i}
            className="live-confetti-particle"
            style={{
              top: '20px',
              ['--dx' as string]: `${dx}px`,
              ['--dy' as string]: `${dy}px`,
              ['--rot' as string]: `${rot}deg`,
              animationDelay: `${i * 30}ms`,
            } as React.CSSProperties}
          >
            {particle}
          </span>
        )
      })}
    </div>
  )
}
