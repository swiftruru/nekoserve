import { useEffect, useRef, useState } from 'react'

/**
 * Animate a numeric value from 0 up to `target` via requestAnimationFrame
 * with an easeOutQuart curve. Returns the currently-displayed value.
 *
 * `prefers-reduced-motion: reduce` short-circuits the animation and
 * returns the target value immediately.
 *
 * `enabled` gates the animation so callers can defer it until the
 * element enters the viewport (via IntersectionObserver in the
 * consumer component). Passing `false` holds the value at 0 until the
 * caller flips it to `true`, at which point the rAF loop starts.
 */
export function useCountUp(
  target: number,
  durationMs: number = 600,
  enabled: boolean = true,
): number {
  const [display, setDisplay] = useState<number>(() => {
    if (!enabled) return 0
    return 0
  })
  const frameRef = useRef<number | null>(null)
  const hasPlayedRef = useRef<boolean>(false)

  useEffect(() => {
    if (!enabled) return
    if (!Number.isFinite(target)) {
      setDisplay(target)
      return
    }

    // Respect reduced-motion: jump straight to the final value.
    const prefersReducedMotion =
      typeof window !== 'undefined' &&
      window.matchMedia?.('(prefers-reduced-motion: reduce)').matches
    if (prefersReducedMotion) {
      setDisplay(target)
      hasPlayedRef.current = true
      return
    }

    // If the value changes after the initial play (e.g. new sim result
    // drops in while the card is mounted), tick from the old displayed
    // value to the new target rather than from 0 — avoids jarring
    // "snap to 0 then climb" behaviour.
    const startValue = hasPlayedRef.current ? display : 0
    const delta = target - startValue
    const startTs = performance.now()

    const tick = (now: number) => {
      const elapsed = now - startTs
      const t = Math.min(1, elapsed / durationMs)
      // easeOutQuart: 1 - (1 - t)^4 — fast start, gentle landing.
      const eased = 1 - Math.pow(1 - t, 4)
      setDisplay(startValue + delta * eased)
      if (t < 1) {
        frameRef.current = requestAnimationFrame(tick)
      } else {
        setDisplay(target)
        hasPlayedRef.current = true
        frameRef.current = null
      }
    }

    frameRef.current = requestAnimationFrame(tick)
    return () => {
      if (frameRef.current !== null) {
        cancelAnimationFrame(frameRef.current)
        frameRef.current = null
      }
    }
    // We intentionally exclude `display` from deps: it would retrigger
    // the effect every frame and cancel the animation on the next tick.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [target, durationMs, enabled])

  return display
}
