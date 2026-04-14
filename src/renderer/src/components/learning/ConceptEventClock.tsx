import { useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import type { EventLogItem } from '../../types'
import type { CafeState } from '../../utils/replay'
import { BlockMath } from '../Math'
import ConceptCard from './ConceptCard'
import type { LearningLevel } from './types'

interface Props {
  simTime: number
  eventLog: readonly EventLogItem[]
  state: CafeState
  compact?: boolean
  level?: LearningLevel
}

const CHART_W = 240
const CHART_H_FULL = 40
const CHART_H_COMPACT = 32
const PADDING_X = 6
const TRACK_Y_FULL = 22
const TRACK_Y_COMPACT = 18
const RECENT_COUNT = 9

export default function ConceptEventClock({
  simTime,
  eventLog,
  state,
  compact = false,
  level = 'expert',
}: Props) {
  const { t } = useTranslation('learnMode')
  const chartH = compact ? CHART_H_COMPACT : CHART_H_FULL
  const trackY = compact ? TRACK_Y_COMPACT : TRACK_Y_FULL

  const { shown, minT, maxT, nextEvent } = useMemo(() => {
    if (eventLog.length === 0) {
      return {
        shown: [] as EventLogItem[],
        minT: 0,
        maxT: 1,
        nextEvent: null as EventLogItem | null,
      }
    }
    // Find the first event strictly after the current sim-time.
    let nextIdx = eventLog.findIndex((e) => e.timestamp > simTime)
    if (nextIdx === -1) nextIdx = eventLog.length
    // Show a window of events centred on the cursor: half behind, half
    // ahead. This way the cursor usually sits near the middle.
    const half = Math.floor(RECENT_COUNT / 2)
    const start = Math.max(0, nextIdx - half - 1)
    const end = Math.min(eventLog.length, start + RECENT_COUNT)
    const slice = eventLog.slice(start, end)
    const minT = slice[0]?.timestamp ?? 0
    const maxT = slice[slice.length - 1]?.timestamp ?? 1
    return {
      shown: slice,
      minT,
      maxT: maxT === minT ? minT + 1 : maxT,
      nextEvent: eventLog[nextIdx] ?? null,
    }
  }, [eventLog, simTime])

  const innerW = CHART_W - PADDING_X * 2
  const xScaleT = (ts: number) =>
    PADDING_X + ((ts - minT) / (maxT - minT)) * innerW
  const cursorX = Math.max(
    PADDING_X,
    Math.min(CHART_W - PADDING_X, xScaleT(Math.max(minT, Math.min(maxT, simTime)))),
  )

  const nextDelta = nextEvent ? Math.max(0, nextEvent.timestamp - simTime) : null

  const friendlyView = (
    <div className="text-center">
      <div className="text-[10px] text-gray-500">
        {t('concepts.eventClock.friendlyNext')}
      </div>
      <div className="mt-0.5 text-2xl">⚡</div>
      <div className="mt-0.5 text-sm font-bold tabular-nums text-orange-700">
        {nextDelta !== null ? `+${nextDelta.toFixed(1)}` : '—'}
        <span className="ml-0.5 text-[10px] font-normal text-gray-500">
          {t('concepts.eventClock.unitMin')}
        </span>
      </div>
      <div className="mt-1 text-[10px] text-gray-600 leading-snug px-1">
        {t('concepts.eventClock.friendlyHint')}
      </div>
    </div>
  )

  const expertView = (
    <div>
      <div className="text-center">
        <span className="text-[9px] text-gray-500">
          {t('concepts.eventClock.nextIn')}
        </span>{' '}
        <span
          className={
            (compact ? 'text-base' : 'text-lg') +
            ' font-bold tabular-nums text-orange-700'
          }
        >
          {nextDelta !== null ? `+${nextDelta.toFixed(2)}` : '—'}
        </span>
        <span className="ml-0.5 text-[9px] text-gray-500">
          {t('concepts.eventClock.unitMin')}
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
        <line
          x1={PADDING_X}
          y1={trackY}
          x2={CHART_W - PADDING_X}
          y2={trackY}
          stroke="#fdba74"
          strokeWidth={1}
        />
        {shown.map((e, i) => {
          const x = xScaleT(e.timestamp)
          const past = e.timestamp <= simTime
          return (
            <circle
              key={`${e.timestamp}-${i}`}
              cx={x}
              cy={trackY}
              r={past ? 2 : 3}
              fill={past ? '#fdba74' : '#fb923c'}
              stroke="#fff"
              strokeWidth={0.8}
            />
          )
        })}
        <path
          d={`M${cursorX - 4},${trackY - 10} L${cursorX + 4},${
            trackY - 10
          } L${cursorX},${trackY - 2} Z`}
          fill="#ea580c"
        />
      </svg>
      <div className="text-center text-[9px] text-gray-500 mt-0.5 tabular-nums">
        t = {state.time.toFixed(1)} min · {state.appliedCount}/
        {eventLog.length} {t('concepts.eventClock.eventsApplied')}
      </div>
    </div>
  )

  const friendlyExpert = (
    <>
      <div className="rounded-md bg-white border border-orange-200 px-2 py-1.5 text-center text-[11px] font-semibold text-orange-700 leading-snug">
        {t('concepts.eventClock.friendlyFormula')}
      </div>
      <p>{t('concepts.eventClock.friendlyExpertDef')}</p>
      <p className="text-gray-500">
        {t('concepts.eventClock.friendlyExpertWhy')}
      </p>
    </>
  )

  const expertExpert = (
    <>
      <BlockMath formula="t_{\text{next}} = \min\{t_{\text{arrive}},\, t_{\text{seat}},\, t_{\text{order}},\, \dots\}" />
      <p>{t('concepts.eventClock.expertDef')}</p>
      <p className="text-gray-500">{t('concepts.eventClock.expertWhy')}</p>
    </>
  )

  return (
    <ConceptCard
      icon="⏱️"
      title={t('concepts.eventClock.title')}
      summary={t('concepts.eventClock.summary')}
      compact={compact}
      level={level}
      beginner={level === 'friendly' ? friendlyView : expertView}
      expert={level === 'friendly' ? friendlyExpert : expertExpert}
    />
  )
}
