import { useEffect, useRef } from 'react'

/**
 * Controlled rAF clock for the Playback page.
 *
 * `simTime` and `setSimTime` are owned by the parent (App.tsx) so that the
 * same value can be shared with other pages (Event Log row highlight). This
 * hook only runs the animation loop: on every frame, if `playing` is true,
 * it advances the parent's simTime by `dt * speed` via `setSimTime`. When
 * the clock reaches `totalMinutes` it fires `onEnd` once.
 *
 * We mirror the latest inputs into refs so the single rAF loop never needs
 * to resubscribe, and refs are the only way the tick callback can read the
 * newest values without stale closures.
 */

export interface UsePlaybackClockOptions {
  simTime: number
  setSimTime: (t: number) => void
  totalMinutes: number
  /** Sim-minutes per real-second. Must be > 0. */
  speed: number
  playing: boolean
  /** Called once when simTime hits totalMinutes while playing. */
  onEnd?: () => void
}

export function usePlaybackClock({
  simTime,
  setSimTime,
  totalMinutes,
  speed,
  playing,
  onEnd,
}: UsePlaybackClockOptions): void {
  const simTimeRef = useRef(simTime)
  const setSimTimeRef = useRef(setSimTime)
  const speedRef = useRef(speed)
  const playingRef = useRef(playing)
  const totalRef = useRef(totalMinutes)
  const onEndRef = useRef(onEnd)

  simTimeRef.current = simTime
  setSimTimeRef.current = setSimTime
  speedRef.current = speed
  playingRef.current = playing
  totalRef.current = totalMinutes
  onEndRef.current = onEnd

  useEffect(() => {
    let frameId = 0
    let prevReal = performance.now()

    const tick = (now: number) => {
      const dt = now - prevReal
      prevReal = now
      if (playingRef.current) {
        const advanced = simTimeRef.current + (dt / 1000) * speedRef.current
        if (advanced >= totalRef.current) {
          setSimTimeRef.current(totalRef.current)
          onEndRef.current?.()
        } else {
          setSimTimeRef.current(advanced)
        }
      }
      frameId = requestAnimationFrame(tick)
    }

    frameId = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(frameId)
  }, [])
}
