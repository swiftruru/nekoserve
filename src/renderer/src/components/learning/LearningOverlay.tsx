import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import type { EventLogItem, SimulationConfig } from '../../types'
import type { CafeState } from '../../utils/replay'
import type { SnapshotSeries } from '../../utils/snapshotSeries'
import ConceptEventClock from './ConceptEventClock'
import ConceptQueueLength from './ConceptQueueLength'
import ConceptLittlesLaw from './ConceptLittlesLaw'
import ConceptUtilization from './ConceptUtilization'

/**
 * Two difficulty levels for the live concept cards:
 *   - `expert`: full professional view with L/λ/W/ρ symbols, formulas,
 *     and mini time-series charts. Default — teachers can demo.
 *   - `friendly`: metaphor-driven beginner view (water cup, emoji queue,
 *     mood labels). No Greek letters, plain-language equations.
 *
 * Clicking the pill toggle flips the level for all four cards at once.
 * The "Details ▼" per-card expand still shows KaTeX formulas in both
 * modes so curious beginners can peek without being forced.
 */
export type LearningLevel = 'friendly' | 'expert'

interface LearningOverlayProps {
  open: boolean
  onToggle: () => void
  state: CafeState
  simTime: number
  series: SnapshotSeries
  config: SimulationConfig
  eventLog: readonly EventLogItem[]
  compact?: boolean
}

export default function LearningOverlay({
  open,
  onToggle,
  state,
  simTime,
  series,
  config,
  eventLog,
  compact = false,
}: LearningOverlayProps) {
  const { t } = useTranslation('learnMode')
  const [level, setLevel] = useState<LearningLevel>('expert')

  if (!open) return null

  const gridClass = compact
    ? 'grid grid-cols-1 sm:grid-cols-2 gap-2'
    : 'grid gap-3'
  const gridStyle = compact
    ? undefined
    : { gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))' }

  return (
    <div className="card">
      <div className="flex items-center gap-2 mb-2">
        <div className="flex items-center gap-1.5 min-w-0 flex-1">
          <span className={compact ? 'text-base' : 'text-lg'}>🎓</span>
          <div
            className={
              (compact ? 'text-xs' : 'text-sm') +
              ' font-semibold text-orange-700 truncate'
            }
          >
            {t('toggle')}
          </div>
        </div>

        {/* Level switcher: friendly ↔ expert */}
        <div className="flex items-center rounded-full border border-orange-200 bg-white overflow-hidden shrink-0">
          <button
            type="button"
            onClick={() => setLevel('friendly')}
            className={
              'px-2 py-0.5 text-[10px] font-semibold transition-colors ' +
              (level === 'friendly'
                ? 'bg-orange-500 text-white'
                : 'text-orange-700 hover:bg-orange-50')
            }
            aria-pressed={level === 'friendly'}
          >
            🐣 {t('level.friendly')}
          </button>
          <button
            type="button"
            onClick={() => setLevel('expert')}
            className={
              'px-2 py-0.5 text-[10px] font-semibold transition-colors ' +
              (level === 'expert'
                ? 'bg-orange-500 text-white'
                : 'text-orange-700 hover:bg-orange-50')
            }
            aria-pressed={level === 'expert'}
          >
            🎓 {t('level.expert')}
          </button>
        </div>

        <button
          type="button"
          onClick={onToggle}
          className="text-sm text-gray-400 hover:text-gray-600 shrink-0 leading-none px-1"
          aria-label={t('collapse')}
        >
          ✕
        </button>
      </div>

      <div className={gridClass} style={gridStyle}>
        <ConceptEventClock
          simTime={simTime}
          eventLog={eventLog}
          state={state}
          compact={compact}
          level={level}
        />
        <ConceptQueueLength
          simTime={simTime}
          series={series}
          state={state}
          config={config}
          compact={compact}
          level={level}
        />
        <ConceptLittlesLaw
          simTime={simTime}
          series={series}
          compact={compact}
          level={level}
        />
        <ConceptUtilization
          simTime={simTime}
          series={series}
          config={config}
          compact={compact}
          level={level}
        />
      </div>
    </div>
  )
}
