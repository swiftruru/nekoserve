import { useTranslation } from 'react-i18next'
import {
  useLiveBatchStore,
  type LiveMetricKey,
} from '../../store/liveBatchStore'
import CumulativeMeanChart from './CumulativeMeanChart'
import { detectConvergedAt, CONVERGENCE_WINDOW } from '../../utils/convergence'

interface Props {
  metrics: LiveMetricKey[]
  /** When the user clicks a chart, fire this callback so the parent can
   *  switch to a single-metric "focus" view. */
  onFocus: (metric: LiveMetricKey) => void
  /** When set, every chart shows only its first N points instead of the
   *  full series. Drives the curve-replay animation: the parent steps
   *  this from 1 to runs.length over a few seconds and we redraw at
   *  each step, so the user sees the curves grow from scratch. */
  displayLimit?: number | null
}

/**
 * Multi-metric small-multiples grid. The whole point: every completed
 * batch run advances *all* charts at once, so the user sees the "lots
 * of curves moving together" feel rather than having to click a
 * dropdown to inspect one metric at a time.
 *
 * Reads the live store directly. Each chart is a compact-mode
 * CumulativeMeanChart so the visual identity matches the focused view
 * the user gets when they click in.
 */
export default function MetricSmallMultiples({ metrics, onFocus, displayLimit }: Props) {
  const { t } = useTranslation('liveOverlay')

  // We subscribe to the store at the parent level (single subscription)
  // and pass the slices to children, instead of letting each child
  // subscribe — keeps re-render cost predictable as N grows.
  const total = useLiveBatchStore((s) => s.total)
  const currentIndex = useLiveBatchStore((s) => s.currentIndex)
  const series = useLiveBatchStore((s) => s.series)
  const stats = useLiveBatchStore((s) => s.stats)
  const isReplaying = displayLimit != null

  if (metrics.length === 0) {
    return (
      <div className="card text-center py-12 text-sm text-gray-500 dark:text-bark-300">
        {t('smallMultiples.hint')}
      </div>
    )
  }

  // Adapt grid columns to the metric count so 4 metrics aren't stretched
  // unnaturally wide and 8+ stay readable.
  const gridCols =
    metrics.length <= 2 ? 'grid-cols-1 sm:grid-cols-2'
    : metrics.length <= 4 ? 'grid-cols-1 sm:grid-cols-2'
    : metrics.length <= 6 ? 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3'
    : 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4'

  return (
    <div className={`grid ${gridCols} gap-2`}>
      {metrics.map((key) => {
        const metricLabel = t(`metric.${key}`, { defaultValue: key })
        const fullSeries = series[key] ?? []
        // During replay we slice to the first N points so the chart
        // redraws as if we were back at run #N.
        const metricSeries = isReplaying
          ? fullSeries.slice(0, Math.max(1, displayLimit!))
          : fullSeries
        const fullStat = stats[key]
        const lastPoint = metricSeries[metricSeries.length - 1]
        const stat = isReplaying && lastPoint
          ? { n: lastPoint.n, mean: lastPoint.mean, m2: 0 }
          : fullStat
        const convergedAt = detectConvergedAt(metricSeries)

        return (
          <button
            key={key}
            type="button"
            onClick={() => onFocus(key)}
            data-testid={`live-mini-${key}`}
            className="text-left rounded-xl ring-1 ring-transparent hover:ring-orange-300 dark:hover:ring-bark-500 transition-shadow focus:outline-none focus:ring-2 focus:ring-orange-400"
            aria-label={metricLabel}
          >
            <CumulativeMeanChart
              series={metricSeries}
              total={Math.max(total, currentIndex)}
              metricLabel={metricLabel}
              convergedAt={convergedAt}
              convergenceWindow={CONVERGENCE_WINDOW}
              compact
            />
            {/* Numeric readout strip below each mini chart so the user
                doesn't have to read the y-axis to see the current mean
                and CI. */}
            <div className="mt-1 px-2 flex items-center justify-between text-[10px] tabular-nums">
              <span className="text-gray-600 dark:text-bark-300">
                n = {stat?.n ?? 0}
              </span>
              <span className="font-semibold text-orange-700 dark:text-orange-400">
                {stat && stat.n > 0 ? formatNumber(stat.mean) : '—'}
                {lastPoint && lastPoint.halfWidth > 0 && (
                  <span className="text-gray-500 dark:text-bark-400 font-normal">
                    {' '}± {formatNumber(lastPoint.halfWidth)}
                  </span>
                )}
              </span>
            </div>
          </button>
        )
      })}
    </div>
  )
}

function formatNumber(x: number): string {
  if (!Number.isFinite(x)) return '—'
  const abs = Math.abs(x)
  if (abs >= 100) return x.toFixed(1)
  if (abs >= 1) return x.toFixed(3)
  return x.toFixed(4)
}
