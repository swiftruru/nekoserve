import { useMemo } from 'react'
import { useTranslation } from 'react-i18next'

/**
 * Draggable timeline scrubber with an event-density hint underneath.
 *
 * The range input owns the value visually; the parent owns the canonical
 * `simTime` and is notified via `onSeek`. We don't debounce — scrub should
 * feel immediate — but the reducer is O(N) so even 120 Hz dragging stays
 * under 1 ms per frame.
 *
 * The density strip below the range input bins the event timestamps into
 * fixed-width columns and shades each column by the fraction of events
 * that fall into it. Bright columns == event-heavy moments (seat starts
 * filling up, a wave of abandons, etc.) so students can aim for them.
 */

interface TimelineScrubberProps {
  simTime: number
  totalMinutes: number
  timestamps: readonly number[]
  onSeek: (t: number) => void
}

const BIN_COUNT = 60

export default function TimelineScrubber({
  simTime,
  totalMinutes,
  timestamps,
  onSeek,
}: TimelineScrubberProps) {
  const { t } = useTranslation('playback')

  const bins = useMemo(() => {
    if (totalMinutes <= 0 || timestamps.length === 0) {
      return new Array<number>(BIN_COUNT).fill(0)
    }
    const counts = new Array<number>(BIN_COUNT).fill(0)
    for (const ts of timestamps) {
      const idx = Math.min(
        BIN_COUNT - 1,
        Math.max(0, Math.floor((ts / totalMinutes) * BIN_COUNT)),
      )
      counts[idx] += 1
    }
    const max = counts.reduce((a, b) => (b > a ? b : a), 0)
    return max > 0 ? counts.map((c) => c / max) : counts
  }, [timestamps, totalMinutes])

  const progressPct =
    totalMinutes > 0
      ? Math.max(0, Math.min(100, (simTime / totalMinutes) * 100))
      : 0

  return (
    <div className="card py-3">
      <div className="flex items-center gap-3 mb-2">
        <span className="text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-bark-300">
          {t('playback:timeline.label')}
        </span>
        <span className="text-[11px] text-gray-400 dark:text-bark-400">
          {t('playback:timeline.hint')}
        </span>
      </div>

      {/* Density hint strip */}
      <div
        className="relative flex items-end h-4 gap-[1px] mb-1 px-1"
        aria-hidden
      >
        {bins.map((v, i) => (
          <div
            key={i}
            className="flex-1 rounded-t-sm bg-gradient-to-t from-orange-200 to-orange-400 dark:from-orange-800 dark:to-orange-600"
            style={{
              height: `${Math.max(8, v * 100)}%`,
              opacity: 0.15 + v * 0.75,
            }}
          />
        ))}
        {/* Playhead overlay on the density strip */}
        <div
          className="pointer-events-none absolute top-0 bottom-0 w-[2px] bg-orange-600"
          style={{ left: `calc(${progressPct}% )` }}
        />
      </div>

      {/* Range input */}
      <input
        type="range"
        min={0}
        max={Math.max(totalMinutes, 0.01)}
        step={0.01}
        value={simTime}
        onChange={(e) => onSeek(parseFloat(e.target.value))}
        data-testid="playback-scrubber"
        aria-label={t('playback:timeline.ariaLabel')}
        className="w-full accent-orange-500 cursor-pointer"
      />
    </div>
  )
}
