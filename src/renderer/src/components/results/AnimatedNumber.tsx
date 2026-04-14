import { useEffect, useRef, useState } from 'react'
import { useCountUp } from '../../hooks/useCountUp'

interface AnimatedNumberProps {
  /** Target numeric value to tick to. */
  value: number
  /** Decimal places to render. `0` for counts, `1` for minutes, etc. */
  decimals?: number
  /** Optional suffix appended after the formatted number (e.g. "%"). */
  suffix?: string
  /** Animation duration in milliseconds. */
  duration?: number
  /**
   * If true, the tick starts immediately on mount. If false (default),
   * the value holds at 0 until the element enters the viewport. This
   * avoids animations firing below the fold where the user can't see
   * them, then being "done" by the time they scroll down.
   */
  immediate?: boolean
  /** Optional className passthrough for the wrapping span. */
  className?: string
}

/**
 * A `<span>` that animates a numeric value from 0 up to `value` with
 * easeOutQuart when it scrolls into view. Designed for KPI cards and
 * big metric numbers on the Results page.
 */
export default function AnimatedNumber({
  value,
  decimals = 0,
  suffix,
  duration = 600,
  immediate = false,
  className,
}: AnimatedNumberProps) {
  const [visible, setVisible] = useState<boolean>(immediate)
  const ref = useRef<HTMLSpanElement | null>(null)

  useEffect(() => {
    if (immediate || visible) return
    const el = ref.current
    if (!el || typeof IntersectionObserver === 'undefined') {
      setVisible(true)
      return
    }
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            setVisible(true)
            observer.disconnect()
            return
          }
        }
      },
      { threshold: 0.1 },
    )
    observer.observe(el)
    return () => observer.disconnect()
  }, [immediate, visible])

  const current = useCountUp(value, duration, visible)
  const formatted = current.toFixed(decimals)

  return (
    <span ref={ref} className={className}>
      {formatted}
      {suffix}
    </span>
  )
}
