import { useTranslation } from 'react-i18next'
import type { SimulationConfig } from '../../types'
import {
  snapshotAt,
  type SnapshotSeries,
} from '../../utils/snapshotSeries'
import { BlockMath } from '../Math'
import ConceptCard from './ConceptCard'
import type { LearningLevel } from './types'

interface Props {
  simTime: number
  series: SnapshotSeries
  config: SimulationConfig
  compact?: boolean
  level?: LearningLevel
}

function moodFor(ratio: number): { emoji: string; key: string } {
  if (ratio >= 0.85) return { emoji: '😰', key: 'concepts.utilization.moods.hot' }
  if (ratio >= 0.5) return { emoji: '😅', key: 'concepts.utilization.moods.warm' }
  if (ratio > 0) return { emoji: '😊', key: 'concepts.utilization.moods.calm' }
  return { emoji: '😌', key: 'concepts.utilization.moods.idle' }
}

interface Row {
  key: 'seat' | 'staff' | 'cat'
  labelKey: string
  ratio: number
  used: number
  capacity: number
}

export default function ConceptUtilization({
  simTime,
  series,
  config,
  compact = false,
  level = 'expert',
}: Props) {
  const { t } = useTranslation('learnMode')
  const snap = snapshotAt(series, simTime)

  const rows: Row[] = [
    {
      key: 'seat',
      labelKey: 'concepts.utilization.seat',
      ratio: config.seatCount > 0 ? snap.seatsOccupied / config.seatCount : 0,
      used: snap.seatsOccupied,
      capacity: config.seatCount,
    },
    {
      key: 'staff',
      labelKey: 'concepts.utilization.staff',
      ratio: config.staffCount > 0 ? snap.staffBusy / config.staffCount : 0,
      used: snap.staffBusy,
      capacity: config.staffCount,
    },
    {
      key: 'cat',
      labelKey: 'concepts.utilization.cat',
      ratio: config.catCount > 0 ? snap.catsVisiting / config.catCount : 0,
      used: snap.catsVisiting,
      capacity: config.catCount,
    },
  ]

  // Identify the bottleneck (highest utilization). Only flag a real
  // bottleneck once any resource is at least 50% used, so the marker
  // doesn't chase 0 / 0 / 0 early in the run.
  const maxRatio = Math.max(...rows.map((r) => r.ratio))
  const bottleneckKey =
    maxRatio >= 0.5 ? rows.find((r) => r.ratio === maxRatio)?.key : null

  const barH = compact ? 'h-1.5' : 'h-2'
  const rowGap = compact ? 'space-y-1' : 'space-y-2'

  return (
    <ConceptCard
      icon="🔥"
      title={t('concepts.utilization.title')}
      summary={t('concepts.utilization.summary')}
      compact={compact}
      level={level}
      beginner={
        <div className={rowGap}>
          {rows.map((row) => {
            const isBottleneck = row.key === bottleneckKey
            const pct = Math.round(row.ratio * 100)
            const barColor =
              row.ratio >= 0.85
                ? '#ef4444'
                : row.ratio >= 0.5
                ? '#f59e0b'
                : '#10b981'
            const mood = moodFor(row.ratio)
            return (
              <div key={row.key}>
                <div className="flex items-center justify-between text-[10px] mb-0.5 gap-1">
                  <span
                    className={
                      'flex-1 min-w-0 truncate ' +
                      (isBottleneck
                        ? 'text-red-700 font-bold'
                        : 'text-gray-600')
                    }
                  >
                    {t(row.labelKey)}
                    {level === 'friendly' && (
                      <span className="ml-1">
                        {mood.emoji} {t(mood.key)}
                      </span>
                    )}
                    {isBottleneck && ' 🔥'}
                  </span>
                  <span className="tabular-nums text-gray-500 shrink-0">
                    {level === 'friendly'
                      ? `${row.used}/${row.capacity}`
                      : `${row.used}/${row.capacity} · ${pct}%`}
                  </span>
                </div>
                <div
                  className={`${barH} rounded-full bg-orange-100 overflow-hidden`}
                >
                  <div
                    className="h-full rounded-full"
                    style={{
                      width: `${Math.min(100, pct)}%`,
                      background: barColor,
                      transition: 'width 200ms ease-out',
                    }}
                  />
                </div>
              </div>
            )
          })}
          {level === 'friendly' && (
            <div className="text-[10px] text-gray-500 leading-snug mt-1">
              {t('concepts.utilization.friendlyHint')}
            </div>
          )}
        </div>
      }
      expert={
        level === 'friendly' ? (
          <>
            <div className="rounded-md bg-white border border-orange-200 px-2 py-1.5 text-center text-[11px] font-semibold text-orange-700 leading-snug">
              {t('concepts.utilization.friendlyFormula')}
            </div>
            <p>{t('concepts.utilization.friendlyExpertDef')}</p>
            <p className="text-gray-500">
              {t('concepts.utilization.friendlyExpertWhy')}
            </p>
          </>
        ) : (
          <>
            <BlockMath formula="\rho = \frac{\text{busy time}}{c \cdot T}" />
            <p>{t('concepts.utilization.expertDef')}</p>
            <p className="text-gray-500">
              {t('concepts.utilization.expertWhy')}
            </p>
          </>
        )
      }
    />
  )
}
