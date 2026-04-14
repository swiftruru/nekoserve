import { useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import type { SnapshotSeries } from '../../utils/snapshotSeries'

interface Props {
  series: SnapshotSeries
  totalDuration: number
}

const CHART_W = 480
const CHART_H = 90
const PADDING_X = 8
const PADDING_Y = 10

/**
 * Mini time-series chart of the queue length L(t) across the whole
 * simulation. Shows the waveform that the single `avgWaitForSeat` KPI
 * hides: "the queue was usually 1-3 people but blew up to 12 at minute
 * 134 when the afternoon rush hit". Pairs with the Little's Law
 * expand-detail in Section 2.
 *
 * Highlights the single peak with a red dot + label so the moment is
 * immediately findable.
 */
export default function QueueTimeSeries({ series, totalDuration }: Props) {
  const { t } = useTranslation(['results', 'common'])

  const { polylinePoints, peakSim, peakQueue, yMax } = useMemo(() => {
    if (series.length === 0) {
      return {
        polylinePoints: '',
        peakSim: 0,
        peakQueue: 0,
        yMax: 1,
      }
    }
    let peak = series[0]
    let max = 0
    for (const s of series) {
      if (s.queueLen > max) max = s.queueLen
      if (s.queueLen > peak.queueLen) peak = s
    }
    const effectiveMax = Math.max(1, max)
    const innerW = CHART_W - PADDING_X * 2
    const innerH = CHART_H - PADDING_Y * 2
    const xScale = (simT: number) =>
      PADDING_X +
      (simT / Math.max(1, totalDuration)) * innerW
    const yScale = (q: number) =>
      PADDING_Y + innerH - (q / effectiveMax) * innerH
    const pts = series
      .map(
        (s) =>
          `${xScale(s.simTime).toFixed(1)},${yScale(s.queueLen).toFixed(1)}`,
      )
      .join(' ')
    return {
      polylinePoints: pts,
      peakSim: peak.simTime,
      peakQueue: peak.queueLen,
      yMax: effectiveMax,
    }
  }, [series, totalDuration])

  const peakX =
    PADDING_X +
    (peakSim / Math.max(1, totalDuration)) * (CHART_W - PADDING_X * 2)
  const peakY =
    PADDING_Y +
    (CHART_H - PADDING_Y * 2) -
    (peakQueue / yMax) * (CHART_H - PADDING_Y * 2)

  // Color by severity — direct mapping from queue depth to warning tone.
  const peakColor =
    peakQueue >= 8 ? '#dc2626' : peakQueue >= 4 ? '#f59e0b' : '#38bdf8'

  const minUnit = t('common:unit.min')

  return (
    <div className="rounded-xl border border-orange-100 bg-orange-50/40 p-3">
      <div className="flex items-baseline justify-between mb-2">
        <span className="text-xs font-semibold text-orange-700">
          {t('results:queueTimeSeries.title')}
        </span>
        <span className="text-[10px] text-gray-500 tabular-nums">
          {t('results:queueTimeSeries.yMax', { n: yMax })}
        </span>
      </div>

      <svg
        width="100%"
        viewBox={`0 0 ${CHART_W} ${CHART_H}`}
        preserveAspectRatio="none"
        className="block"
        role="img"
        aria-label={t('results:queueTimeSeries.title')}
      >
        {/* Backdrop */}
        <rect
          x={0}
          y={0}
          width={CHART_W}
          height={CHART_H}
          fill="#fff7ed"
          rx={6}
        />
        {/* Baseline grid line (bottom edge where queue = 0) */}
        <line
          x1={PADDING_X}
          y1={CHART_H - PADDING_Y}
          x2={CHART_W - PADDING_X}
          y2={CHART_H - PADDING_Y}
          stroke="#fed7aa"
          strokeDasharray="3 3"
          strokeWidth={0.5}
        />
        {/* Main polyline */}
        <polyline
          points={polylinePoints}
          fill="none"
          stroke="#fb923c"
          strokeWidth={1.5}
          strokeLinejoin="round"
        />
        {/* Peak marker */}
        {peakQueue > 0 && (
          <g>
            <line
              x1={peakX}
              y1={PADDING_Y}
              x2={peakX}
              y2={CHART_H - PADDING_Y}
              stroke={peakColor}
              strokeDasharray="2 2"
              strokeWidth={0.8}
              opacity={0.6}
            />
            <circle
              cx={peakX}
              cy={peakY}
              r={4}
              fill={peakColor}
              stroke="#fff"
              strokeWidth={1.2}
            />
          </g>
        )}
        {/* Axis labels: 0 and duration */}
        <text
          x={PADDING_X}
          y={CHART_H - 1}
          fontSize={7}
          fill="#9ca3af"
        >
          0
        </text>
        <text
          x={CHART_W - PADDING_X}
          y={CHART_H - 1}
          fontSize={7}
          fill="#9ca3af"
          textAnchor="end"
        >
          {totalDuration} {minUnit}
        </text>
      </svg>

      {peakQueue > 0 && (
        <div className="mt-1 text-[11px] text-gray-600 leading-snug">
          {t('results:queueTimeSeries.peakLabel', {
            n: peakQueue,
            t: peakSim.toFixed(0),
          })}
        </div>
      )}
    </div>
  )
}
