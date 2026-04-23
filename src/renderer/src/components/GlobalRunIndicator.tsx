import { useTranslation } from 'react-i18next'

interface SimProgress {
  stage: 'warmup' | 'main' | 'rendering'
  elapsedMin: number
  totalMin: number
}

/**
 * Always-on-top progress overlay shown while a simulation is running.
 * Lives outside the page tree so navigating between tabs (e.g. opening
 * Playback while the Python process is still computing) still surfaces
 * the running state, instead of leaving the user staring at a blank
 * screen and assuming the app froze.
 *
 * Render priority for the bar fill:
 *   1. batchProgress  → real fraction of replications completed
 *   2. simProgress    → real simulated-time fraction streamed by Python
 *   3. fallback       → exponential easing toward 95% so the bar always
 *                       moves (covers the brief gap before the first
 *                       progress event arrives, and any older simulator
 *                       binary that doesn't emit progress at all).
 */
export default function GlobalRunIndicator({
  isRunning,
  elapsed,
  batchProgress,
  simProgress,
}: {
  isRunning: boolean
  elapsed: number
  batchProgress?: { completed: number; total: number } | null
  simProgress?: SimProgress | null
}) {
  const { t } = useTranslation('common')
  // Indicator stays visible while *either* the simulation is running or
  // a simProgress payload is still set. That lets us pin it on screen
  // during the post-result render cascade (we flip status to 'success'
  // before the cascade starts, but keep simProgress so the panel stays).
  if (!isRunning && !simProgress) return null

  const isRendering = simProgress?.stage === 'rendering'

  const pct = batchProgress
    ? (batchProgress.completed / batchProgress.total) * 100
    : isRendering
    ? 100
    : simProgress && simProgress.totalMin > 0
    ? (simProgress.elapsedMin / simProgress.totalMin) * 100
    : Math.min(95, (1 - Math.exp(-elapsed / 4)) * 100)

  const title = batchProgress
    ? t('runIndicator.batchTitle', {
        completed: batchProgress.completed,
        total: batchProgress.total,
      })
    : isRendering
    ? t('runIndicator.renderingTitle')
    : t('runIndicator.title')

  // When live sim progress is present, swap the elapsed wall-clock line
  // for "simulated time X / Y", which is the actually informative thing
  // to know — the user wants to feel how far the model is, not how long
  // the JS thread has been waiting.
  const subtitle = isRendering
    ? t('runIndicator.renderingSubtitle')
    : !batchProgress && simProgress && simProgress.totalMin > 0
    ? t('runIndicator.simSubtitle', {
        cur: formatMinutes(simProgress.elapsedMin),
        total: formatMinutes(simProgress.totalMin),
      })
    : t('runIndicator.elapsed', { elapsed: elapsed.toFixed(1) })

  const showWarmupBadge =
    !batchProgress && simProgress?.stage === 'warmup'

  return (
    <>
      {/* Slim top bar, sits on top of every page */}
      <div className="fixed top-0 left-0 right-0 z-[60] h-[3px] bg-orange-100/80 dark:bg-bark-800/80 pointer-events-none">
        <div
          className="h-full bg-gradient-to-r from-orange-400 via-orange-500 to-amber-500 transition-[width] duration-300 ease-out"
          style={{ width: `${pct.toFixed(1)}%` }}
        />
      </div>

      {/* Floating panel: explicit text so the user knows what is happening */}
      <div
        role="status"
        aria-live="polite"
        className="fixed bottom-5 right-5 z-[60] flex items-center gap-3 rounded-xl bg-white/95 dark:bg-bark-700/95 ring-1 ring-orange-200 dark:ring-bark-500 shadow-lg px-4 py-3 backdrop-blur"
      >
        <span className="relative flex h-3 w-3">
          <span className="absolute inline-flex h-full w-full rounded-full bg-orange-400 opacity-75 animate-ping" />
          <span className="relative inline-flex h-3 w-3 rounded-full bg-orange-500" />
        </span>
        <div className="text-xs leading-tight">
          <div className="flex items-center gap-1.5 font-semibold text-orange-700 dark:text-orange-400">
            <span>{title}</span>
            {showWarmupBadge && (
              <span className="rounded-full bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-300 px-1.5 py-0.5 text-[10px] font-bold">
                {t('runIndicator.warmupBadge')}
              </span>
            )}
          </div>
          <div className="text-gray-500 dark:text-bark-300 tabular-nums">
            {subtitle}
          </div>
        </div>
      </div>
    </>
  )
}

function formatMinutes(min: number): string {
  const h = Math.floor(min / 60)
  const m = min % 60
  return `${h}:${String(m).padStart(2, '0')}`
}
