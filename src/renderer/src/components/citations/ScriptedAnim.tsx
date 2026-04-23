import {
  forwardRef,
  useCallback,
  useEffect,
  useImperativeHandle,
  useRef,
  useState,
} from 'react'
import { useTranslation } from 'react-i18next'

/**
 * Generic scripted-animation driver. Children receive `progress` (0..1)
 * and `playing` so each concept diagram can map the timeline onto SVG
 * attribute / className changes however it wants. No SVG DOM magic, no
 * dependency on framer-motion; just a requestAnimationFrame loop that
 * stops when the user pauses or the timeline ends.
 *
 * The expected pattern inside a chapter is:
 *
 *   <ScriptedAnim duration={5000}>
 *     {({ progress, playing }) => (
 *       <svg>
 *         <g transform={`translate(${100 * progress}, 0)`}>...</g>
 *         {progress > 0.5 && <text>halfway there</text>}
 *       </svg>
 *     )}
 *   </ScriptedAnim>
 *
 * Cold-mounted by StoryChapter only when the user presses the play
 * button, so idle chapters pay zero animation cost.
 */
export interface ScriptedAnimHandle {
  play(): void
  pause(): void
  restart(): void
}

interface Props {
  /** Total timeline length in ms. */
  duration: number
  /** Start playing immediately on mount. Default true. */
  autoplay?: boolean
  /** Fired once when progress reaches 1. */
  onDone?: () => void
  /** Render prop: gets live progress 0..1 and playing state. */
  children: (state: { progress: number; playing: boolean }) => React.ReactNode
}

export default forwardRef<ScriptedAnimHandle, Props>(function ScriptedAnim(
  { duration, autoplay = true, onDone, children },
  ref,
) {
  const { t } = useTranslation('citations')
  const [progress, setProgress] = useState(0)
  const [playing, setPlaying] = useState(autoplay)
  const startRef = useRef<number | null>(null)
  const rafRef = useRef<number | null>(null)
  const doneFiredRef = useRef(false)

  const stopRaf = useCallback(() => {
    if (rafRef.current !== null) {
      cancelAnimationFrame(rafRef.current)
      rafRef.current = null
    }
  }, [])

  const tick = useCallback(
    (now: number) => {
      if (startRef.current === null) startRef.current = now
      const elapsed = now - startRef.current
      const p = Math.min(1, elapsed / duration)
      setProgress(p)
      if (p >= 1) {
        setPlaying(false)
        stopRaf()
        if (!doneFiredRef.current) {
          doneFiredRef.current = true
          onDone?.()
        }
        return
      }
      rafRef.current = requestAnimationFrame(tick)
    },
    [duration, onDone, stopRaf],
  )

  useEffect(() => {
    if (!playing) {
      stopRaf()
      return
    }
    rafRef.current = requestAnimationFrame(tick)
    return stopRaf
  }, [playing, tick, stopRaf])

  // Reset timeline + immediately start replaying. Reused by both the
  // imperative ref handle (external parents calling restart()) and the
  // built-in replay button that appears once progress hits 100%.
  const restart = useCallback(() => {
    stopRaf()
    startRef.current = null
    doneFiredRef.current = false
    setProgress(0)
    setPlaying(true)
  }, [stopRaf])

  useImperativeHandle(
    ref,
    () => ({
      play() {
        if (progress >= 1) return
        startRef.current = null
        // Resume from current progress: shift start back in time.
        const elapsedAtResume = progress * duration
        startRef.current = performance.now() - elapsedAtResume
        setPlaying(true)
      },
      pause() {
        setPlaying(false)
      },
      restart,
    }),
    [duration, progress, restart],
  )

  return (
    <div className="w-full">
      {children({ progress, playing })}
      {/* While the clip is playing, show a thin progress bar under the
          scene. Once progress hits 100% the bar is swapped for a
          centered replay button so the reader can re-watch without
          remounting the popover or leaving the chapter. */}
      {progress < 1 ? (
        <div
          className="mt-2 h-1.5 w-full rounded-full bg-orange-100 dark:bg-bark-700 overflow-hidden"
          role="progressbar"
          aria-valuenow={Math.round(progress * 100)}
          aria-valuemin={0}
          aria-valuemax={100}
          data-testid="scripted-anim-progress"
        >
          <div
            className="h-full rounded-full bg-orange-500"
            style={{
              width: `${progress * 100}%`,
              // No transition: progress updates already tick at RAF cadence.
              transition: 'none',
            }}
          />
        </div>
      ) : (
        <div className="mt-2 flex justify-center">
          <button
            type="button"
            onClick={restart}
            className="inline-flex items-center gap-1.5 rounded-full bg-orange-500 hover:bg-orange-600 active:bg-orange-700 text-white px-3 py-1 text-[11px] font-semibold shadow-sm transition-colors"
            data-testid="scripted-anim-replay"
            aria-label={t('story.replayScripted')}
          >
            <span aria-hidden>↻</span>
            {t('story.replayScripted')}
          </button>
        </div>
      )}
    </div>
  )
})
