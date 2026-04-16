import { useTranslation } from 'react-i18next'
import {
  avgOverWindow,
  deltaOverWindow,
  type SnapshotSeries,
} from '../../utils/snapshotSeries'
import { BlockMath } from '../Math'
import ConceptCard from './ConceptCard'
import type { LearningLevel } from './types'

interface Props {
  simTime: number
  series: SnapshotSeries
  compact?: boolean
  level?: LearningLevel
}

/** Minimum sim-time window for the rate computation so the very first
 *  minutes don't produce wild λ / W spikes. */
const MIN_WINDOW_MIN = 15
/** Preferred window when enough data exists. */
const PREFERRED_WINDOW_MIN = 60

export default function ConceptLittlesLaw({
  simTime,
  series,
  compact = false,
  level = 'expert',
}: Props) {
  const { t } = useTranslation('learnMode')

  const effectiveWindow = Math.min(
    PREFERRED_WINDOW_MIN,
    Math.max(MIN_WINDOW_MIN, simTime),
  )
  const from = Math.max(0, simTime - effectiveWindow)

  // Time-averaged queue length L over the window.
  const L = avgOverWindow(series, 'queueLen', from, simTime)
  // Arrival rate λ = arrivals in window / window length (customers/min).
  const windowLen = simTime - from
  const arrivals = deltaOverWindow(series, 'arrived', from, simTime)
  const lambda = windowLen > 0 ? arrivals / windowLen : 0
  // Predicted wait from Little's Law (L = λW  →  W = L / λ).
  const W = lambda > 0 ? L / lambda : 0

  // Light sanity check: does L ≈ λW? (It always does by construction
  // when W = L/λ, but we show a check mark to reinforce the identity.)
  const lhs = L
  const rhs = lambda * W
  const withinTolerance =
    lhs === 0 && rhs === 0 ? true : Math.abs(lhs - rhs) / Math.max(lhs, 0.001) < 0.2
  const warmingUp = simTime < MIN_WINDOW_MIN

  // Cup fill level for the friendly water-cup metaphor. Scale L against
  // a reference max so the water level is readable even when the queue
  // is tiny. Max = larger of 5 or 1.3*L so the cup never overflows.
  const cupRefMax = Math.max(5, L * 1.3)
  const cupFillPct = Math.min(100, Math.max(0, (L / cupRefMax) * 100))

  const friendlyView = (
    <div>
      {/* Water cup SVG: drops at top = λ, cup body = L, drain at bottom = W */}
      <div className="flex items-center justify-center gap-3">
        <div className="flex flex-col items-center text-center">
          <span className="text-[9px] text-gray-500 dark:text-bark-300">
            {t('concepts.littlesLaw.friendlyIn')}
          </span>
          <span className="text-sm font-bold tabular-nums text-sky-600">
            💧 {lambda.toFixed(2)}
          </span>
          <span className="text-[9px] text-gray-500 dark:text-bark-300">
            {t('concepts.littlesLaw.unitPerMin')}
          </span>
        </div>

        <svg width="46" height="58" viewBox="0 0 46 58" className="shrink-0">
          {/* Cup outline */}
          <path
            d="M 6 10 L 10 52 Q 10 54 12 54 L 34 54 Q 36 54 36 52 L 40 10"
            fill="none"
            stroke="#fb923c"
            strokeWidth="1.8"
            strokeLinejoin="round"
          />
          {/* Rim */}
          <line x1="5" y1="10" x2="41" y2="10" stroke="#fb923c" strokeWidth="1.8" />
          {/* Water fill */}
          <clipPath id="cup-clip">
            <path d="M 7 11 L 10.5 52 Q 11 53 12.5 53 L 33.5 53 Q 35 53 35.5 52 L 39 11 Z" />
          </clipPath>
          <rect
            x="0"
            y={11 + (42 * (100 - cupFillPct)) / 100}
            width="46"
            height="46"
            fill="#7dd3fc"
            clipPath="url(#cup-clip)"
          >
            <animate
              attributeName="opacity"
              values="0.7;0.9;0.7"
              dur="2.4s"
              repeatCount="indefinite"
            />
          </rect>
          {/* Current count overlay — uses stroke for contrast on any background */}
          <text
            x="23"
            y="36"
            textAnchor="middle"
            fontSize="14"
            fontWeight="700"
            fill="#0c4a6e"
            stroke="#fff"
            strokeWidth="2.5"
            paintOrder="stroke"
          >
            {L.toFixed(1)}
          </text>
        </svg>

        <div className="flex flex-col items-center text-center">
          <span className="text-[9px] text-gray-500 dark:text-bark-300">
            {t('concepts.littlesLaw.friendlyStay')}
          </span>
          <span className="text-sm font-bold tabular-nums text-amber-600">
            ⏳ {W.toFixed(1)}
          </span>
          <span className="text-[9px] text-gray-500 dark:text-bark-300">
            {t('concepts.littlesLaw.unitMin')}
          </span>
        </div>
      </div>

      <div className="mt-1 text-center text-[10px] text-gray-700 dark:text-bark-200 leading-snug">
        {t('concepts.littlesLaw.friendlyEquation', {
          lambda: lambda.toFixed(2),
          w: W.toFixed(1),
          l: L.toFixed(1),
        })}
      </div>
      {warmingUp && (
        <div className="mt-1 text-[10px] text-gray-400 dark:text-bark-400 text-center">
          {t('concepts.littlesLaw.warmingUp')}
        </div>
      )}
    </div>
  )

  const expertView = (
    <div>
      <div className="grid grid-cols-3 gap-1 text-center">
        <Metric
          symbol="L"
          value={L.toFixed(1)}
          unit={t('concepts.littlesLaw.unitPeople')}
          compact={compact}
        />
        <Metric
          symbol="λ"
          value={lambda.toFixed(2)}
          unit={t('concepts.littlesLaw.unitPerMin')}
          compact={compact}
        />
        <Metric
          symbol="W"
          value={W.toFixed(1)}
          unit={t('concepts.littlesLaw.unitMin')}
          compact={compact}
        />
      </div>
      <div className="mt-2 text-center text-[11px] tabular-nums text-gray-700 dark:text-bark-200">
        {L.toFixed(1)} = {lambda.toFixed(2)} × {W.toFixed(1)}
        <span
          className={
            'ml-1 ' +
            (warmingUp
              ? 'text-gray-400 dark:text-bark-400'
              : withinTolerance
              ? 'text-green-600 font-bold'
              : 'text-amber-600')
          }
        >
          {warmingUp ? '…' : withinTolerance ? '✓' : '≈'}
        </span>
      </div>
      {warmingUp && (
        <div className="mt-1 text-[10px] text-gray-400 dark:text-bark-400 text-center">
          {t('concepts.littlesLaw.warmingUp')}
        </div>
      )}
    </div>
  )

  const friendlyExpert = (
    <>
      <div className="rounded-md bg-white dark:bg-bark-700 border border-orange-200 dark:border-bark-500 px-2 py-1.5 text-center text-[11px] font-semibold text-orange-700 leading-snug">
        {t('concepts.littlesLaw.friendlyFormula')}
      </div>
      <p>{t('concepts.littlesLaw.friendlyExpertDef')}</p>
      <p className="text-gray-500 dark:text-bark-300">
        {t('concepts.littlesLaw.friendlyExpertWhy')}
      </p>
    </>
  )

  const expertExpert = (
    <>
      <BlockMath formula="L = \lambda \cdot W" />
      <p>{t('concepts.littlesLaw.expertDef')}</p>
      <p className="text-gray-500 dark:text-bark-300">
        {t('concepts.littlesLaw.expertWhy')}
      </p>
    </>
  )

  return (
    <ConceptCard
      icon="⚖️"
      title={t('concepts.littlesLaw.title')}
      summary={t('concepts.littlesLaw.summary')}
      compact={compact}
      level={level}
      beginner={level === 'friendly' ? friendlyView : expertView}
      expert={level === 'friendly' ? friendlyExpert : expertExpert}
    />
  )
}

function Metric({
  symbol,
  value,
  unit,
  compact,
}: {
  symbol: string
  value: string
  unit: string
  compact: boolean
}) {
  return (
    <div>
      <div className="text-[9px] italic text-gray-500 dark:text-bark-300">{symbol}</div>
      <div
        className={
          (compact ? 'text-sm' : 'text-base') +
          ' font-bold tabular-nums text-orange-700 dark:text-orange-400 leading-tight'
        }
      >
        {value}
      </div>
      <div className="text-[8px] text-gray-500 dark:text-bark-300 leading-none">{unit}</div>
    </div>
  )
}
