import { useCallback, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import type { SimulationResult } from '../../types'
import { buildReplayContext, replayUpTo } from '../../utils/replay'
import { usePlaybackClock } from '../../hooks/usePlaybackClock'
import CafeScene from '../playback/CafeScene'

interface Props {
  /** The currently displayed run. App swaps this as new batch runs land. */
  result: SimulationResult
  /** Animation speed multiplier (sim-minutes per real-second). */
  speed?: number
  /** 0..1 progress through the entire batch. Drives the conic-gradient
   *  halo around the scene. */
  batchProgress: number
  /** runIndex of the currently displayed run. Used as the React `key` so
   *  the panel remounts on swap, triggering the cross-fade animation. */
  runIndex: number
}

/**
 * Compact, self-contained scene player for the live convergence page.
 * Auto-loops the current run's animation: when the clock reaches the
 * end it resets to t=0 and keeps playing. App swaps `result` to a newer
 * run when one finishes; the React key on the outer wrapper ensures the
 * whole panel remounts so the cross-fade keyframe re-runs.
 */
export default function LiveScenePanel({
  result, speed = 8, batchProgress, runIndex,
}: Props) {
  const { t } = useTranslation('liveOverlay')
  const { config, eventLog } = result

  const ctx = useMemo(
    () => buildReplayContext(eventLog, config),
    [eventLog, config],
  )

  const [simTime, setSimTime] = useState(0)

  const handleEnd = useCallback(() => {
    // Loop: jump straight back to t=0 and keep playing. The smallest
    // sim-time tick the clock can produce is one rAF, so resetting to 0
    // means the next frame starts the replay over without a perceptible
    // pause.
    setSimTime(0)
  }, [])

  usePlaybackClock({
    simTime,
    setSimTime,
    totalMinutes: config.simulationDuration,
    speed,
    playing: true,
    onEnd: handleEnd,
  })

  const state = useMemo(() => replayUpTo(ctx, simTime), [ctx, simTime])

  const haloPct = Math.max(0, Math.min(1, batchProgress))
  const haloDeg = haloPct * 360

  return (
    <div
      key={runIndex}
      className="card p-3 relative live-scene-fade-in"
      data-testid="live-scene-panel"
    >
      {/* Run progress halo: a conic-gradient ring around the scene panel
          that fills clockwise as runs complete. The ring is offset
          inside the card so it feels like a frame, not just a border. */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 rounded-2xl live-halo-pulse"
        style={{
          background: `conic-gradient(#fb923c ${haloDeg}deg, transparent ${haloDeg}deg)`,
          padding: '2px',
          mask: 'linear-gradient(#000 0 0) content-box, linear-gradient(#000 0 0)',
          WebkitMask: 'linear-gradient(#000 0 0) content-box, linear-gradient(#000 0 0)',
          maskComposite: 'exclude',
          WebkitMaskComposite: 'xor',
          opacity: 0.7,
        }}
      />

      <div className="flex items-center justify-between mb-2 relative">
        <div className="flex items-center gap-2">
          <span className="text-sm font-semibold text-orange-700 dark:text-orange-400">
            🐱 {t('scenePanel.title', { defaultValue: '當前模擬動畫' })}
          </span>
          <span className="text-xs text-gray-500 dark:text-bark-300 tabular-nums">
            {t('scenePanel.runLabel', { index: runIndex + 1 })}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-[10px] text-gray-400 dark:text-bark-400 tabular-nums">
            {Math.floor(simTime)}/{config.simulationDuration} {t('scenePanel.minUnit', { defaultValue: '分' })}
          </span>
          <button
            type="button"
            onClick={() => setSimTime(0)}
            data-testid="live-scene-replay"
            className="px-2 py-0.5 rounded text-[11px] font-semibold bg-white/90 dark:bg-bark-700/90 border border-orange-200 dark:border-bark-500 text-orange-700 dark:text-orange-400 hover:bg-orange-50 dark:hover:bg-bark-600 transition-colors"
            title={t('scenePanel.replay', { defaultValue: '從頭開始播放這次的動畫' })}
            aria-label={t('scenePanel.replay', { defaultValue: '從頭開始播放這次的動畫' })}
          >
            ↻ {t('scenePanel.replayShort', { defaultValue: '重播' })}
          </button>
        </div>
      </div>

      <CafeScene
        state={state}
        config={config}
        focus={null}
        onSelectFocus={() => { /* live panel is read-only */ }}
        speed={speed}
      />
    </div>
  )
}
