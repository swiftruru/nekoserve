import { useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import type { SimulationConfig } from '../../types'
import type { SnapshotSeries } from '../../utils/snapshotSeries'

interface Props {
  series: SnapshotSeries
  config: SimulationConfig
  totalDuration: number
}

const ROW_W = 480
const ROW_H = 34
const PADDING_X = 60
const PADDING_Y = 3

interface RowData {
  key: 'seat' | 'staff' | 'cat'
  labelKey: string
  color: string
  points: string
  avg: number
  peak: number
  peakAt: number
}

/**
 * Three stacked sparklines showing how seat / staff / cat utilization
 * evolved across the run. Each row shows:
 *   - a label column (left)
 *   - a filled area plot of utilization over time (middle)
 *   - a peak marker + average/peak text annotation
 *
 * The single averaged KPI card above says "staff 100%", but this
 * chart shows whether that means "busy the whole day" or "calm
 * morning, nuclear afternoon". Pedagogically, the shape of the curve
 * is often more informative than the average.
 */
export default function UtilizationTimeSeries({
  series,
  config,
  totalDuration,
}: Props) {
  const { t } = useTranslation(['results', 'common'])

  const rows = useMemo<RowData[]>(() => {
    if (series.length === 0) return []
    const innerW = ROW_W - PADDING_X - PADDING_Y
    const innerH = ROW_H - PADDING_Y * 2
    const span = Math.max(1, totalDuration)

    function build(
      key: 'seat' | 'staff' | 'cat',
      labelKey: string,
      color: string,
      capacity: number,
      extract: (s: SnapshotSeries[number]) => number,
    ): RowData {
      const cap = Math.max(1, capacity)
      let sum = 0
      let peakRatio = 0
      let peakAt = 0
      const pts: string[] = []
      for (const s of series) {
        const ratio = extract(s) / cap
        sum += ratio
        if (ratio > peakRatio) {
          peakRatio = ratio
          peakAt = s.simTime
        }
        const x = PADDING_X + (s.simTime / span) * innerW
        const y = PADDING_Y + innerH - Math.min(1, ratio) * innerH
        pts.push(`${x.toFixed(1)},${y.toFixed(1)}`)
      }
      const avg = series.length > 0 ? sum / series.length : 0
      return {
        key,
        labelKey,
        color,
        points: pts.join(' '),
        avg,
        peak: peakRatio,
        peakAt,
      }
    }

    return [
      build(
        'seat',
        'results:utilTimeSeries.seat',
        '#f97316',
        config.seatCount,
        (s) => s.seatsOccupied,
      ),
      build(
        'staff',
        'results:utilTimeSeries.staff',
        '#6366f1',
        config.staffCount,
        (s) => s.staffBusy,
      ),
      build(
        'cat',
        'results:utilTimeSeries.cat',
        '#ec4899',
        config.catCount,
        (s) => s.catsVisiting,
      ),
    ]
  }, [series, config, totalDuration])

  if (rows.length === 0) return null

  const minUnit = t('common:unit.min')

  return (
    <div className="rounded-xl border border-orange-100 bg-orange-50/40 p-3">
      <div className="text-xs font-semibold text-orange-700 mb-2">
        {t('results:utilTimeSeries.title')}
      </div>
      <div className="space-y-1">
        {rows.map((row) => {
          const innerW = ROW_W - PADDING_X - PADDING_Y
          const innerH = ROW_H - PADDING_Y * 2
          const span = Math.max(1, totalDuration)
          const peakX =
            PADDING_X + (row.peakAt / span) * innerW
          // Close the polyline into a filled shape down to the baseline.
          const filledArea =
            row.points +
            ` ${(PADDING_X + innerW).toFixed(1)},${(PADDING_Y + innerH).toFixed(1)}` +
            ` ${PADDING_X.toFixed(1)},${(PADDING_Y + innerH).toFixed(1)}`
          return (
            <svg
              key={row.key}
              width="100%"
              viewBox={`0 0 ${ROW_W} ${ROW_H}`}
              preserveAspectRatio="none"
              className="block"
            >
              {/* Row label on the left */}
              <text
                x={4}
                y={ROW_H / 2 + 3}
                fontSize={9}
                fill="#7c2d12"
                fontWeight={600}
              >
                {t(row.labelKey)}
              </text>
              {/* Plot area backdrop */}
              <rect
                x={PADDING_X}
                y={PADDING_Y}
                width={ROW_W - PADDING_X - PADDING_Y}
                height={ROW_H - PADDING_Y * 2}
                fill="#fff7ed"
                rx={3}
              />
              {/* Filled area under curve */}
              <polygon
                points={filledArea}
                fill={row.color}
                opacity={0.25}
              />
              {/* Line */}
              <polyline
                points={row.points}
                fill="none"
                stroke={row.color}
                strokeWidth={1.2}
                strokeLinejoin="round"
              />
              {/* Peak vertical dashed marker */}
              {row.peak > 0 && (
                <line
                  x1={peakX}
                  y1={PADDING_Y}
                  x2={peakX}
                  y2={ROW_H - PADDING_Y}
                  stroke={row.color}
                  strokeDasharray="2 2"
                  strokeWidth={0.6}
                  opacity={0.8}
                />
              )}
              {/* Avg/peak text on the right */}
              <text
                x={ROW_W - 4}
                y={ROW_H / 2 - 3}
                fontSize={7}
                fill="#9ca3af"
                textAnchor="end"
              >
                {t('results:utilTimeSeries.avg')} {(row.avg * 100).toFixed(0)}%
              </text>
              <text
                x={ROW_W - 4}
                y={ROW_H / 2 + 7}
                fontSize={7}
                fill="#9ca3af"
                textAnchor="end"
              >
                {t('results:utilTimeSeries.peak')} {(row.peak * 100).toFixed(0)}%
                {' @ '}
                {row.peakAt.toFixed(0)} {minUnit}
              </text>
            </svg>
          )
        })}
      </div>
    </div>
  )
}
