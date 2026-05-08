import { useTranslation } from 'react-i18next'
import type { SimulationResult } from '../../types'
import type { LiveMetricKey } from '../../store/liveBatchStore'

interface Props {
  runs: SimulationResult[]
  /** Index of the run currently being shown in LiveScenePanel. */
  selectedIndex: number
  selectedMetric: LiveMetricKey
  onSelect: (index: number) => void
}

/**
 * Horizontal strip of completed-run chips. Each chip shows the run's
 * sample value for the currently selected metric, with the active run
 * highlighted. Clicking a chip rewinds the scene panel to that run.
 *
 * Visualises the *spread* across runs (chips with very different values
 * stand out) and gives the user a way to revisit any past run without
 * waiting for the loop to swap to it on its own.
 */
export default function RunThumbnailStrip({
  runs, selectedIndex, selectedMetric, onSelect,
}: Props) {
  const { t } = useTranslation('liveOverlay')

  if (runs.length === 0) return null

  return (
    <div className="rounded-lg border border-orange-100 dark:border-bark-600 bg-orange-50/40 dark:bg-bark-700/30 p-2">
      <div className="flex items-baseline justify-between mb-1.5">
        <span className="text-[11px] font-semibold text-orange-700 dark:text-orange-400">
          {t('scenePanel.thumbnailsLabel')}
        </span>
        <span className="text-[10px] text-gray-400 dark:text-bark-400">
          {t('scenePanel.thumbnailHint')}
        </span>
      </div>
      <div
        className="flex gap-1 overflow-x-auto pb-1"
        role="tablist"
        aria-label={t('scenePanel.thumbnailsLabel')}
      >
        {runs.map((run, idx) => {
          const value = run.metrics[selectedMetric] as unknown as number
          const isSelected = idx === selectedIndex
          return (
            <button
              key={idx}
              type="button"
              role="tab"
              aria-selected={isSelected}
              onClick={() => onSelect(idx)}
              className={
                'shrink-0 px-2 py-1 rounded text-[10px] font-mono tabular-nums border transition-colors ' +
                (isSelected
                  ? 'bg-orange-500 text-white border-orange-500'
                  : 'bg-white dark:bg-bark-700 text-gray-700 dark:text-bark-200 border-gray-200 dark:border-bark-500 hover:border-orange-400')
              }
              title={t('scenePanel.runLabel', { index: idx + 1 })}
            >
              <div className="text-[9px] opacity-70">#{idx + 1}</div>
              <div className="text-[10px] font-semibold">{Number.isFinite(value) ? value.toFixed(2) : '—'}</div>
            </button>
          )
        })}
      </div>
    </div>
  )
}
