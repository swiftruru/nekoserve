import { useMemo, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { computeKde } from '../../utils/kde'
import { describeDistribution, classifyShape } from '../../utils/distributionShape'
import { TermTooltip } from '../results/TermTooltip'
import type { ThresholdConfig } from '../../utils/exceedance'
import { useThresholdDrag, type ThresholdBounds } from './useThresholdDrag'

interface Props {
  /** Per-run sample values. Order matters only insofar as the LAST one
   *  is treated as the "newly arrived" sample for the flash animation. */
  values: number[]
  metricLabel: string
  /** Cumulative mean to draw as a vertical reference line. */
  cumulativeMean: number | null
  /** Optional pass/fail bar. When set, draws a vertical orange dashed
   *  line at the threshold value and shades the passing side of the
   *  distribution in faint teal so the reader sees the pass area. */
  threshold?: ThresholdConfig
  /** Pass fraction in [0, 1]. Displayed alongside the threshold label
   *  ("≥ 3.50: 67.3%"). Ignored when `threshold` is undefined. */
  exceedanceProb?: number
  /** When provided, the threshold line becomes draggable and writes the
   *  new value back through this callback. Undefined → read-only line
   *  (the existing behaviour for non-interactive contexts). */
  onThresholdChange?: (value: number) => void
  /** Clamp bounds for dragging. Only used when onThresholdChange is set. */
  thresholdBounds?: ThresholdBounds
}

/** Color used for the threshold line + label across charts. Picked so
 *  it sits on top of the bar orange without blending in. */
const THRESHOLD_STROKE = '#E05A2B'
/** Fill for the "passing" half of the distribution. Faint teal so it
 *  reads as a soft hint, not a competing chart layer. */
const THRESHOLD_PASS_FILL = 'rgba(36, 123, 123, 0.10)'

const CHART_W = 720
const CHART_H = 260
const PADDING_X = 12
const PADDING_TOP = 14
const PADDING_BOTTOM = 32
const BIN_COUNT = 20

/**
 * Live histogram + KDE overlay + percentile lines + shape diagnosis.
 *
 * Three layers stacked in a single SVG:
 *  1. Histogram bars (raw frequency in 20 bins)
 *  2. KDE smooth curve in the same x-range, height-scaled to the same
 *     visual envelope as the bars so they read as the same data
 *  3. Reference lines at P5 / P50 / P95 (dashed gray + solid black) and
 *     the cumulative mean (dashed red)
 *
 * Below the chart, a one-line "shape" verdict tells the user whether
 * the distribution looks normal, right-skewed, long-tailed, etc — the
 * Crystal Ball-style plain-language diagnosis the standalone histogram
 * couldn't deliver on its own.
 */
export default function LiveHistogram({
  values, metricLabel, cumulativeMean, threshold, exceedanceProb,
  onThresholdChange, thresholdBounds,
}: Props) {
  const { t } = useTranslation(['liveOverlay'])

  const binned = useMemo(() => {
    if (values.length === 0) return null
    let lo = Infinity
    let hi = -Infinity
    for (const v of values) {
      if (!Number.isFinite(v)) continue
      if (v < lo) lo = v
      if (v > hi) hi = v
    }
    if (!Number.isFinite(lo) || !Number.isFinite(hi)) return null
    if (lo === hi) {
      const eps = Math.max(0.01, Math.abs(lo) * 0.05)
      lo -= eps
      hi += eps
    }
    const counts = new Array<number>(BIN_COUNT).fill(0)
    const width = (hi - lo) / BIN_COUNT
    for (const v of values) {
      if (!Number.isFinite(v)) continue
      let i = Math.floor((v - lo) / width)
      if (i >= BIN_COUNT) i = BIN_COUNT - 1
      if (i < 0) i = 0
      counts[i] += 1
    }
    let maxCount = 0
    for (const c of counts) if (c > maxCount) maxCount = c
    const latest = values[values.length - 1]
    let latestBinIdx = -1
    if (Number.isFinite(latest)) {
      const idx = Math.floor((latest - lo) / width)
      latestBinIdx = Math.max(0, Math.min(BIN_COUNT - 1, idx))
    }
    return { lo, hi, counts, maxCount: Math.max(1, maxCount), width, latestBinIdx }
  }, [values])

  const descriptor = useMemo(() => describeDistribution(values), [values])
  const shape = useMemo(() => classifyShape(descriptor), [descriptor])

  // KDE in the same x-domain. We compute it independently of the
  // histogram so the curve sees the actual range (with bandwidth
  // padding) rather than the bin edges.
  const kde = useMemo(() => computeKde(values), [values])

  // Hover tooltip: track which bin the cursor is over and the data
  // value at that x. KDE density is sampled by linear interpolation
  // on the (xs, ys) arrays. Declared above the empty-state early
  // return so hook order stays stable across renders (rules of hooks).
  const svgRef = useRef<SVGSVGElement | null>(null)
  const [hoverBinIdx, setHoverBinIdx] = useState<number | null>(null)

  // Threshold drag. Computed here (before the early return) so the hook
  // runs unconditionally; pxToValue inverts the same x-scale the line is
  // drawn with, using the histogram's data domain.
  const innerWForDrag = CHART_W - PADDING_X * 2
  const domainLo = binned?.lo ?? 0
  const domainHi = binned?.hi ?? 1
  const pxToValue = (userX: number) =>
    domainLo + ((userX - PADDING_X) / Math.max(1e-9, innerWForDrag)) * (domainHi - domainLo)
  const { dragging, handlers } = useThresholdDrag({
    svgRef,
    chartWidth: CHART_W,
    pxToValue,
    bounds: thresholdBounds ?? {},
    onChange: onThresholdChange ?? (() => {}),
    enabled: !!onThresholdChange && !!threshold,
  })

  if (!binned) {
    return (
      <div className="rounded-xl border border-orange-100 dark:border-bark-600 bg-orange-50/40 dark:bg-bark-700/30 p-3" role="figure">
        <div className="text-xs font-semibold text-orange-700 dark:text-orange-400 mb-2">
          {metricLabel}
        </div>
        <div className="text-[11px] text-gray-400 dark:text-bark-400 text-center py-12">
          {t('liveOverlay:chart.empty')}
        </div>
      </div>
    )
  }

  const innerW = CHART_W - PADDING_X * 2
  const innerH = CHART_H - PADDING_TOP - PADDING_BOTTOM
  const barW = innerW / BIN_COUNT
  const { lo, hi, counts, maxCount, latestBinIdx } = binned
  const sampleCount = values.length
  function handleMouseMove(e: React.MouseEvent<SVGSVGElement>) {
    if (dragging) {
      setHoverBinIdx(null)
      return
    }
    const svg = svgRef.current
    if (!svg) return
    const rect = svg.getBoundingClientRect()
    const userX = ((e.clientX - rect.left) / rect.width) * CHART_W
    if (userX < PADDING_X || userX > CHART_W - PADDING_X) {
      setHoverBinIdx(null)
      return
    }
    const idx = Math.floor((userX - PADDING_X) / barW)
    setHoverBinIdx(Math.max(0, Math.min(BIN_COUNT - 1, idx)))
  }
  function handleMouseLeave() {
    setHoverBinIdx(null)
  }

  // x-domain shared across bars, KDE, percentile lines.
  const xDomainLo = lo
  const xDomainHi = hi
  const xScale = (v: number) =>
    PADDING_X + ((v - xDomainLo) / Math.max(1e-9, xDomainHi - xDomainLo)) * innerW

  // Build KDE polyline points if we have one. Height is normalised so
  // its peak matches the visual top of the tallest bar — the reader
  // sees them as the same scale even though one is density and the
  // other is count.
  let kdePoints: string | null = null
  let kdeBandPoints: string | null = null
  if (kde && kde.ys.length > 0) {
    let kdeMax = 0
    for (const y of kde.ys) if (y > kdeMax) kdeMax = y
    if (kdeMax > 0) {
      const top: string[] = []
      const bottom: string[] = []
      for (let i = 0; i < kde.xs.length; i++) {
        const x = xScale(kde.xs[i]).toFixed(2)
        // Clamp so the curve doesn't poke below the baseline visually.
        const yScaled = (kde.ys[i] / kdeMax) * innerH
        const y = (CHART_H - PADDING_BOTTOM - yScaled).toFixed(2)
        const yBase = (CHART_H - PADDING_BOTTOM).toFixed(2)
        top.push(`${x},${y}`)
        bottom.push(`${x},${yBase}`)
      }
      kdePoints = top.join(' ')
      kdeBandPoints = [...top, ...bottom.reverse()].join(' ')
    }
  }

  const meanX =
    cumulativeMean !== null && Number.isFinite(cumulativeMean)
      ? xScale(cumulativeMean)
      : null

  // Percentile lines only have meaning at n >= 8; below that we'd be
  // pointing at noise.
  const showPercentiles = descriptor.n >= 8
  const p5X = showPercentiles ? xScale(descriptor.p5) : null
  const p50X = showPercentiles ? xScale(descriptor.p50) : null
  const p95X = showPercentiles ? xScale(descriptor.p95) : null

  const shapeLabelText = t(`liveOverlay:shape.${shape.label}`, { defaultValue: '' })
  const centralRangeText = showPercentiles
    ? t('liveOverlay:shape.centralRange', {
        lo: descriptor.p5.toFixed(2),
        hi: descriptor.p95.toFixed(2),
      })
    : null

  return (
    <div className="rounded-xl border border-orange-100 dark:border-bark-600 bg-orange-50/40 dark:bg-bark-700/30 p-3" role="figure" aria-label={metricLabel} data-testid="live-histogram">
      <div className="flex items-baseline justify-between mb-2 flex-wrap gap-2">
        <span className="text-xs font-semibold text-orange-700 dark:text-orange-400">
          {t('liveOverlay:histogram.title', { metric: metricLabel })}
        </span>
        <div className="flex items-baseline gap-3">
          {centralRangeText && (
            <span className="text-[10px] text-gray-500 dark:text-bark-300 tabular-nums">
              {centralRangeText}
            </span>
          )}
          <span className="text-[10px] text-gray-500 dark:text-bark-300 tabular-nums">
            <TermTooltip termKey="lowerN">
              {t('liveOverlay:histogram.totalCount', { n: values.length })}
            </TermTooltip>
          </span>
        </div>
      </div>

      <svg
        ref={svgRef}
        width="100%"
        viewBox={`0 0 ${CHART_W} ${CHART_H}`}
        preserveAspectRatio="none"
        className="block"
        role="img"
        onMouseMove={handleMouseMove}
        onMouseLeave={handleMouseLeave}
      >
        <rect x={0} y={0} width={CHART_W} height={CHART_H} className="fill-[#fff7ed] dark:fill-bark-800" rx={6} />

        {/* Baseline */}
        <line
          x1={PADDING_X} y1={CHART_H - PADDING_BOTTOM}
          x2={CHART_W - PADDING_X} y2={CHART_H - PADDING_BOTTOM}
          className="stroke-[#fed7aa] dark:stroke-bark-600"
          strokeWidth={0.8}
        />

        {/* Threshold "passing side" shading -- rendered before bars so
            the bars sit on top and the shade reads as a backdrop hint.
            Clamped to the chart's x-domain: if the bar is off-screen,
            the entire chart fills (whole distribution passes) or stays
            empty (none pass). */}
        {threshold && (() => {
          const tx = xScale(threshold.value)
          const clampedTx = Math.max(PADDING_X, Math.min(CHART_W - PADDING_X, tx))
          const passLeft = threshold.direction === 'gte' ? clampedTx : PADDING_X
          const passRight = threshold.direction === 'gte' ? CHART_W - PADDING_X : clampedTx
          const passW = Math.max(0, passRight - passLeft)
          if (passW <= 0) return null
          return (
            <rect
              x={passLeft}
              y={PADDING_TOP}
              width={passW}
              height={CHART_H - PADDING_TOP - PADDING_BOTTOM}
              fill={THRESHOLD_PASS_FILL}
              pointerEvents="none"
            />
          )
        })()}

        {/* Histogram bars */}
        {counts.map((c, i) => {
          const h = (c / maxCount) * innerH
          const x = PADDING_X + i * barW
          const y = CHART_H - PADDING_BOTTOM - h
          const isFlashing = i === latestBinIdx
          return (
            <rect
              key={isFlashing ? `${i}-${sampleCount}` : i}
              x={x + 1}
              y={y}
              width={Math.max(1, barW - 2)}
              height={h}
              fill="#fb923c"
              rx={1}
              className={isFlashing ? 'live-bin-flash live-bin-pop' : undefined}
              style={{ transition: 'y 280ms ease-out, height 280ms ease-out' }}
            >
              <title>
                {t('liveOverlay:histogram.binTooltip', {
                  from: (lo + i * binned.width).toFixed(3),
                  to: (lo + (i + 1) * binned.width).toFixed(3),
                  count: c,
                })}
              </title>
            </rect>
          )
        })}

        {/* KDE smooth curve: light fill underneath + crisp top stroke */}
        {kdeBandPoints && (
          <polygon
            points={kdeBandPoints}
            fill="#ea580c"
            opacity={0.15}
          />
        )}
        {/* Pass-side area-under-curve emphasis: the same KDE band clipped
            to the passing region and drawn darker, so the reader sees the
            accumulated area the CDF later reads as a probability. */}
        {kdeBandPoints && threshold && (() => {
          const clampedTx = Math.max(PADDING_X, Math.min(CHART_W - PADDING_X, xScale(threshold.value)))
          const passLeft = threshold.direction === 'gte' ? clampedTx : PADDING_X
          const passRight = threshold.direction === 'gte' ? CHART_W - PADDING_X : clampedTx
          const passW = Math.max(0, passRight - passLeft)
          if (passW <= 0) return null
          return (
            <g>
              <clipPath id="kde-pass-clip">
                <rect x={passLeft} y={PADDING_TOP} width={passW} height={CHART_H - PADDING_TOP - PADDING_BOTTOM} />
              </clipPath>
              <polygon points={kdeBandPoints} fill="#ea580c" opacity={0.3} clipPath="url(#kde-pass-clip)" pointerEvents="none" />
            </g>
          )
        })()}
        {kdePoints && (
          <polyline
            points={kdePoints}
            fill="none"
            stroke="#c2410c"
            strokeWidth={1.6}
            strokeLinejoin="round"
          />
        )}

        {/* P5 / P50 / P95 reference lines (only when n >= 8). */}
        {showPercentiles && p5X !== null && (
          <g>
            <line
              x1={p5X} y1={PADDING_TOP}
              x2={p5X} y2={CHART_H - PADDING_BOTTOM}
              stroke="#94a3b8"
              strokeDasharray="2 3"
              strokeWidth={0.8}
              opacity={0.7}
            />
            <text x={p5X + 2} y={PADDING_TOP + 8} fontSize={8} fill="#64748b">
              {t('liveOverlay:shape.p5Label')}
            </text>
          </g>
        )}
        {showPercentiles && p50X !== null && (
          <g>
            <line
              x1={p50X} y1={PADDING_TOP}
              x2={p50X} y2={CHART_H - PADDING_BOTTOM}
              stroke="#1f2937"
              strokeDasharray="3 2"
              strokeWidth={1.1}
              opacity={0.85}
            />
            <text x={p50X + 2} y={PADDING_TOP + 8} fontSize={8} fill="#1f2937" fontWeight={700}>
              {t('liveOverlay:shape.p50Label')}
            </text>
          </g>
        )}
        {showPercentiles && p95X !== null && (
          <g>
            <line
              x1={p95X} y1={PADDING_TOP}
              x2={p95X} y2={CHART_H - PADDING_BOTTOM}
              stroke="#94a3b8"
              strokeDasharray="2 3"
              strokeWidth={0.8}
              opacity={0.7}
            />
            <text x={p95X + 2} y={PADDING_TOP + 8} fontSize={8} fill="#64748b">
              {t('liveOverlay:shape.p95Label')}
            </text>
          </g>
        )}

        {/* Cumulative mean reference (red, on top of percentiles so it
            stays visible). */}
        {meanX !== null && (
          <g>
            <line
              x1={meanX} y1={PADDING_TOP}
              x2={meanX} y2={CHART_H - PADDING_BOTTOM}
              stroke="#dc2626"
              strokeDasharray="3 2"
              strokeWidth={1}
            />
            <text
              x={meanX + 4}
              y={CHART_H - PADDING_BOTTOM - 4}
              fontSize={9}
              fill="#dc2626"
              fontWeight={700}
            >
              {t('liveOverlay:histogram.meanLabel', { value: cumulativeMean!.toFixed(3) })}
            </text>
          </g>
        )}

        {/* Threshold line + label. Drawn on top of mean so the pass-bar
            stays legible. Label flips to the line's left side near the
            right edge to avoid clipping. Only rendered when the bar is
            inside (or close to) the data range. */}
        {threshold && (() => {
          const rawTx = xScale(threshold.value)
          if (rawTx < PADDING_X - 4 || rawTx > CHART_W - PADDING_X + 4) return null
          const tx = Math.max(PADDING_X, Math.min(CHART_W - PADDING_X, rawTx))
          const percentText = exceedanceProb != null
            ? (exceedanceProb * 100).toFixed(1) : '—'
          const labelKey = threshold.direction === 'gte'
            ? 'liveOverlay:histogram.thresholdLabelGte'
            : 'liveOverlay:histogram.thresholdLabelLte'
          const labelText = t(labelKey, {
            value: threshold.value.toFixed(2),
            percent: percentText,
          })
          // Rough width estimate: 6.5px per char at fontSize 11.
          const estW = labelText.length * 6.5 + 6
          const labelOnLeft = tx + estW > CHART_W - PADDING_X
          return (
            <g>
              <g pointerEvents="none">
                <line
                  x1={tx} y1={PADDING_TOP}
                  x2={tx} y2={CHART_H - PADDING_BOTTOM}
                  stroke={THRESHOLD_STROKE}
                  strokeDasharray="4 3"
                  strokeWidth={1.5}
                />
                <text
                  x={labelOnLeft ? tx - 4 : tx + 4}
                  y={PADDING_TOP + 11}
                  fontSize={11}
                  fontWeight={700}
                  fill={THRESHOLD_STROKE}
                  textAnchor={labelOnLeft ? 'end' : 'start'}
                >
                  {labelText}
                </text>
              </g>
              {/* Draggable hit-area: widened transparent strip + grip. */}
              {onThresholdChange && (
                <g
                  onPointerDown={handlers.onPointerDown}
                  onPointerMove={handlers.onPointerMove}
                  onPointerUp={handlers.onPointerUp}
                  style={{ cursor: 'ew-resize' }}
                >
                  <rect
                    x={tx - 7}
                    y={PADDING_TOP}
                    width={14}
                    height={CHART_H - PADDING_TOP - PADDING_BOTTOM}
                    fill="transparent"
                  />
                  <rect x={tx - 4} y={CHART_H - PADDING_BOTTOM - 9} width={8} height={9} rx={2} fill={THRESHOLD_STROKE} data-testid="hist-threshold-grip" />
                </g>
              )}
            </g>
          )
        })()}

        {/* X-axis ticks */}
        <text x={PADDING_X} y={CHART_H - 12} fontSize={9} className="fill-gray-500 dark:fill-bark-300">
          {lo.toFixed(2)}
        </text>
        <text x={CHART_W - PADDING_X} y={CHART_H - 12} fontSize={9} textAnchor="end" className="fill-gray-500 dark:fill-bark-300">
          {hi.toFixed(2)}
        </text>

        {/* Hover overlay: vertical guide on the bin under the cursor +
            tooltip card with bin range, count, and KDE density. */}
        {hoverBinIdx !== null && (() => {
          const binStart = lo + hoverBinIdx * binned.width
          const binEnd = lo + (hoverBinIdx + 1) * binned.width
          const binMid = (binStart + binEnd) / 2
          const count = counts[hoverBinIdx]
          // KDE density at bin midpoint via linear interpolation.
          let density: number | null = null
          if (kde && kde.xs.length > 1) {
            const dx = kde.xs[1] - kde.xs[0]
            const fIdx = (binMid - kde.xs[0]) / dx
            const i0 = Math.max(0, Math.min(kde.xs.length - 1, Math.floor(fIdx)))
            const i1 = Math.min(kde.xs.length - 1, i0 + 1)
            const f = fIdx - i0
            density = kde.ys[i0] * (1 - f) + kde.ys[i1] * f
          }
          const guideX = PADDING_X + (hoverBinIdx + 0.5) * barW
          // Tooltip 144x66, flip side near right edge.
          const TT_W = 148
          const TT_H = 64
          const wantRight = guideX + 12 + TT_W <= CHART_W - PADDING_X
          const tx = wantRight ? guideX + 10 : guideX - 10 - TT_W
          const ty = PADDING_TOP + 4
          return (
            <g pointerEvents="none">
              <line
                x1={guideX} y1={PADDING_TOP}
                x2={guideX} y2={CHART_H - PADDING_BOTTOM}
                stroke="#7c2d12"
                strokeDasharray="2 2"
                strokeWidth={0.8}
                opacity={0.6}
              />
              <rect
                x={tx} y={ty}
                width={TT_W} height={TT_H}
                fill="#fff7ed"
                stroke="#ea580c"
                strokeWidth={1}
                rx={4}
                opacity={0.97}
              />
              <text x={tx + 8} y={ty + 14} fontSize={10} fontWeight={700} fill="#7c2d12">
                [{binStart.toFixed(3)}, {binEnd.toFixed(3)})
              </text>
              <text x={tx + 8} y={ty + 28} fontSize={10} fill="#1f2937">
                {t('liveOverlay:histogram.tooltipCount', { defaultValue: '次數', count })}: {count}
              </text>
              {density !== null && (
                <text x={tx + 8} y={ty + 42} fontSize={10} fill="#1f2937">
                  {t('liveOverlay:histogram.tooltipDensity', { defaultValue: '密度' })}: {density.toFixed(3)}
                </text>
              )}
              <text x={tx + 8} y={ty + 56} fontSize={9} fill="#64748b">
                n = {sampleCount}
              </text>
            </g>
          )
        })()}
      </svg>

      <div className="mt-2 flex flex-wrap items-baseline justify-between gap-2">
        <div className="text-[13px] text-gray-700 dark:text-bark-200 leading-relaxed">
          {t('liveOverlay:histogram.hint')}
        </div>
        {shapeLabelText && (
          <div className="text-[13px] font-semibold text-orange-700 dark:text-orange-400">
            {t('liveOverlay:shape.label')}:&nbsp;{shapeLabelText}
          </div>
        )}
      </div>
      <details className="mt-2 group">
        <summary className="cursor-pointer text-[13px] font-semibold text-orange-700 dark:text-orange-400 hover:underline select-none">
          {t('liveOverlay:histogram.help.summary')}
        </summary>
        <div className="mt-3 px-3 py-3 rounded-lg bg-orange-50/80 dark:bg-bark-700/40 border border-orange-100 dark:border-bark-600 text-[13px] text-gray-800 dark:text-bark-100 leading-relaxed space-y-3">
          <section>
            <div className="font-semibold mb-1">{t('liveOverlay:histogram.help.axesTitle')}</div>
            <ul className="list-disc list-inside space-y-1">
              <li>{t('liveOverlay:histogram.help.xAxis')}</li>
              <li>{t('liveOverlay:histogram.help.yAxis')}</li>
            </ul>
          </section>
          <section>
            <div className="font-semibold mb-1">{t('liveOverlay:histogram.help.elementsTitle')}</div>
            <ul className="list-disc list-inside space-y-1">
              <li>{t('liveOverlay:histogram.help.elementBars')}</li>
              <li>{t('liveOverlay:histogram.help.elementKde')}</li>
              <li>{t('liveOverlay:histogram.help.elementMedian')}</li>
              <li>{t('liveOverlay:histogram.help.elementP5P95')}</li>
              <li>{t('liveOverlay:histogram.help.elementMeanRed')}</li>
              <li>{t('liveOverlay:histogram.help.elementThreshold')}</li>
              <li>{t('liveOverlay:histogram.help.elementShape')}</li>
            </ul>
          </section>
          <section>
            <div className="font-semibold mb-1">{t('liveOverlay:histogram.help.howToReadTitle')}</div>
            <ul className="list-disc list-inside space-y-1">
              <li>{t('liveOverlay:histogram.help.howRead1')}</li>
              <li>{t('liveOverlay:histogram.help.howRead2')}</li>
              <li>{t('liveOverlay:histogram.help.howRead3')}</li>
              <li>{t('liveOverlay:histogram.help.howRead4')}</li>
              <li>{t('liveOverlay:histogram.help.howRead5')}</li>
              <li>{t('liveOverlay:histogram.help.howRead6')}</li>
            </ul>
          </section>
          <section>
            <div className="font-semibold mb-1">{t('liveOverlay:histogram.help.notationTitle')}</div>
            <ul className="list-disc list-inside space-y-1">
              <li dangerouslySetInnerHTML={{ __html: renderInlineBold(t('liveOverlay:histogram.help.notationN')) }} />
              <li dangerouslySetInnerHTML={{ __html: renderInlineBold(t('liveOverlay:histogram.help.notationLowerN')) }} />
              <li>{t('liveOverlay:histogram.help.notationWhyDifferent')}</li>
            </ul>
          </section>
        </div>
      </details>
    </div>
  )
}

function renderInlineBold(s: string): string {
  return s.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
}
