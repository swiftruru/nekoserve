import { useState, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import {
  useLiveBatchStore,
  type LiveMetricKey,
} from '../../store/liveBatchStore'
import {
  getThresholdStep,
  getThresholdBounds,
  THRESHOLD_DEFAULTS,
} from '../../data/thresholdDefaults'

/**
 * Global pass-bar editor for the Live Convergence page.
 *
 * Why this exists alongside the detail-view ThresholdControl: the user
 * shouldn't have to drill into each metric one-by-one when they want
 * to set five pass bars at once (e.g. before showing the page to the
 * committee). Collapsed by default so the page header stays clean.
 *
 * Lists only the user's *selected* metrics — those visible in the
 * small-multiples grid — so the editor matches what the user can
 * actually see react in the charts. Metrics not in the selection are
 * skipped; if you want to set a bar for one of them, add it to the
 * picker first.
 *
 * State lives in liveBatchStore.thresholds; every chart (small
 * multiples + detail histogram + detail cumulative-mean) is reactive
 * on that map, so editing here updates every chart on the page in
 * the same frame without any prop drilling.
 */
interface Props {
  /** Which metrics to surface as rows. Matches what's in the grid. */
  metrics: LiveMetricKey[]
}

const STORAGE_KEY = 'nekoserve:global-threshold-bar-open'

function loadOpen(): boolean {
  try { return localStorage.getItem(STORAGE_KEY) === 'true' }
  catch { return false }
}
function saveOpen(v: boolean) {
  try { localStorage.setItem(STORAGE_KEY, v ? 'true' : 'false') }
  catch { /* ok */ }
}

export default function GlobalThresholdBar({ metrics }: Props) {
  const { t } = useTranslation('liveOverlay')
  const thresholds = useLiveBatchStore((s) => s.thresholds)
  const setThreshold = useLiveBatchStore((s) => s.setThreshold)
  const resetThresholds = useLiveBatchStore((s) => s.resetThresholds)

  const [open, setOpen] = useState<boolean>(loadOpen)
  useEffect(() => { saveOpen(open) }, [open])

  // Count of metrics with a bar set -- shown in the collapsed summary
  // so the user can see at a glance "5 of 6 metrics have bars".
  const setCount = metrics.filter((m) => thresholds[m] !== undefined).length

  return (
    <div className="card !p-0 overflow-hidden border-orange-200 dark:border-bark-600">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        data-testid="global-threshold-toggle"
        className="w-full flex items-center justify-between gap-2 px-4 py-2.5 text-left text-sm font-semibold text-orange-700 dark:text-orange-400 hover:bg-orange-50/60 dark:hover:bg-bark-700/30 transition-colors"
      >
        <span className="flex items-center gap-2">
          <span>⛳</span>
          <span>{t('globalThresholdBar.title')}</span>
          <span className="text-[11px] text-gray-500 dark:text-bark-300 font-normal">
            ({t('globalThresholdBar.setCount', { count: setCount, total: metrics.length })})
          </span>
        </span>
        <span className="text-xs text-gray-500 dark:text-bark-300">
          {open ? `▲ ${t('globalThresholdBar.collapse')}` : `▼ ${t('globalThresholdBar.expand')}`}
        </span>
      </button>

      {open && (
        <div className="px-4 pt-2 pb-3 border-t border-orange-100 dark:border-bark-600 bg-orange-50/30 dark:bg-bark-700/20 space-y-2">
          <p className="text-[12px] text-gray-600 dark:text-bark-300 leading-relaxed">
            {t('globalThresholdBar.hint')}
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
            {metrics.map((key) => (
              <ThresholdRow key={key} metric={key} />
            ))}
          </div>
          <div className="flex justify-end pt-1">
            <button
              type="button"
              onClick={resetThresholds}
              data-testid="global-threshold-reset-all"
              className="text-xs text-gray-500 dark:text-bark-300 hover:text-orange-700 dark:hover:text-orange-400 underline"
            >
              {t('globalThresholdBar.resetAll')}
            </button>
          </div>
        </div>
      )}
    </div>
  )

  function ThresholdRow({ metric }: { metric: LiveMetricKey }) {
    const cfg = thresholds[metric]
    const fallback = THRESHOLD_DEFAULTS[metric]
    const step = getThresholdStep(metric)
    const bounds = getThresholdBounds(metric)
    const metricLabel = t(`metric.${metric}`, { defaultValue: metric })

    const value = cfg?.value ?? ''
    const direction = cfg?.direction ?? fallback?.direction ?? 'gte'

    const handleValue = (raw: string) => {
      if (raw === '') {
        setThreshold(metric, null)
        return
      }
      const num = Number(raw)
      if (!Number.isFinite(num)) return
      let clamped = num
      if (bounds.min !== undefined && clamped < bounds.min) clamped = bounds.min
      if (bounds.max !== undefined && clamped > bounds.max) clamped = bounds.max
      setThreshold(metric, { value: clamped, direction })
    }

    const handleDir = (next: 'gte' | 'lte') => {
      if (!cfg) return
      setThreshold(metric, { value: cfg.value, direction: next })
    }

    return (
      <div
        className="flex items-center gap-1.5 px-2 py-1.5 rounded border border-orange-100 dark:border-bark-600 bg-white/60 dark:bg-bark-700/30 text-xs"
        data-testid={`global-threshold-row-${metric}`}
      >
        <span
          className="flex-1 truncate text-gray-700 dark:text-bark-200 font-medium"
          title={metricLabel}
        >
          {metricLabel}
        </span>
        <div className="flex items-center" role="group">
          <button
            type="button"
            onClick={() => handleDir('gte')}
            disabled={!cfg}
            aria-pressed={direction === 'gte'}
            className={
              'px-1.5 py-0.5 rounded-l text-[11px] font-semibold border transition-colors ' +
              (direction === 'gte'
                ? 'bg-orange-500 text-white border-orange-600'
                : 'bg-white dark:bg-bark-700 text-orange-700 dark:text-orange-300 border-orange-200 dark:border-bark-500 hover:bg-orange-50 dark:hover:bg-bark-600') +
              (!cfg ? ' opacity-50 cursor-not-allowed' : '')
            }
          >
            ≥
          </button>
          <button
            type="button"
            onClick={() => handleDir('lte')}
            disabled={!cfg}
            aria-pressed={direction === 'lte'}
            className={
              'px-1.5 py-0.5 rounded-r text-[11px] font-semibold border-y border-r transition-colors ' +
              (direction === 'lte'
                ? 'bg-orange-500 text-white border-orange-600'
                : 'bg-white dark:bg-bark-700 text-orange-700 dark:text-orange-300 border-orange-200 dark:border-bark-500 hover:bg-orange-50 dark:hover:bg-bark-600') +
              (!cfg ? ' opacity-50 cursor-not-allowed' : '')
            }
          >
            ≤
          </button>
        </div>
        <input
          type="number"
          value={value}
          step={step}
          min={bounds.min}
          max={bounds.max}
          onChange={(e) => handleValue(e.target.value)}
          placeholder={fallback ? String(fallback.value) : t('thresholdControl.placeholder')}
          aria-label={metricLabel}
          className="w-16 px-1.5 py-0.5 rounded border border-orange-200 dark:border-bark-500 bg-white dark:bg-bark-700 text-gray-800 dark:text-bark-100 tabular-nums focus:outline-none focus:ring-1 focus:ring-orange-400 text-[11px]"
        />
        {cfg && (
          <button
            type="button"
            onClick={() => setThreshold(metric, null)}
            aria-label={t('thresholdControl.clear')}
            className="text-[10px] text-gray-400 hover:text-orange-600 dark:hover:text-orange-400"
          >
            ✕
          </button>
        )}
      </div>
    )
  }
}
