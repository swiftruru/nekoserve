import { useEffect, useRef } from 'react'
import { useTranslation } from 'react-i18next'
import { LIVE_METRIC_KEYS, type LiveMetricKey } from '../../store/liveBatchStore'

interface Props {
  selected: LiveMetricKey[]
  onChange: (next: LiveMetricKey[]) => void
  onClose: () => void
}

/**
 * Floating popover that lists every metric available on the live page
 * and lets the user pick which ones to show in the small-multiples
 * grid. Closes when the user clicks outside or presses Esc.
 *
 * The selection is the single source of truth — the parent
 * (LiveBatchPage) owns state and persistence, this component is just a
 * controlled checkbox UI.
 */
export default function MetricSelectionPanel({ selected, onChange, onClose }: Props) {
  const { t } = useTranslation('liveOverlay')
  const ref = useRef<HTMLDivElement>(null)

  // Close on Esc.
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [onClose])

  // Close on click-outside.
  useEffect(() => {
    function onClick(e: MouseEvent) {
      if (!ref.current) return
      if (!ref.current.contains(e.target as Node)) onClose()
    }
    // Defer registration by one tick so the click that opened the panel
    // doesn't immediately close it.
    const t = setTimeout(() => document.addEventListener('mousedown', onClick), 0)
    return () => {
      clearTimeout(t)
      document.removeEventListener('mousedown', onClick)
    }
  }, [onClose])

  function toggle(key: LiveMetricKey) {
    if (selected.includes(key)) {
      // Don't allow zero metrics — that leaves the page empty.
      if (selected.length <= 1) return
      onChange(selected.filter((k) => k !== key))
    } else {
      onChange([...selected, key])
    }
  }

  const selectedSet = new Set<LiveMetricKey>(selected)

  return (
    <div
      ref={ref}
      role="dialog"
      aria-label={t('smallMultiples.configureTitle')}
      className="absolute right-0 mt-2 w-80 max-h-[420px] overflow-y-auto z-30 rounded-xl border border-orange-200 dark:border-bark-500 bg-white dark:bg-bark-700 shadow-lg p-3"
    >
      <div className="flex items-baseline justify-between mb-2">
        <span className="text-sm font-semibold text-orange-700 dark:text-orange-400">
          {t('smallMultiples.configureTitle')}
        </span>
        <button
          type="button"
          onClick={onClose}
          className="text-xs text-gray-400 hover:text-gray-600 dark:hover:text-bark-200"
          aria-label={t('close')}
        >
          ✕
        </button>
      </div>
      <p className="text-[11px] text-gray-500 dark:text-bark-300 mb-3">
        {t('smallMultiples.configureHint')}
      </p>
      <ul className="space-y-1">
        {LIVE_METRIC_KEYS.map((key) => {
          const checked = selectedSet.has(key)
          return (
            <li key={key}>
              <label className="flex items-center gap-2 px-2 py-1 rounded hover:bg-orange-50 dark:hover:bg-bark-600 cursor-pointer">
                <input
                  type="checkbox"
                  checked={checked}
                  onChange={() => toggle(key)}
                  className="accent-orange-500"
                />
                <span className="text-sm text-gray-700 dark:text-bark-100">
                  {t(`metric.${key}`, { defaultValue: key })}
                </span>
              </label>
            </li>
          )
        })}
      </ul>
    </div>
  )
}
