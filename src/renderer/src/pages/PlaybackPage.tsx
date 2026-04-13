import { useCallback, useEffect, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import type { SimulationResult } from '../types'
import { buildReplayContext, replayUpTo } from '../utils/replay'
import { usePlaybackClock } from '../hooks/usePlaybackClock'
import { useKeyboardShortcuts } from '../hooks/useKeyboardShortcuts'
import CafeScene, { type FocusTarget } from '../components/playback/CafeScene'
import PlaybackControls, {
  SPEED_OPTIONS,
} from '../components/playback/PlaybackControls'
import TimelineScrubber from '../components/playback/TimelineScrubber'
import InspectPopover from '../components/playback/InspectPopover'

/**
 * Animated replay of a completed simulation (v0.3).
 *
 * `simTime` is a controlled prop so it can be shared with EventLogPage for
 * the bidirectional row highlight. `usePlaybackClock` is a pure side-effect
 * that advances the parent's `simTime` on every rAF while `playing` is true.
 *
 * Replay is derived from the event log on every render via `replayUpTo`,
 * which is O(N) and sub-millisecond for ~800 events — no snapshot index
 * needed.
 */

interface PlaybackPageProps {
  result: SimulationResult
  simTime: number
  setSimTime: (t: number) => void
  /**
   * When true (armed by App after a fresh simulation run), the page should
   * auto-play from t=0 on mount. It is a one-shot; PlaybackPage calls
   * `onAutoStartConsumed` as soon as it has acted on the flag so that
   * navigating away and back does not re-trigger playback.
   */
  autoStartPending?: boolean
  onAutoStartConsumed?: () => void
  /** Jumps directly to the Results (statistics) page for users who only want the numbers. */
  onSkipToResults?: () => void
}

const DEFAULT_SPEED = 4

function formatSimClock(minutes: number): string {
  const total = Math.max(0, Math.floor(minutes))
  const hh = Math.floor(total / 60)
  const mm = total % 60
  return `${String(hh).padStart(2, '0')}:${String(mm).padStart(2, '0')}`
}

export default function PlaybackPage({
  result,
  simTime,
  setSimTime,
  autoStartPending,
  onAutoStartConsumed,
  onSkipToResults,
}: PlaybackPageProps) {
  const { t } = useTranslation(['playback', 'events'])
  const { config, eventLog } = result

  const ctx = useMemo(
    () => buildReplayContext(eventLog, config),
    [eventLog, config],
  )

  /**
   * Unique event timestamps, sorted. Drives the step-prev / step-next
   * buttons and the scrubber's event-density marks.
   */
  const timestamps = useMemo(() => {
    const set = new Set<number>()
    for (const e of eventLog) set.add(e.timestamp)
    return Array.from(set).sort((a, b) => a - b)
  }, [eventLog])

  const [playing, setPlaying] = useState(false)
  const [speed, setSpeed] = useState<number>(DEFAULT_SPEED)
  const [focus, setFocus] = useState<FocusTarget | null>(null)

  const handleEnd = useCallback(() => setPlaying(false), [])

  usePlaybackClock({
    simTime,
    setSimTime,
    totalMinutes: config.simulationDuration,
    speed,
    playing,
    onEnd: handleEnd,
  })

  // ── Auto-start on fresh run ───────────────────────────────
  // App arms the flag as soon as a new run resolves; consuming it here
  // kicks off playback from t=0 without the user having to press play.
  useEffect(() => {
    if (!autoStartPending) return
    setSimTime(0)
    setPlaying(true)
    onAutoStartConsumed?.()
  }, [autoStartPending, onAutoStartConsumed, setSimTime])

  const state = useMemo(() => replayUpTo(ctx, simTime), [ctx, simTime])

  // ── Control handlers ──────────────────────────────────────

  const togglePlay = useCallback(() => {
    setPlaying((p) => {
      if (!p && simTime >= config.simulationDuration) {
        // If we're sitting at the end, rewind before resuming so play is
        // useful instead of a no-op.
        setSimTime(0)
      }
      return !p
    })
  }, [simTime, config.simulationDuration, setSimTime])

  const resetClock = useCallback(() => {
    // "Reset" is really "replay from the top" — jump to 0 and start
    // playing immediately. If the user just wants to park the cursor at
    // 0 they can reset then press pause, but the common case is that
    // you clicked reset because you want to watch it again.
    setSimTime(0)
    setFocus(null)
    setPlaying(true)
  }, [setSimTime])

  const seekBy = useCallback(
    (deltaMinutes: number) => {
      const next = Math.max(
        0,
        Math.min(config.simulationDuration, simTime + deltaMinutes),
      )
      setSimTime(next)
    },
    [simTime, config.simulationDuration, setSimTime],
  )

  const stepNext = useCallback(() => {
    setPlaying(false)
    const next = timestamps.find((time) => time > simTime + 1e-4)
    setSimTime(next ?? config.simulationDuration)
  }, [timestamps, simTime, config.simulationDuration, setSimTime])

  const stepPrev = useCallback(() => {
    setPlaying(false)
    // Find the last timestamp strictly less than the current cursor.
    let picked = 0
    for (let i = timestamps.length - 1; i >= 0; i -= 1) {
      if (timestamps[i] < simTime - 1e-4) {
        picked = timestamps[i]
        break
      }
    }
    setSimTime(picked)
  }, [timestamps, simTime, setSimTime])

  const handleSpeed = useCallback((s: number) => setSpeed(s), [])

  const handleScrub = useCallback(
    (t: number) => {
      // Scrubbing preserves the current playing state: if the user was
      // watching, they keep watching from the new position when they
      // release the slider; if they had paused, they stay paused.
      setSimTime(t)
    },
    [setSimTime],
  )

  const handleSelectFocus = useCallback((target: FocusTarget | null) => {
    setFocus((prev) => {
      if (target === null) return null
      if (
        prev &&
        prev.kind === target.kind &&
        prev.slotIdx === target.slotIdx
      ) {
        return null
      }
      return target
    })
  }, [])

  // ── Keyboard shortcuts ────────────────────────────────────

  useKeyboardShortcuts(
    {
      ' ': (e) => {
        e.preventDefault()
        togglePlay()
      },
      ArrowLeft: () => seekBy(-10),
      ArrowRight: () => seekBy(10),
      ',': () => stepPrev(),
      '.': () => stepNext(),
      '0': () => resetClock(),
      '1': () => setSpeed(SPEED_OPTIONS[0]),
      '2': () => setSpeed(SPEED_OPTIONS[1]),
      '3': () => setSpeed(SPEED_OPTIONS[2]),
      '4': () => setSpeed(SPEED_OPTIONS[3]),
      '5': () => setSpeed(SPEED_OPTIONS[4]),
      Escape: () => {
        // Only act when an inspect popover is open, otherwise stay inert so
        // Escape remains available for any future global dismiss behaviour.
        if (focus) setFocus(null)
      },
    },
    true,
  )

  // ── Current-event caption ─────────────────────────────────

  const currentEventText = useMemo(() => {
    const e = state.lastEvent
    if (!e) return t('playback:noCurrentEvent')
    return t(`events:${e.eventType}` as const, {
      customerId: e.customerId,
      resourceId: e.resourceId ?? '',
      defaultValue: e.description ?? '',
    })
  }, [state.lastEvent, t])

  return (
    <div className="page-container space-y-4">
      {/* ── Header ─────────────────────────────────────────── */}
      <div className="card">
        <div className="flex items-start gap-3">
          <div className="flex-1 min-w-0">
            <div className="card-title">{t('playback:title')}</div>
            <p className="text-sm text-gray-500 mb-3">{t('playback:subtitle')}</p>
          </div>
          {onSkipToResults && (
            <button
              type="button"
              onClick={onSkipToResults}
              className="btn-secondary text-sm whitespace-nowrap"
            >
              📊 {t('playback:skipToResults')}
            </button>
          )}
        </div>
        <div className="flex flex-wrap items-center gap-x-6 gap-y-1 text-sm">
          <div>
            <span className="text-xs font-semibold uppercase tracking-wide text-gray-500 mr-2">
              {t('playback:timeLabel')}
            </span>
            <span className="text-base font-bold tabular-nums text-orange-700">
              {formatSimClock(simTime)}
            </span>
            <span className="text-xs text-gray-400 ml-1">
              / {formatSimClock(config.simulationDuration)}
            </span>
          </div>
          <div className="text-xs text-gray-500 tabular-nums">
            {t('playback:eventProgress', {
              current: state.appliedCount,
              total: eventLog.length,
            })}
          </div>
        </div>
      </div>

      {/* ── Scene + inspect popover ───────────────────────── */}
      <div className="card p-3 relative">
        <CafeScene
          state={state}
          config={config}
          focus={focus}
          onSelectFocus={handleSelectFocus}
          speed={speed}
        />
        {focus && (
          <InspectPopover
            focus={focus}
            state={state}
            onClose={() => setFocus(null)}
          />
        )}
      </div>

      {/* ── Current-event caption ─────────────────────────── */}
      <div className="card flex items-center gap-3 py-3">
        <span className="text-xs font-semibold uppercase tracking-wide text-orange-600">
          ●
        </span>
        <span className="text-sm text-gray-700 flex-1 truncate">
          {currentEventText}
        </span>
      </div>

      {/* ── Timeline scrubber ─────────────────────────────── */}
      <TimelineScrubber
        simTime={simTime}
        totalMinutes={config.simulationDuration}
        timestamps={timestamps}
        onSeek={handleScrub}
      />

      {/* ── Controls ──────────────────────────────────────── */}
      <PlaybackControls
        playing={playing}
        speed={speed}
        onTogglePlay={togglePlay}
        onReset={resetClock}
        onSpeedChange={handleSpeed}
        onStepPrev={stepPrev}
        onStepNext={stepNext}
      />
    </div>
  )
}

/**
 * Empty-state card when no simulation result is available yet. App.tsx
 * renders this when the Playback tab is reached without a successful run.
 */
export function PlaybackPageEmpty() {
  const { t } = useTranslation('playback')
  return (
    <div className="page-container">
      <div className="card">
        <div className="card-title">{t('playback:title')}</div>
        <p className="text-sm text-gray-600 mb-2">{t('playback:emptyState')}</p>
        <p className="text-xs text-gray-400">{t('playback:emptyStateHint')}</p>
      </div>
    </div>
  )
}
