import { useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import type { CustomerMetrics } from '../../utils/customerMetrics'
import { binValues } from '../../utils/customerMetrics'

interface Props {
  customers: readonly CustomerMetrics[]
  /** Which timing field to histogram. Defaults to `waitForSeat`. */
  field?: 'waitForSeat' | 'waitForOrder' | 'totalStay'
}

const CHART_W = 480
const CHART_H = 130
const PADDING_X = 8
const PADDING_Y_TOP = 8
const PADDING_Y_BOTTOM = 26

/**
 * 10-bin histogram of per-customer wait times. The core teaching point
 * is that the average hides variance: a run with avgWaitForSeat = 15
 * minutes might have half its customers seated in under 5 minutes and
 * the other half waiting 30+. Seeing the shape (especially the long
 * tail) is why queueing theory cares about percentiles, not just means.
 *
 * Default bin count follows `sqrt(N)` with bounds [8, 16] so tiny runs
 * don't look too sparse and huge runs don't smooth out the long tail.
 */
export default function WaitHistogram({ customers, field = 'waitForSeat' }: Props) {
  const { t } = useTranslation(['results', 'common'])

  const { histogram, maxCount } = useMemo(() => {
    const raw = customers.map((c) => c[field])
    const n = raw.filter((v) => v !== null).length
    const binCount = Math.max(8, Math.min(16, Math.ceil(Math.sqrt(Math.max(1, n)))))
    const hg = binValues(raw, binCount)
    let max = 0
    for (const c of hg.counts) if (c > max) max = c
    return { histogram: hg, maxCount: Math.max(1, max) }
  }, [customers, field])

  const minUnit = t('common:unit.min')
  const titleKey =
    field === 'waitForSeat'
      ? 'results:waitHistogram.titleWaitSeat'
      : field === 'waitForOrder'
      ? 'results:waitHistogram.titleWaitOrder'
      : 'results:waitHistogram.titleStay'

  if (histogram.total === 0) {
    return (
      <div className="rounded-xl border border-orange-100 bg-orange-50/40 p-3">
        <div className="text-xs font-semibold text-orange-700 mb-2">
          {t(titleKey)}
        </div>
        <div className="text-[11px] text-gray-400 text-center py-4">
          {t('results:waitHistogram.empty')}
        </div>
      </div>
    )
  }

  const innerW = CHART_W - PADDING_X * 2
  const innerH = CHART_H - PADDING_Y_TOP - PADDING_Y_BOTTOM
  const barW = innerW / histogram.binCount

  // Mean line x-position
  const meanX =
    PADDING_X +
    ((histogram.mean - histogram.min) / Math.max(0.001, histogram.max - histogram.min)) *
      innerW

  return (
    <div className="rounded-xl border border-orange-100 bg-orange-50/40 p-3">
      <div className="flex items-baseline justify-between mb-2">
        <span className="text-xs font-semibold text-orange-700">
          {t(titleKey)}
        </span>
        <span className="text-[10px] text-gray-500 tabular-nums">
          {t('results:waitHistogram.totalCount', { n: histogram.total })}
        </span>
      </div>

      <svg
        width="100%"
        viewBox={`0 0 ${CHART_W} ${CHART_H}`}
        preserveAspectRatio="none"
        className="block"
        role="img"
        aria-label={t(titleKey)}
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
        {/* Baseline */}
        <line
          x1={PADDING_X}
          y1={CHART_H - PADDING_Y_BOTTOM}
          x2={CHART_W - PADDING_X}
          y2={CHART_H - PADDING_Y_BOTTOM}
          stroke="#fed7aa"
          strokeWidth={0.8}
        />
        {/* Bars */}
        {histogram.counts.map((count, i) => {
          const h = (count / maxCount) * innerH
          const x = PADDING_X + i * barW
          const y = CHART_H - PADDING_Y_BOTTOM - h
          const binStart = histogram.edges[i]
          const binEnd = histogram.edges[i + 1]
          return (
            <g key={i}>
              <rect
                x={x + 1}
                y={y}
                width={Math.max(1, barW - 2)}
                height={h}
                fill="#fb923c"
                rx={1}
              >
                <title>
                  {t('results:waitHistogram.tooltip', {
                    from: binStart.toFixed(1),
                    to: binEnd.toFixed(1),
                    count,
                    unit: minUnit,
                  })}
                </title>
              </rect>
              {count > 0 && h > 10 && (
                <text
                  x={x + barW / 2}
                  y={y - 2}
                  fontSize={7}
                  fill="#7c2d12"
                  textAnchor="middle"
                >
                  {count}
                </text>
              )}
            </g>
          )
        })}
        {/* Mean line */}
        <line
          x1={meanX}
          y1={PADDING_Y_TOP}
          x2={meanX}
          y2={CHART_H - PADDING_Y_BOTTOM}
          stroke="#ef4444"
          strokeDasharray="3 2"
          strokeWidth={1}
        />
        <text
          x={meanX + 3}
          y={PADDING_Y_TOP + 7}
          fontSize={8}
          fill="#ef4444"
          fontWeight={700}
        >
          {t('results:waitHistogram.meanLabel', {
            value: histogram.mean.toFixed(1),
          })}
        </text>
        {/* X-axis labels: min and max */}
        <text
          x={PADDING_X}
          y={CHART_H - PADDING_Y_BOTTOM + 10}
          fontSize={7}
          fill="#9ca3af"
        >
          {histogram.min.toFixed(1)} {minUnit}
        </text>
        <text
          x={CHART_W - PADDING_X}
          y={CHART_H - PADDING_Y_BOTTOM + 10}
          fontSize={7}
          fill="#9ca3af"
          textAnchor="end"
        >
          {histogram.max.toFixed(1)} {minUnit}
        </text>
      </svg>

      <div className="mt-1 text-[11px] text-gray-600 leading-snug">
        {t('results:waitHistogram.hint')}
      </div>
    </div>
  )
}
