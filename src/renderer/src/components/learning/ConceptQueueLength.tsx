import { useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import type { SimulationConfig } from '../../types'
import type { CafeState } from '../../utils/replay'
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
  state: CafeState
  config: SimulationConfig
  compact?: boolean
  level?: LearningLevel
}

const CHART_W = 240
const CHART_H_FULL = 56
const CHART_H_COMPACT = 44
const PADDING_X = 4
const PADDING_Y = 4

export default function ConceptQueueLength({
  simTime,
  series,
  state,
  config,
  compact = false,
  level = 'expert',
}: Props) {
  const { t } = useTranslation('learnMode')
  const chartH = compact ? CHART_H_COMPACT : CHART_H_FULL

  // Build the polyline once per series. The current-time marker
  // is a separate element that moves as simTime advances, so the
  // chart shape itself can be memoized and stays stable.
  const { polylinePoints, yMax } = useMemo(() => {
    if (series.length === 0) {
      return { polylinePoints: '', yMax: 1 }
    }
    const maxQ = Math.max(3, ...series.map((s) => s.queueLen))
    const innerW = CHART_W - PADDING_X * 2
    const innerH = chartH - PADDING_Y * 2
    const xScale = (simT: number) =>
      PADDING_X +
      (simT / Math.max(1, config.simulationDuration)) * innerW
    const yScale = (q: number) =>
      PADDING_Y + innerH - (q / maxQ) * innerH
    const pts = series
      .map((s) => `${xScale(s.simTime).toFixed(1)},${yScale(s.queueLen).toFixed(1)}`)
      .join(' ')
    return { polylinePoints: pts, yMax: maxQ }
  }, [series, config.simulationDuration, chartH])

  const current = snapshotAt(series, simTime)
  const currentX =
    PADDING_X +
    (simTime / Math.max(1, config.simulationDuration)) *
      (CHART_W - PADDING_X * 2)
  const currentY =
    PADDING_Y +
    (chartH - PADDING_Y * 2) -
    (current.queueLen / yMax) * (chartH - PADDING_Y * 2)

  // Color the current dot by how long the queue is.
  const liveQ = state.queueSeat.length
  const dotColor =
    liveQ >= 8 ? '#ef4444' : liveQ >= 4 ? '#f59e0b' : '#38bdf8'

  // Friendly view: literal emoji queue. Cap at 12 glyphs so we don't
  // wrap 30+ people into three rows of tiny faces.
  const FRIENDLY_CAP = 12
  const emojiCount = Math.min(liveQ, FRIENDLY_CAP)
  const overflow = Math.max(0, liveQ - FRIENDLY_CAP)
  const friendlyMood =
    liveQ >= 8 ? '😰' : liveQ >= 4 ? '😓' : liveQ > 0 ? '🙂' : '😌'

  const friendlyView = (
    <div>
      <div className="text-center">
        <span className="text-lg">{friendlyMood}</span>
        <span className="ml-1 text-sm font-bold tabular-nums text-orange-700">
          {liveQ}
        </span>
        <span className="ml-1 text-[10px] text-gray-500">
          {t('concepts.queueLength.people')}
        </span>
      </div>
      <div className="mt-1 text-center leading-none break-all">
        {emojiCount === 0 ? (
          <span className="text-[10px] text-gray-400">
            {t('concepts.queueLength.emptyQueue')}
          </span>
        ) : (
          <span className="text-sm">
            {'👤'.repeat(emojiCount)}
            {overflow > 0 && (
              <span className="text-[10px] text-gray-500 ml-1">
                +{overflow}
              </span>
            )}
          </span>
        )}
      </div>
      <div className="mt-1 text-[10px] text-gray-500 text-center leading-snug">
        {t('concepts.queueLength.friendlyPeak', { n: yMax })}
      </div>
    </div>
  )

  const expertView = (
    <div>
      <div className="text-center">
        <span
          className={
            (compact ? 'text-base' : 'text-lg') +
            ' font-bold tabular-nums text-orange-700'
          }
        >
          {liveQ}
        </span>
        <span
          className={
            (compact ? 'ml-1 text-[10px]' : 'ml-1 text-xs') +
            ' text-gray-500'
          }
        >
          {t('concepts.queueLength.people')}
        </span>
      </div>
      <svg
        width="100%"
        viewBox={`0 0 ${CHART_W} ${chartH}`}
        preserveAspectRatio="none"
        className="mt-1"
      >
        <rect
          x={0}
          y={0}
          width={CHART_W}
          height={chartH}
          fill="#fff7ed"
          rx={4}
        />
        <polyline
          points={polylinePoints}
          fill="none"
          stroke="#fb923c"
          strokeWidth={1.5}
          strokeLinejoin="round"
        />
        <circle
          cx={currentX}
          cy={currentY}
          r={3.5}
          fill={dotColor}
          stroke="#fff"
          strokeWidth={1}
        />
      </svg>
      <div className="flex justify-between text-[9px] text-gray-400 mt-0.5 tabular-nums">
        <span>0</span>
        <span>{t('concepts.queueLength.yMax', { n: yMax })}</span>
      </div>
    </div>
  )

  const friendlyExpert = (
    <>
      <div className="rounded-md bg-white border border-orange-200 px-2 py-1.5 text-center text-[11px] font-semibold text-orange-700 leading-snug">
        {t('concepts.queueLength.friendlyFormula')}
      </div>
      <p>{t('concepts.queueLength.friendlyExpertDef')}</p>
      <p className="text-gray-500">
        {t('concepts.queueLength.friendlyExpertWhy')}
      </p>
    </>
  )

  const expertExpert = (
    <>
      <BlockMath formula="\bar{L} = \frac{1}{T} \int_{0}^{T} L(t)\, dt" />
      <p>{t('concepts.queueLength.expertDef')}</p>
      <p className="text-gray-500">
        {t('concepts.queueLength.expertWhy')}
      </p>
    </>
  )

  return (
    <ConceptCard
      icon="📈"
      title={t('concepts.queueLength.title')}
      summary={t('concepts.queueLength.summary')}
      compact={compact}
      level={level}
      beginner={level === 'friendly' ? friendlyView : expertView}
      expert={level === 'friendly' ? friendlyExpert : expertExpert}
    />
  )
}
