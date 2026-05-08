import { useEffect, useRef, useState } from 'react'

interface Props {
  value: number
  /** Optional label rendered above the digits (e.g. "samples"). */
  label?: string
  /** Width (in characters) of the value. Pads with leading space. */
  width?: number
}

/**
 * Lightweight odometer-style number display: each time the value
 * advances, the affected digits roll up with a brief CSS keyframe.
 *
 * We don't aim for a full mechanical wheel; just enough motion that the
 * eye registers "ticked" without a heavy dependency. Implementation:
 *  - render each digit (and the leading-space slots) inside a span
 *  - on value change, attach `live-odometer-roll` to the digits that
 *    actually changed (compared to the previous render)
 *  - re-key the roll class on a tick counter so the keyframe re-runs
 */
export default function OdometerCounter({ value, label, width = 4 }: Props) {
  const safeValue = Math.max(0, Math.floor(value))
  const text = safeValue.toString().padStart(width, ' ')

  const prevTextRef = useRef(text)
  const [rollMask, setRollMask] = useState<boolean[]>(() => Array(text.length).fill(false))
  const [rollKey, setRollKey] = useState(0)

  useEffect(() => {
    const prev = prevTextRef.current
    if (prev === text) return
    const mask = Array.from(text).map((c, i) => c !== (prev[i] ?? ' '))
    setRollMask(mask)
    setRollKey((k) => k + 1)
    prevTextRef.current = text
  }, [text])

  return (
    <div className="inline-flex flex-col items-end leading-tight">
      {label && (
        <div className="text-[10px] uppercase tracking-wide text-gray-500 dark:text-bark-400">
          {label}
        </div>
      )}
      <div className="flex font-mono font-bold tabular-nums text-2xl text-orange-700 dark:text-orange-400">
        {Array.from(text).map((ch, i) => (
          <span
            key={`${i}-${rollMask[i] ? rollKey : 'static'}`}
            className={
              rollMask[i]
                ? 'live-odometer-roll inline-block min-w-[1ch] text-center'
                : 'inline-block min-w-[1ch] text-center'
            }
          >
            {ch === ' ' ? ' ' : ch}
          </span>
        ))}
      </div>
    </div>
  )
}
