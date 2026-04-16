import { useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import type { CustomerMetrics } from '../../utils/customerMetrics'
import { binValues } from '../../utils/customerMetrics'

interface Props {
  customers: readonly CustomerMetrics[]
}

const CHART_W = 480
const CHART_H = 110
const LABEL_COL_W = 66
const PADDING_X_RIGHT = 8
const PADDING_Y_TOP = 8
const PADDING_Y_BOTTOM = 22

/**
 * Side-by-side histogram of total stay time split into two cohorts:
 * customers who met at least one cat, versus those who didn't. The
 * whole point of Section 4 is that cat visits inflate stay time, but
 * the single KPI `avgCatVisitsPerCustomer = 1.03` doesn't make that
 * cause-and-effect obvious. This chart does: you can see the two
 * distributions side-by-side and the gap between their means.
 *
 * When every customer was visited (rare, but possible with lots of
 * cats and low arrival rate) or nobody was visited, only one cohort
 * is shown and the comparison header falls back to a single-line
 * explainer.
 */
export default function StayDistribution({ customers }: Props) {
  const { t } = useTranslation(['results', 'common'])
  const minUnit = t('common:unit.min')

  const { withCat, withoutCat, delta } = useMemo(() => {
    const served = customers.filter((c) => c.totalStay !== null)
    const withCatRaw = served
      .filter((c) => c.catVisits > 0)
      .map((c) => c.totalStay)
    const withoutCatRaw = served
      .filter((c) => c.catVisits === 0)
      .map((c) => c.totalStay)
    const w = binValues(withCatRaw, 10)
    const wo = binValues(withoutCatRaw, 10)
    const d = w.total > 0 && wo.total > 0 ? w.mean - wo.mean : 0
    return { withCat: w, withoutCat: wo, delta: d }
  }, [customers])

  const bothCohorts = withCat.total > 0 && withoutCat.total > 0
  const anyCohort = withCat.total > 0 || withoutCat.total > 0

  if (!anyCohort) {
    return (
      <div className="rounded-xl border border-orange-100 dark:border-bark-600 bg-orange-50/40 dark:bg-bark-700/30 p-3">
        <div className="text-xs font-semibold text-orange-700 dark:text-orange-400 mb-2">
          {t('results:stayDist.title')}
        </div>
        <div className="text-[11px] text-gray-400 dark:text-bark-400 text-center py-4">
          {t('results:stayDist.empty')}
        </div>
      </div>
    )
  }

  // Single unified x-axis across both cohorts so their shapes are
  // directly comparable.
  const combinedMin = Math.min(
    withCat.total > 0 ? withCat.min : Infinity,
    withoutCat.total > 0 ? withoutCat.min : Infinity,
  )
  const combinedMax = Math.max(
    withCat.total > 0 ? withCat.max : -Infinity,
    withoutCat.total > 0 ? withoutCat.max : -Infinity,
  )
  const range = Math.max(0.001, combinedMax - combinedMin)

  const plotLeft = LABEL_COL_W
  const plotRight = CHART_W - PADDING_X_RIGHT
  const innerW = plotRight - plotLeft
  const innerH = CHART_H - PADDING_Y_TOP - PADDING_Y_BOTTOM

  function xForValue(v: number): number {
    return plotLeft + ((v - combinedMin) / range) * innerW
  }

  function renderCohortBars(
    hg: typeof withCat,
    color: string,
    yBaseline: number,
    rowH: number,
  ) {
    if (hg.total === 0) return null
    let maxCount = 0
    for (const c of hg.counts) if (c > maxCount) maxCount = c
    maxCount = Math.max(1, maxCount)
    const barW = innerW / hg.binCount
    return hg.counts.map((count, i) => {
      if (count === 0) return null
      const h = (count / maxCount) * rowH
      const x = xForValue(hg.edges[i])
      const nextX = xForValue(hg.edges[i + 1])
      const w = Math.max(1, nextX - x - 1)
      return (
        <rect
          key={i}
          x={x + 0.5}
          y={yBaseline - h}
          width={w}
          height={h}
          fill={color}
          opacity={0.8}
          rx={0.5}
        >
          <title>
            {t('results:stayDist.tooltip', {
              from: hg.edges[i].toFixed(1),
              to: hg.edges[i + 1].toFixed(1),
              count,
              unit: minUnit,
            })}
          </title>
        </rect>
      )
    })
  }

  const rowHeight = innerH / 2
  const topBaseline = PADDING_Y_TOP + rowHeight
  const bottomBaseline = PADDING_Y_TOP + innerH

  const withCatMeanX = withCat.total > 0 ? xForValue(withCat.mean) : null
  const withoutCatMeanX =
    withoutCat.total > 0 ? xForValue(withoutCat.mean) : null

  return (
    <div className="rounded-xl border border-orange-100 dark:border-bark-600 bg-orange-50/40 dark:bg-bark-700/30 p-3">
      <div className="text-xs font-semibold text-orange-700 dark:text-orange-400 mb-2">
        {t('results:stayDist.title')}
      </div>

      <svg
        width="100%"
        viewBox={`0 0 ${CHART_W} ${CHART_H}`}
        preserveAspectRatio="none"
        className="block"
      >
        {/* Plot area backdrop — only covers the bar area, leaving the
            left label column on the card background so labels stay
            clearly readable. */}
        <rect
          x={plotLeft}
          y={PADDING_Y_TOP}
          width={innerW}
          height={innerH}
          className="fill-[#fff7ed] dark:fill-bark-800"
          rx={4}
        />
        {/* Cohort row separator */}
        <line
          x1={plotLeft}
          y1={topBaseline}
          x2={plotRight}
          y2={topBaseline}
          className="stroke-[#fed7aa] dark:stroke-bark-600"
          strokeWidth={0.6}
        />

        {/* Left label column: row titles aligned with each row's vertical middle. */}
        <text
          x={LABEL_COL_W - 6}
          y={PADDING_Y_TOP + rowHeight / 2 + 3}
          fontSize={9}
          fill="#ec4899"
          fontWeight={700}
          textAnchor="end"
        >
          {t('results:stayDist.withCat')}
        </text>
        <text
          x={LABEL_COL_W - 6}
          y={topBaseline + rowHeight / 2 + 3}
          fontSize={9}
          fill="#0284c7"
          fontWeight={700}
          textAnchor="end"
        >
          {t('results:stayDist.withoutCat')}
        </text>

        {/* Top row: with cat (pink) */}
        {renderCohortBars(withCat, '#ec4899', topBaseline, rowHeight - 2)}
        {withCatMeanX !== null && (
          <line
            x1={withCatMeanX}
            y1={PADDING_Y_TOP + 1}
            x2={withCatMeanX}
            y2={topBaseline}
            stroke="#be185d"
            strokeDasharray="2 2"
            strokeWidth={1}
          />
        )}

        {/* Bottom row: without cat (blue) */}
        {renderCohortBars(
          withoutCat,
          '#38bdf8',
          bottomBaseline,
          rowHeight - 2,
        )}
        {withoutCatMeanX !== null && (
          <line
            x1={withoutCatMeanX}
            y1={topBaseline + 1}
            x2={withoutCatMeanX}
            y2={bottomBaseline}
            stroke="#0284c7"
            strokeDasharray="2 2"
            strokeWidth={1}
          />
        )}

        {/* Axis labels: min and max of combined range */}
        <text
          x={plotLeft}
          y={CHART_H - 2}
          fontSize={7}
          className="fill-gray-400 dark:fill-bark-300"
        >
          {combinedMin.toFixed(1)} {minUnit}
        </text>
        <text
          x={plotRight}
          y={CHART_H - 2}
          fontSize={7}
          className="fill-gray-400 dark:fill-bark-300"
          textAnchor="end"
        >
          {combinedMax.toFixed(1)} {minUnit}
        </text>
      </svg>

      <div className="mt-1 text-[11px] text-gray-600 dark:text-bark-300 leading-snug">
        {bothCohorts
          ? t('results:stayDist.deltaBoth', {
              withCat: withCat.mean.toFixed(1),
              withoutCat: withoutCat.mean.toFixed(1),
              delta: delta.toFixed(1),
            })
          : withCat.total > 0
          ? t('results:stayDist.onlyWithCat', {
              avg: withCat.mean.toFixed(1),
            })
          : t('results:stayDist.onlyWithoutCat', {
              avg: withoutCat.mean.toFixed(1),
            })}
      </div>
    </div>
  )
}
